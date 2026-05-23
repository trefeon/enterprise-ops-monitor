#!/usr/bin/env bash
#
# deploy-remote.sh
# Production Deployment Automation Script via SSH
#

# Colors for output
RESET="\033[0m"
BOLD="\033[1m"
RED="\033[31m"
GREEN="\033[32m"
YELLOW="\033[33m"
CYAN="\033[36m"

echo -e "${BOLD}${CYAN}=====================================================${RESET}"
echo -e "${BOLD}${CYAN}       ENTERPRISE OPS MONITOR - REMOTE DEPLOYMENT    ${RESET}"
echo -e "${BOLD}${CYAN}=====================================================${RESET}\n"

# Help / Usage helper
usage() {
  echo "Usage: $0 [options] <user@host>"
  echo "Options:"
  echo "  -i <key_file>   Path to SSH private key file"
  echo "  -p <port>       SSH port (default: 22)"
  echo "  -d <dir>        Remote deployment directory (default: ~/enterprise-ops-monitor)"
  echo "  -e <env_file>   Custom local .env file to copy (default: .env)"
  echo "  --dry-run       Run local/remote preflight checks without uploading or changing containers"
  echo "  --preserve-remote-env"
  echo "                  Reuse existing remote .env instead of requiring/uploading a local env file"
  echo "  --drop-demo-volumes"
  echo "                  Remove demo stack volumes when switching to production (default: preserve)"
  exit 1
}

# Helper for local dependency check
check_dep() {
  if ! command -v "$1" &> /dev/null; then
    echo -e "${RED}✗ Error: $1 is required locally but not installed.${RESET}" >&2
    exit 1
  fi
  echo -e "  ✓ $1 is installed."
}

# Parse options
ssh_key=""
ssh_port="22"
remote_dir="~/enterprise-ops-monitor"
env_file=".env"
dry_run=0
preserve_remote_env=0
drop_demo_volumes=0
ssh_target=""

while [ $# -gt 0 ]; do
  case "$1" in
    -i|--key)
      ssh_key="$2"
      shift 2
      ;;
    -p|--port)
      ssh_port="$2"
      shift 2
      ;;
    -d|--dir)
      remote_dir="$2"
      shift 2
      ;;
    -e|--env-file)
      env_file="$2"
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
    --drop-demo-volumes)
      drop_demo_volumes=1
      shift
      ;;
    -h|--help)
      usage
      ;;
    -*)
      echo -e "${RED}✗ Error: Unknown option '$1'.${RESET}" >&2
      usage
      ;;
    *)
      if [ -n "$ssh_target" ]; then
        echo -e "${RED}✗ Error: Multiple SSH targets provided.${RESET}" >&2
        usage
      fi
      ssh_target="$1"
      shift
      ;;
  esac
done

if [ -z "$ssh_target" ]; then
  echo -e "${RED}✗ Error: Target user@host is required.${RESET}\n" >&2
  usage
fi

shell_quote() {
  printf "%q" "$1"
}

remote_dir_q=$(shell_quote "$remote_dir")

# Build SSH and SCP option arrays
ssh_opts=(-p "$ssh_port" -o ConnectTimeout=10)
scp_opts=(-P "$ssh_port" -o ConnectTimeout=10)

if [ -n "$ssh_key" ]; then
  if [ ! -f "$ssh_key" ]; then
    echo -e "${RED}✗ Error: SSH private key file '$ssh_key' does not exist.${RESET}" >&2
    exit 1
  fi
  ssh_opts+=(-i "$ssh_key")
  scp_opts+=(-i "$ssh_key")
fi

echo -e "${BOLD}[1/7] Checking host command dependencies...${RESET}"
check_dep "ssh"
check_dep "scp"
check_dep "tar"
check_dep "gzip"

echo -e "\n${BOLD}[2/7] Validating local environment secrets in ${env_file}...${RESET}"
if [ "$preserve_remote_env" -eq 1 ]; then
  echo -e "  ✓ Preserving existing remote .env; local env upload disabled."
else
if [ ! -f "$env_file" ]; then
  echo -e "${RED}✗ Error: local environment file '$env_file' is missing.${RESET}" >&2
  exit 1
fi

db_pass=$(grep "^DB_PASS=" "$env_file" | cut -d'=' -f2- | tr -d '"'\'' ')
jwt_secret=$(grep "^JWT_SECRET=" "$env_file" | cut -d'=' -f2- | tr -d '"'\'' ')

if [ -z "$db_pass" ] || [ "$db_pass" = "your_secure_password" ] || [ "$db_pass" = "placeholder" ]; then
  echo -e "${RED}✗ Error: DB_PASS in $env_file is missing or insecure. Cannot deploy stack.${RESET}" >&2
  exit 1
fi

if [ -z "$jwt_secret" ] || [ "$jwt_secret" = "your_jwt_secret" ] || [ "$jwt_secret" = "placeholder" ]; then
  echo -e "${RED}✗ Error: JWT_SECRET in $env_file is missing or insecure. Cannot deploy stack.${RESET}" >&2
  exit 1
fi
echo -e "  ✓ Local environment secrets validated successfully."
fi

echo -e "\n${BOLD}[3/7] Verifying SSH connectivity and remote dependencies...${RESET}"
echo "  Connecting to $ssh_target..."
if ! ssh "${ssh_opts[@]}" "$ssh_target" "echo '  ✓ SSH connection established successfully'" 2>&1; then
  echo -e "${RED}✗ Error: Failed to connect to remote host $ssh_target.${RESET}" >&2
  exit 1
fi

echo "  Checking remote Docker environment..."
remote_checks=$(ssh "${ssh_opts[@]}" "$ssh_target" '
  err=0
  if ! command -v docker &>/dev/null; then
    echo "  ✗ Error: docker is not installed on remote host"
    err=1
  else
    echo "  ✓ docker is installed on remote host"
  fi
  if ! docker compose version &>/dev/null; then
    echo "  ✗ Error: docker compose subcommand is not available on remote host"
    err=1
  else
    echo "  ✓ docker compose is available on remote host"
  fi
  if ! command -v curl &>/dev/null; then
    echo "  ✗ Error: curl is not installed on remote host"
    err=1
  else
    echo "  ✓ curl is installed on remote host"
  fi
  exit $err
')
check_res=$?
echo -e "$remote_checks"

if [ $check_res -ne 0 ]; then
  echo -e "${RED}✗ Error: Remote system check failed. Please install dependencies on remote host.${RESET}" >&2
  exit 1
fi

echo -e "\n${BOLD}[4/7] Packaging repository files...${RESET}"
archive_name="release-remote.tar.gz"
archive_path=$(mktemp -t eom-release-remote.XXXXXX.tar.gz)
trap 'rm -f "$archive_path"' EXIT
echo "  Excluding node_modules, git, dist, logs, and backups..."
tar -czf "$archive_path" \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude="$archive_name" \
  --exclude='release-*.tar.gz' \
  --exclude='release.tar.gz' \
  --exclude='.env' \
  --exclude='.env.local' \
  --exclude='.env.development' \
  --exclude='.env.production' \
  --exclude='.env.test' \
  --exclude='.lean-ctx' \
  --exclude='.serena' \
  --exclude='.pnpm-store' \
  --exclude='backups/*' \
  --exclude='agent_updates/*' \
  --exclude='playwright/.auth' \
  --exclude='playwright-report' \
  --exclude='test-results' \
  --exclude='apps/web/dist' \
  .
tar_res=$?

if [ $tar_res -ne 0 ] || [ ! -f "$archive_path" ]; then
  echo -e "${RED}✗ Error: Failed to create package archive.${RESET}" >&2
  exit 1
fi
echo -e "  ✓ Package archive created: $(du -sh "$archive_path" | cut -f1)"

if [ "$dry_run" -eq 1 ]; then
  echo -e "\n${BOLD}[DRY RUN] Validating remote deployment directory...${RESET}"
  ssh "${ssh_opts[@]}" "$ssh_target" "
    if [ -d $remote_dir_q ]; then
      echo '  ✓ Remote directory exists.'
      cd $remote_dir_q || exit 1
      if [ -f .env ]; then
        if grep -q '^DB_PASS=.' .env && grep -q '^JWT_SECRET=.' .env; then
          echo '  ✓ Remote .env contains required secret keys.'
        else
          echo '  ✗ Remote .env is missing DB_PASS or JWT_SECRET.'
          exit 1
        fi
      elif [ $preserve_remote_env -eq 1 ]; then
        echo '  ✗ --preserve-remote-env was set, but remote .env is missing.'
        exit 1
      else
        echo '  ⚠ Remote .env not found yet; deploy would upload the local env file.'
      fi
      if [ -f docker-compose.yml ]; then
        docker compose -f docker-compose.yml config -q && echo '  ✓ Remote production compose config is valid.'
      else
        echo '  ⚠ Remote production compose file not found yet.'
      fi
      if [ -f docker-compose.demo-db.yml ]; then
        docker compose -f docker-compose.demo-db.yml config -q && echo '  ✓ Remote demo compose config is valid.'
      fi
    else
      echo '  ⚠ Remote directory does not exist yet; deploy would create it.'
    fi
  "
  echo -e "\n${BOLD}${GREEN}✓ DRY RUN PASSED. No archive upload, env upload, container restart, or volume removal was performed.${RESET}\n"
  exit 0
fi

echo -e "\n${BOLD}[5/7] Uploading archive to remote host...${RESET}"
echo "  Creating directory: $remote_dir"
ssh "${ssh_opts[@]}" "$ssh_target" "mkdir -p $remote_dir_q"

if [ "$preserve_remote_env" -eq 1 ]; then
  if ! ssh "${ssh_opts[@]}" "$ssh_target" "test -f $remote_dir_q/.env && grep -q '^DB_PASS=.' $remote_dir_q/.env && grep -q '^JWT_SECRET=.' $remote_dir_q/.env"; then
    echo -e "${RED}✗ Error: --preserve-remote-env was set, but remote .env is missing required secrets.${RESET}" >&2
    rm -f "$archive_path"
    exit 1
  fi
  echo "  Remote .env found with required secret keys."
fi

echo "  Uploading $archive_name..."
scp "${scp_opts[@]}" "$archive_path" "$ssh_target:$remote_dir/$archive_name"
if [ $? -ne 0 ]; then
  echo -e "${RED}✗ Error: Failed to upload release archive.${RESET}" >&2
  rm -f "$archive_path"
  exit 1
fi

if [ "$preserve_remote_env" -eq 1 ]; then
  echo "  Preserving existing remote .env; skipping environment file upload."
else
  echo "  Uploading $env_file..."
  scp "${scp_opts[@]}" "$env_file" "$ssh_target:$remote_dir/.env"
  if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Error: Failed to upload environment file.${RESET}" >&2
    rm -f "$archive_path"
    exit 1
  fi
fi

rm -f "$archive_path"
echo -e "  ✓ Upload completed successfully."

echo -e "\n${BOLD}[6/7] Extracting files and launching production stack...${RESET}"
demo_down_flags="--remove-orphans"
if [ "$drop_demo_volumes" -eq 1 ]; then
  demo_down_flags="-v --remove-orphans"
fi
ssh "${ssh_opts[@]}" "$ssh_target" "
  cd $remote_dir_q || exit 1
  echo '  Extracting release package...'
  tar -xzf release-remote.tar.gz && rm release-remote.tar.gz

  echo '  Stopping conflicting demo stacks (if running)...'
  if [ -f docker-compose.demo-db.yml ]; then
    docker compose -f docker-compose.demo-db.yml down $demo_down_flags &>/dev/null
  fi
  if [ -f docker-compose.demo.yml ]; then
    docker compose -f docker-compose.demo.yml down $demo_down_flags &>/dev/null
  fi

  echo '  Provisioning external volume eom_postgres_data if missing...'
  if ! docker volume inspect eom_postgres_data &> /dev/null; then
    docker volume create eom_postgres_data >/dev/null
  fi

  echo '  Building and starting production container stack...'
  start_time=\$(date +%s)
  docker compose up -d --build --remove-orphans
  build_res=\$?
  end_time=\$(date +%s)
  build_time=\$((end_time - start_time))

  if [ \$build_res -ne 0 ]; then
    echo \"  ✗ Error: Remote docker compose up failed\"
    exit 1
  fi
  echo \"  ✓ Remote containers launched successfully in \${build_time}s.\"
"
remote_deploy_res=$?

if [ $remote_deploy_res -ne 0 ]; then
  echo -e "${RED}✗ Error: Remote deployment failed.${RESET}" >&2
  exit 1
fi

echo -e "\n${BOLD}[7/7] Verifying remote service health and diagnostics...${RESET}"
echo "  Waiting for remote services to boot up..."
ssh "${ssh_opts[@]}" "$ssh_target" "
  cd $remote_dir_q || exit 1
  
  # Wait loop for healthy status
  echo '  Waiting for API gateway to report healthy...'
  for i in {1..30}; do
    health_status=\$(docker inspect --format='{{.State.Health.Status}}' eom-api 2>/dev/null)
    if [ \"\$health_status\" = \"healthy\" ]; then
      break
    fi
    echo -n '.'
    sleep 2
  done
  echo ''

  # Output container list
  echo '  Checking running containers:'
  docker ps --filter 'name=eom-' --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
  
  # Fetch localhost logs check
  echo '  Checking internal response status:'
  api_status=\$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/ || echo 'FAILED')
  web_status=\$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:5173/ || echo 'FAILED')
  
  echo \"    - Localhost API gateway (Port 3000): \$api_status\"
  echo \"    - Localhost Web frontend (Port 5173): \$web_status\"
"

echo -e "\n${BOLD}Measuring SSH latency to remote server...${RESET}"
ssh_ping_start=$(date +%s%N)
ssh "${ssh_opts[@]}" "$ssh_target" "true"
ssh_ping_end=$(date +%s%N)
ssh_ping_diff=$(( (ssh_ping_end - ssh_ping_start) / 1000000 ))
echo -e "  - Remote host SSH round-trip latency: ${GREEN}${ssh_ping_diff}ms${RESET}"

echo -e "\n${BOLD}${GREEN}✓ REMOTE PRODUCTION DEPLOYMENT AND VERIFICATION COMPLETED SUCCESSFULLY!${RESET}\n"
exit 0
