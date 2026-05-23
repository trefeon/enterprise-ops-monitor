#!/usr/bin/env bash
set -Eeuo pipefail

RESET="\033[0m"
BOLD="\033[1m"
RED="\033[31m"
GREEN="\033[32m"
YELLOW="\033[33m"
CYAN="\033[36m"

EXPECTED_ORIGIN="https://github.com/trefeon/enterprise-ops-monitor.git"
DEFAULT_REMOTE_DIR="/home/trefeon/dev-portfolio/enterprise-ops-monitor"
DEFAULT_REF="master"

host=""
remote_dir="$DEFAULT_REMOTE_DIR"
mode=""
deploy_ref="$DEFAULT_REF"
strategy="git"
dry_run=0
preserve_remote_env=1
bootstrap=0
ssh_key=""
ssh_port="22"
target_sha=""
previous_sha=""
lock_name=""

usage() {
  cat <<'EOF'
Usage: bash scripts/deploy-ops.sh --host <ssh-target> --mode <demo-db|prod> [options]

Options:
  --host <target>             SSH target, for example acerblue
  --dir <path>                Remote repo path
  --mode <demo-db|prod>       Deployment target stack
  --ref <branch|sha>          Origin branch or commit SHA to deploy (default: master)
  --strategy <git|rsync>      Git deploy by default; rsync is explicit fallback only
  --dry-run                   Run checks only; no checkout, upload, restart, or volume change
  --preserve-remote-env       Preserve remote .env (default; accepted for explicitness)
  --bootstrap                 Allow rsync strategy to clone missing remote repo first
  --key <file>                SSH private key
  --port <port>               SSH port (default: 22)
  -h, --help                  Show this help
EOF
}

info() {
  echo -e "${CYAN}$*${RESET}"
}

ok() {
  echo -e "${GREEN}[ok]${RESET} $*"
}

warn() {
  echo -e "${YELLOW}[warn]${RESET} $*" >&2
}

die() {
  echo -e "${RED}[err]${RESET} $*" >&2
  exit 1
}

step() {
  echo -e "\n${BOLD}$*${RESET}"
}

check_dep() {
  command -v "$1" >/dev/null 2>&1 || die "missing local dependency: $1"
}

shell_quote() {
  printf "%q" "$1"
}

parse_args() {
  while [ $# -gt 0 ]; do
    case "$1" in
      --host)
        host="${2:-}"
        shift 2
        ;;
      --dir)
        remote_dir="${2:-}"
        shift 2
        ;;
      --mode)
        mode="${2:-}"
        shift 2
        ;;
      --ref)
        deploy_ref="${2:-}"
        shift 2
        ;;
      --strategy)
        strategy="${2:-}"
        shift 2
        ;;
      --dry-run)
        dry_run=1
        shift
        ;;
      --preserve-remote-env)
        preserve_remote_env=1
        shift
        ;;
      --bootstrap)
        bootstrap=1
        shift
        ;;
      --key|-i)
        ssh_key="${2:-}"
        shift 2
        ;;
      --port|-p)
        ssh_port="${2:-}"
        shift 2
        ;;
      -h|--help)
        usage
        exit 0
        ;;
      *)
        die "unknown option: $1"
        ;;
    esac
  done
}

validate_args() {
  [ -n "$host" ] || die "--host is required"
  [ -n "$remote_dir" ] || die "--dir is required"
  [ "$mode" = "demo-db" ] || [ "$mode" = "prod" ] || die "--mode must be demo-db or prod"
  [ "$strategy" = "git" ] || [ "$strategy" = "rsync" ] || die "--strategy must be git or rsync"
  [ "$preserve_remote_env" -eq 1 ] || die "remote .env upload is not supported; preserve remote env"
  [ "$strategy" = "rsync" ] || [ "$bootstrap" -eq 0 ] || die "--bootstrap is only valid with --strategy rsync"
  if [ -n "$ssh_key" ] && [ ! -f "$ssh_key" ]; then
    die "SSH key not found: $ssh_key"
  fi
}

build_ssh_opts() {
  ssh_opts=(-p "$ssh_port" -o ConnectTimeout=10)
  if [ -n "$ssh_key" ]; then
    ssh_opts+=(-i "$ssh_key")
  fi
}

run_remote() {
  ssh "${ssh_opts[@]}" "$host" "$@"
}

remote_bash() {
  ssh "${ssh_opts[@]}" "$host" "bash -s -- $*"
}

require_clean_local_worktree() {
  local dirty
  dirty=$(git status --short)
  if [ -n "$dirty" ]; then
    echo "$dirty" >&2
    die "local worktree is dirty; commit/stash before deploy"
  fi
}

resolve_target_sha() {
  local ref="$1"
  local branch_ref="$ref"

  git fetch --prune origin

  if [[ "$branch_ref" == origin/* ]]; then
    branch_ref="${branch_ref#origin/}"
  fi

  if git show-ref --verify --quiet "refs/remotes/origin/$branch_ref"; then
    git rev-parse "refs/remotes/origin/$branch_ref^{commit}"
    return
  fi

  if [[ "$ref" =~ ^[0-9a-fA-F]{7,40}$ ]] && git cat-file -e "$ref^{commit}" 2>/dev/null; then
    git rev-parse "$ref^{commit}"
    return
  fi

  die "cannot resolve --ref '$ref' from origin branch or local commit object"
}

require_sha_on_origin() {
  local sha="$1"
  if ! git branch -r --contains "$sha" | grep -Eq '^[[:space:]]*origin/'; then
    die "target SHA $sha is not reachable from any origin branch; push it first"
  fi
}

run_local_preflight() {
  step "[1/6] Local preflight"
  check_dep git
  check_dep ssh
  check_dep pnpm
  if [ "$strategy" = "rsync" ]; then
    check_dep rsync
  fi

  local origin_url
  origin_url=$(git remote get-url origin)
  [ "$origin_url" = "$EXPECTED_ORIGIN" ] || die "local origin mismatch: $origin_url"

  require_clean_local_worktree

  info "Running pnpm check:all before deploy..."
  pnpm check:all

  target_sha=$(resolve_target_sha "$deploy_ref")
  require_sha_on_origin "$target_sha"

  if [ "$strategy" = "rsync" ]; then
    local local_head
    local_head=$(git rev-parse HEAD)
    [ "$local_head" = "$target_sha" ] || die "rsync strategy requires local HEAD to equal target SHA $target_sha"
  fi

  ok "target ref $deploy_ref => $target_sha"
}

acquire_remote_lock() {
  step "[2/6] Remote lock"
  lock_name="/tmp/eom-deploy-${mode}.lock"
  if ! run_remote "mkdir $(shell_quote "$lock_name") 2>/dev/null"; then
    die "another deploy is running or stale lock exists: $lock_name"
  fi
  ok "acquired $lock_name"
}

release_remote_lock() {
  if [ -n "$lock_name" ]; then
    run_remote "rmdir $(shell_quote "$lock_name") 2>/dev/null || true" >/dev/null 2>&1 || true
  fi
}

remote_preflight() {
  step "[3/6] Remote preflight"
  remote_bash \
    "$(shell_quote "$remote_dir")" \
    "$(shell_quote "$EXPECTED_ORIGIN")" \
    "$(shell_quote "$target_sha")" \
    "$(shell_quote "$mode")" \
    "$(shell_quote "$strategy")" \
    "$(shell_quote "$bootstrap")" <<'REMOTE'
set -Eeuo pipefail
remote_dir="$1"
expected_origin="$2"
target_sha="$3"
mode="$4"
strategy="$5"
bootstrap="$6"

fail() {
  echo "[err] $*" >&2
  exit 1
}

for dep in git docker curl node; do
  command -v "$dep" >/dev/null 2>&1 || fail "missing remote dependency: $dep"
done
docker compose version >/dev/null 2>&1 || fail "remote docker compose is unavailable"
command -v grep >/dev/null 2>&1 || fail "missing remote dependency: grep"

if [ ! -d "$remote_dir/.git" ]; then
  if [ "$strategy" = "rsync" ] && [ "$bootstrap" = "1" ] && [ ! -e "$remote_dir" ]; then
    mkdir -p "$(dirname "$remote_dir")"
    git clone "$expected_origin" "$remote_dir"
  else
    fail "remote repo missing: $remote_dir"
  fi
fi

cd "$remote_dir"

origin_url=$(git remote get-url origin)
[ "$origin_url" = "$expected_origin" ] || fail "remote origin mismatch: $origin_url"

dirty=$(git status --short)
if [ -n "$dirty" ]; then
  echo "$dirty" >&2
  fail "remote worktree is dirty; clean remote edits before deploy"
fi

if [ ! -f .env ]; then
  fail "remote .env is missing"
fi
grep -q '^DB_PASS=.' .env || fail "remote .env missing DB_PASS"
grep -q '^JWT_SECRET=.' .env || fail "remote .env missing JWT_SECRET"

git fetch --prune origin
git cat-file -e "$target_sha^{commit}" 2>/dev/null || fail "target SHA not present on remote after fetch"

compose_file="docker-compose.yml"
if [ "$mode" = "demo-db" ]; then
  compose_file="docker-compose.demo-db.yml"
fi
[ -f "$compose_file" ] || fail "missing $compose_file"
docker compose -f "$compose_file" config -q

echo "[ok] remote preflight passed: $(git rev-parse --short HEAD) -> ${target_sha:0:12}"
REMOTE
}

checkout_remote_target() {
  step "[4/6] Checkout target"
  previous_sha=$(run_remote "cd $(shell_quote "$remote_dir") && git rev-parse HEAD")
  run_remote "cd $(shell_quote "$remote_dir") && git checkout --detach $(shell_quote "$target_sha")"
  ok "remote checkout: $previous_sha -> $target_sha"
}

rsync_release() {
  [ "$strategy" = "rsync" ] || return 0
  step "[5/6] Rsync fallback repair"

  local rsync_ssh
  rsync_ssh="ssh -p $ssh_port -o ConnectTimeout=10"
  if [ -n "$ssh_key" ]; then
    rsync_ssh="$rsync_ssh -i $ssh_key"
  fi

  rsync -az --delete \
    -e "$rsync_ssh" \
    --exclude='.git' \
    --exclude='.env' \
    --exclude='.env.local' \
    --exclude='.env.development' \
    --exclude='.env.production' \
    --exclude='.env.test' \
    --exclude='node_modules' \
    --exclude='apps/web/dist' \
    --exclude='playwright/.auth' \
    --exclude='playwright-report' \
    --exclude='test-results' \
    --exclude='.lean-ctx' \
    --exclude='.serena' \
    --exclude='backups/*' \
    --exclude='agent_updates/*' \
    --exclude='release-*.tar.gz' \
    ./ "$host:$remote_dir/"

  ok "rsync repair completed"
}

run_remote_stack() {
  local rollback_sha="${1:-}"
  remote_bash \
    "$(shell_quote "$remote_dir")" \
    "$(shell_quote "$mode")" \
    "$(shell_quote "$rollback_sha")" <<'REMOTE'
set -Eeuo pipefail
remote_dir="$1"
mode="$2"
rollback_sha="$3"

cd "$remote_dir"

wait_for_container() {
  local name="$1"
  local attempts="${2:-60}"
  local sleep_seconds="${3:-5}"
  local status=""
  local health=""

  for _ in $(seq 1 "$attempts"); do
    status=$(docker inspect --format='{{.State.Status}}' "$name" 2>/dev/null || true)
    health=$(docker inspect --format='{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$name" 2>/dev/null || true)

    if [ "$status" = "running" ] && { [ "$health" = "healthy" ] || [ "$health" = "none" ]; }; then
      echo "[ok] $name is $status/$health"
      return 0
    fi

    echo "[wait] $name is ${status:-missing}/${health:-unknown}"
    sleep "$sleep_seconds"
  done

  echo "[err] $name did not become healthy" >&2
  return 1
}

deploy_stack() {
  if [ "$mode" = "demo-db" ]; then
    docker compose -f docker-compose.demo-db.yml config -q
    if [ -f docker-compose.yml ]; then
      docker compose -f docker-compose.yml down --remove-orphans >/dev/null 2>&1 || true
    fi
    docker volume inspect eom_postgres_demo_data >/dev/null 2>&1 || docker volume create eom_postgres_demo_data >/dev/null
    docker compose -f docker-compose.demo-db.yml up -d --build --remove-orphans
    wait_for_container eom-demo-db
    wait_for_container eom-demo-api
    wait_for_container eom-mock-api
    wait_for_container eom-web-demo
    node scripts/deploy-check.js --demo
    return
  fi

  docker compose -f docker-compose.yml config -q
  if [ -f docker-compose.demo-db.yml ]; then
    docker compose -f docker-compose.demo-db.yml down --remove-orphans >/dev/null 2>&1 || true
  fi
  if [ -f docker-compose.demo.yml ]; then
    docker compose -f docker-compose.demo.yml down --remove-orphans >/dev/null 2>&1 || true
  fi
  docker volume inspect eom_postgres_data >/dev/null 2>&1 || docker volume create eom_postgres_data >/dev/null
  docker compose -f docker-compose.yml up -d --build --remove-orphans
  wait_for_container eom-db
  wait_for_container eom-api
  wait_for_container eom-web
  node scripts/deploy-check.js
}

if deploy_stack; then
  echo "[ok] deploy health passed at $(git rev-parse --short HEAD)"
  exit 0
fi

if [ -n "$rollback_sha" ]; then
  echo "[warn] deploy failed; rolling back to ${rollback_sha:0:12}" >&2
  git checkout --detach "$rollback_sha"
  if deploy_stack; then
    echo "[ok] rollback health passed at $(git rev-parse --short HEAD)" >&2
  else
    echo "[err] rollback failed; manual intervention required" >&2
  fi
fi

exit 1
REMOTE
}

deploy_remote() {
  step "[6/6] Deploy stack"
  if ! run_remote_stack "$previous_sha"; then
    die "deploy failed; rollback attempted"
  fi
}

main() {
  parse_args "$@"
  validate_args
  build_ssh_opts

  echo -e "${BOLD}${CYAN}Enterprise Ops Monitor Git Deploy${RESET}"
  echo "host=$host"
  echo "dir=$remote_dir"
  echo "mode=$mode"
  echo "ref=$deploy_ref"
  echo "strategy=$strategy"
  echo "dry_run=$dry_run"

  run_local_preflight
  acquire_remote_lock
  trap release_remote_lock EXIT
  remote_preflight

  if [ "$dry_run" -eq 1 ]; then
    ok "dry run passed; no checkout, upload, restart, or volume change performed"
    exit 0
  fi

  checkout_remote_target
  rsync_release
  deploy_remote

  ok "deploy completed: $mode at $target_sha"
}

main "$@"
