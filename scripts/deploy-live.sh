#!/usr/bin/env bash
#
# deploy-live.sh
# Production Deployment Automation Script
#

# Colors for output
RESET="\033[0m"
BOLD="\033[1m"
RED="\033[31m"
GREEN="\033[32m"
YELLOW="\033[33m"
CYAN="\033[36m"

echo -e "${BOLD}${CYAN}=====================================================${RESET}"
echo -e "${BOLD}${CYAN}        ENTERPRISE OPS MONITOR - LIVE DEPLOYMENT     ${RESET}"
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
  echo -e "${RED}✗ Error: JWT_SECRET in .env is missing or insecure. Cannot deploy to production.${RESET}" >&2
  exit 1
fi
echo -e "  ✓ Environment secrets validated successfully."

echo -e "\n${BOLD}[3/6] Cleaning up conflicting demo containers...${RESET}"
if [ -f docker-compose.demo-db.yml ]; then
  echo "  Stopping conflicting demo-db stack..."
  docker compose -f docker-compose.demo-db.yml down -v --remove-orphans &>/dev/null
fi
if [ -f docker-compose.demo.yml ]; then
  echo "  Stopping conflicting standalone demo stack..."
  docker compose -f docker-compose.demo.yml down -v --remove-orphans &>/dev/null
fi
echo -e "  ✓ Conflicting demo stacks cleaned up."

echo -e "\n${BOLD}[4/6] Provisioning production Docker volumes...${RESET}"
if ! docker volume inspect eom_postgres_data &> /dev/null; then
  echo "  Volume 'eom_postgres_data' not found. Creating..."
  docker volume create eom_postgres_data >/dev/null
fi
echo -e "  ✓ Volume eom_postgres_data is ready."

echo -e "\n${BOLD}[5/6] Building and launching production containers...${RESET}"
start_time=$(date +%s)
docker compose up -d --build
build_res=$?
end_time=$(date +%s)
build_time=$((end_time - start_time))

if [ $build_res -ne 0 ]; then
  echo -e "${RED}✗ Error: docker compose up failed.${RESET}" >&2
  exit 1
fi
echo -e "  ✓ Containers built and launched in ${build_time}s."

echo -e "\n${BOLD}[6/6] Verifying service health and running diagnostics...${RESET}"
echo "  Waiting for API gateway to report healthy..."
for i in {1..30}; do
  health_status=$(docker inspect --format='{{.State.Health.Status}}' eom-api 2>/dev/null)
  if [ "$health_status" = "healthy" ]; then
    break
  fi
  echo -n "."
  sleep 2
done
echo ""

# Run diagnostics checks
node scripts/deploy-check.js --prod
diag_res=$?

if [ $diag_res -ne 0 ]; then
  echo -e "${RED}✗ Diagnostics validation failed.${RESET}" >&2
  exit 1
fi

echo -e "\n${BOLD}Measuring endpoint response latencies...${RESET}"
measure_latency() {
  local name=$1
  local url=$2
  local response
  response=$(curl -o /dev/null -s -w "HTTP_STATUS=%{http_code} CONNECT_TIME=%{time_connect}s TOTAL_TIME=%{time_total}s" "$url")
  echo -e "  - ${name} (${url}): ${GREEN}${response}${RESET}"
}
measure_latency "Web Frontend" "http://127.0.0.1:5173/"
measure_latency "Express API" "http://127.0.0.1:3000/"

echo -e "\n${BOLD}${GREEN}✓ LIVE PRODUCTION DEPLOYMENT AND VERIFICATION COMPLETED SUCCESSFULLY!${RESET}\n"
exit 0
