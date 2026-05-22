#!/usr/bin/env bash
#
# deploy-demo.sh
# Local Stateful Demo Deployment Automation Script
#

# Colors for output
RESET="\033[0m"
BOLD="\033[1m"
RED="\033[31m"
GREEN="\033[32m"
YELLOW="\033[33m"
CYAN="\033[36m"

echo -e "${BOLD}${CYAN}=====================================================${RESET}"
echo -e "${BOLD}${CYAN}         ENTERPRISE OPS MONITOR - DEMO DEPLOYMENT    ${RESET}"
echo -e "${BOLD}${CYAN}=====================================================${RESET}\n"

# Helper for dependency check
check_dep() {
  if ! command -v "$1" &> /dev/null; then
    echo -e "${RED}✗ Error: $1 is required but not installed.${RESET}" >&2
    exit 1
  fi
  echo -e "  ✓ $1 is installed."
}

echo -e "${BOLD}[1/6] Checking host command dependencies...${RESET}"
check_dep "node"
check_dep "pnpm"
check_dep "docker"
check_dep "curl"

if ! docker compose version &> /dev/null; then
  echo -e "${RED}✗ Error: 'docker compose' subcommand is not available.${RESET}" >&2
  exit 1
fi
echo -e "  ✓ docker compose subcommand is available."

echo -e "\n${BOLD}[2/6] Validating environment secrets in .env...${RESET}"
if [ ! -f .env ]; then
  echo -e "${RED}✗ Error: .env file is missing in the repository root.${RESET}" >&2
  exit 1
fi

db_pass=$(grep "^DB_PASS=" .env | cut -d'=' -f2- | tr -d '"'\'' ')
jwt_secret=$(grep "^JWT_SECRET=" .env | cut -d'=' -f2- | tr -d '"'\'' ')

if [ -z "$db_pass" ] || [ "$db_pass" = "your_secure_password" ] || [ "$db_pass" = "placeholder" ]; then
  echo -e "${YELLOW}⚠ Warning: DB_PASS in .env is missing or insecure.${RESET}" >&2
fi

if [ -z "$jwt_secret" ] || [ "$jwt_secret" = "your_jwt_secret" ] || [ "$jwt_secret" = "placeholder" ]; then
  echo -e "${RED}✗ Error: JWT_SECRET in .env is missing or insecure. Cannot deploy stack.${RESET}" >&2
  exit 1
fi
echo -e "  ✓ Environment secrets validated successfully."

echo -e "\n${BOLD}[3/6] Cleaning up conflicting production containers...${RESET}"
echo "  Stopping production stack..."
docker compose down -v --remove-orphans &>/dev/null
if [ -f docker-compose.demo.yml ]; then
  echo "  Stopping conflicting standalone demo stack..."
  docker compose -f docker-compose.demo.yml down -v --remove-orphans &>/dev/null
fi
echo -e "  ✓ Conflicting stacks cleaned up."

echo -e "\n${BOLD}[4/6] Provisioning demo Docker volumes...${RESET}"
if ! docker volume inspect eom_postgres_demo_data &> /dev/null; then
  echo "  Volume 'eom_postgres_demo_data' not found. Creating..."
  docker volume create eom_postgres_demo_data >/dev/null
fi
echo -e "  ✓ Volume eom_postgres_demo_data is ready."

echo -e "\n${BOLD}[5/6] Building and launching stateful demo-db stack...${RESET}"
start_time=$(date +%s)
docker compose -f docker-compose.demo-db.yml up -d --build
build_res=$?
end_time=$(date +%s)
build_time=$((end_time - start_time))

if [ $build_res -ne 0 ]; then
  echo -e "${RED}✗ Error: docker compose up failed.${RESET}" >&2
  exit 1
fi
echo -e "  ✓ Containers built and launched in ${build_time}s."

echo -e "\n${BOLD}[6/6] Verifying service health and running diagnostics...${RESET}"
echo "  Waiting for demo API gateway to report healthy..."
for i in {1..30}; do
  health_status=$(docker inspect --format='{{.State.Health.Status}}' eom-demo-api 2>/dev/null)
  if [ "$health_status" = "healthy" ]; then
    break
  fi
  echo -n "."
  sleep 2
done
echo ""

# Run diagnostics checks
node scripts/deploy-check.js --demo
diag_res=$?

if [ $diag_res -ne 0 ]; then
  echo -e "${RED}✗ Diagnostics validation failed.${RESET}" >&2
  exit 1
fi

echo -e "\n${BOLD}Obtaining API auth token...${RESET}"
admin_user=$(grep "^DEFAULT_ADMIN_USERNAME=" .env | cut -d'=' -f2- | tr -d '"'\'' ')
admin_pass=$(grep "^DEFAULT_ADMIN_PASSWORD=" .env | cut -d'=' -f2- | tr -d '"'\'' ')
admin_user=${admin_user:-admin}
admin_pass=${admin_pass:-admin123}

login_res=$(curl -s -X POST -H "Content-Type: application/json" -d "{\"username\":\"${admin_user}\",\"password\":\"${admin_pass}\"}" http://127.0.0.1:3000/api/auth/login)
token=$(echo "$login_res" | grep -o '"token":"[^"]*"' | head -n1 | cut -d':' -f2- | tr -d '"')

if [ -z "$token" ]; then
  echo -e "${RED}✗ Error: Failed to obtain auth token. Login response: ${login_res}${RESET}" >&2
  exit 1
fi
echo -e "  ✓ Auth token obtained successfully."

echo -e "\n${BOLD}Verifying real-time synchronization updates (1s polling checks)...${RESET}"
for attempt in {1..4}; do
  stats=$(curl -s -H "Authorization: Bearer ${token}" http://127.0.0.1:3000/api/dashboard/summary)
  if [ $? -eq 0 ] && echo "$stats" | grep -q '"ok":true'; then
    done_val=$(echo "$stats" | grep -o '"done":[0-9]*' | head -n1 | cut -d':' -f2)
    pending_val=$(echo "$stats" | grep -o '"pending":[0-9]*' | head -n1 | cut -d':' -f2)
    failed_val=$(echo "$stats" | grep -o '"failed":[0-9]*' | head -n1 | cut -d':' -f2)
    last_sync=$(echo "$stats" | grep -o '"lastSyncAt":"[^"]*"' | head -n1 | cut -d':' -f2 | tr -d '"')
    echo -e "  - Attempt ${attempt} - Done: ${GREEN}${done_val}${RESET}, Pending: ${YELLOW}${pending_val}${RESET}, Failed: ${RED}${failed_val}${RESET}, Last Sync: ${CYAN}${last_sync}${RESET}"
  else
    echo -e "  - Attempt ${attempt} - ${RED}Failed to fetch dashboard summary:${RESET} ${stats}"
  fi
  sleep 2
done

echo -e "\n${BOLD}${GREEN}✓ STATEFUL DEMO DEPLOYMENT AND VERIFICATION COMPLETED SUCCESSFULLY!${RESET}\n"
exit 0
