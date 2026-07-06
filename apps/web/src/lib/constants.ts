/** App-wide constants */
export const ROUTES = {
  LOGIN: "/login",
  LIVE: "/live",
  LANDING: "/",
  CASE_STUDY: "/case-study",
  STARTER: "/starter",
  DASHBOARD: "/app",
  EOD: "/app/eod",
  STORES: "/app/stores",
  SYNC: "/app/sync",
  IDENTITY: "/app/identity",
  BACKUPS: "/app/backups",
  SYSTEM: "/app/system",
  USERS: "/app/admin/users",
  ROLES: "/app/admin/roles",
  AFTERHOURS: "/app/admin/afterhours",
  AGENT_UPDATER: "/app/agent-updater",
  OFFICE_AGENTS: "/app/office-agents",
  PROFILE: "/app/profile",
  ABOUT: "/case-study",
  LOGOUT: "/app/logout",
} as const;

export const API_PREFIX = "/api";
