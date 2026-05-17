export const projectStory = {
  name: 'Enterprise Operations Monitor',
  tagline:
    'Real-time visibility for End-of-Day operations, store sync health, backups, agents, access control, and after-hours activity across a simulated retail branch network.',
  context:
    'This portfolio demo models the kind of operational dashboard a distributed retail team needs when nightly branch uploads, employee-store mappings, system health, and access controls all have to stay visible from one place.',
  outcome:
    'The app turns scattered operational checks into a single authenticated console: teams can review EOD progress, isolate sync problems, audit backups, monitor services, manage branch-scoped users, and inspect agent rollout status without leaving the dashboard.',
  disclosure:
    'All data in this demo is simulated or anonymized for portfolio use. No real store, employee, customer, credential, message-provider, or operational data is included.',
  techStack: [
    { label: 'Frontend', value: 'React, Vite, Tailwind CSS, React Router' },
    { label: 'Backend', value: 'Node.js, Express, Sequelize, PostgreSQL' },
    { label: 'Security', value: 'JWT auth, bcrypt passwords, RBAC v2, branch scoping' },
    { label: 'Operations', value: 'Docker Compose, Nginx, scheduled sync jobs, backup tooling' },
    { label: 'Demo Data', value: 'Mock API plus generated sample records for local demos' },
  ],
};

export const featureStories = [
  {
    id: 'dashboard',
    featureName: 'Dashboard',
    route: '/',
    materialIcon: 'dashboard',
    tagline: 'The daily control room for store operations.',
    problem:
      'Ops teams need a fast answer to one question: are stores, EOD uploads, sync jobs, employees, backups, and system signals healthy today?',
    solution:
      'The dashboard aggregates KPI cards, EOD completion, recent alerts, employee/store totals, backup availability, and operational shortcuts into one scan-friendly page.',
    impact:
      'A user can understand the day-state in seconds, then jump directly into the feature that needs attention.',
    metrics: [
      { label: 'Primary view', value: '1 page' },
      { label: 'Alert feed', value: 'Latest 10' },
      { label: 'EOD refresh window', value: '60 sec' },
    ],
    techHighlight:
      'The page pulls dashboard summary and alert data together, then attempts a one-time sync when a fresh install has no usable data yet.',
  },
  {
    id: 'store-sync',
    featureName: 'Store Sync',
    route: '/sync',
    materialIcon: 'sync',
    tagline: 'Find stale store uploads before they become reporting failures.',
    problem:
      'Branch data can arrive late, disappear behind stale timestamps, or fail for one branch while other branches continue operating normally.',
    solution:
      'Store Sync shows branch health, store-level freshness, stale/problem filters, manual refresh, and per-store history with recent or bucketed daily views.',
    impact:
      'Operators can identify exactly which store is late, when it last synced, and whether the problem is isolated to a branch or store.',
    metrics: [
      { label: 'UI refresh', value: '10 sec' },
      { label: 'History window', value: '30 min' },
      { label: 'Branches modeled', value: '8' },
    ],
    techHighlight:
      'The sync-audit source is fetched sequentially because the upstream endpoint can duplicate or miss data when branches are queried in parallel.',
  },
  {
    id: 'eod-monitor',
    featureName: 'EOD Monitor',
    route: '/eod',
    materialIcon: 'fact_check',
    tagline: 'Deadline compliance made visible while there is still time to act.',
    problem:
      'Nightly End-of-Day uploads are only useful if missing or failed stores are visible before the next business day starts.',
    solution:
      'The EOD monitor tracks store status by date, branch, and status; supports manual sync and retry actions; exports workbook reports; and shows branch-level completion cards.',
    impact:
      'Late stores, failed uploads, and branch-level bottlenecks become actionable from a single operational view.',
    metrics: [
      { label: 'Auto-refresh', value: '30 sec' },
      { label: 'EOD starts', value: '19:30 WIB' },
      { label: 'Export', value: 'XLSX' },
    ],
    techHighlight:
      'Database upserts preserve completed EOD records with "Ok is Final" protection, so nightly resets do not downgrade already-complete stores.',
  },
  {
    id: 'store-directory',
    featureName: 'Store Directory',
    route: '/stores',
    materialIcon: 'store',
    tagline: 'One searchable source for store and branch metadata.',
    problem:
      'Store metadata is hard to trust when branch, region, contact, and active-status fields are scattered across tools or stale spreadsheets.',
    solution:
      'The directory provides searchable, filterable, paginated store records with branch and region filters plus an Excel export.',
    impact:
      'Store identity and ownership questions can be answered without leaving the operations console.',
    metrics: [
      { label: 'Branches modeled', value: '8' },
      { label: 'Page size', value: '50' },
      { label: 'Export', value: 'XLSX' },
    ],
  },
  {
    id: 'employee-directory',
    featureName: 'Employee Directory',
    route: '/identity',
    materialIcon: 'badge',
    tagline: 'Employee-store mapping that can be searched under pressure.',
    problem:
      'Employee identifiers and store assignments need to be checked quickly when identity or branch ownership mismatches affect operations.',
    solution:
      'The employee directory lists people by NIK/name, branch, and role with pagination, branch filtering, role filtering, and CSV export.',
    impact:
      'Teams can validate NIK-to-store relationships without manual spreadsheet reconciliation.',
    metrics: [
      { label: 'Search modes', value: 'NIK/name' },
      { label: 'Page size', value: '20' },
      { label: 'Export', value: 'CSV' },
    ],
    techHighlight:
      'Employee and EOD source fetches use limited concurrency across branches to balance speed with upstream stability.',
  },
  {
    id: 'backups',
    featureName: 'Backups',
    route: '/backups',
    materialIcon: 'backup',
    tagline: 'Backup confidence needs timestamps, files, and restore controls.',
    problem:
      'A backup process is not trustworthy if operators cannot see the latest snapshot, confirm its size/status, download it, or prove restore controls exist.',
    solution:
      'The backup page shows summary health, recent snapshots, manual backup runs, downloads, delete confirmation, and guarded restore actions.',
    impact:
      'Database recovery moves from an invisible background job to an auditable operational workflow.',
    metrics: [
      { label: 'Default schedule', value: '00:05 daily' },
      { label: 'Page size', value: '25' },
      { label: 'Restore guard', value: 'Confirm text' },
    ],
  },
  {
    id: 'system',
    featureName: 'System Health',
    route: '/system',
    materialIcon: 'monitor_heart',
    tagline: 'Service health, logs, and restart actions in one guarded place.',
    problem:
      'When an operations dashboard degrades, users need to know whether the API, database, scheduler, logs, or services are the source of failure.',
    solution:
      'System Health combines overview metrics, service cards, healthcheck triggers, guarded service restart actions, log filtering, pagination, copy, and export.',
    impact:
      'Support users get a practical first-response console instead of guessing from user reports alone.',
    metrics: [
      { label: 'Log levels', value: '4' },
      { label: 'Export limit', value: '10000' },
      { label: 'Guarded actions', value: '2' },
    ],
  },
  {
    id: 'agent-updater',
    featureName: 'Agent Updater',
    route: '/agent-updater',
    materialIcon: 'browser_updated',
    tagline: 'Version drift is visible before rollout support starts.',
    problem:
      'Distributed store agents can fall behind, stop checking in, or require manual confirmation during software rollout.',
    solution:
      'The updater shows installed/uninstalled nodes, current suggested version, agent status, last check-in, error details, export, and publisher upload controls.',
    impact:
      'Operators can see rollout status by branch and store, then focus only on nodes that are outdated or unhealthy.',
    metrics: [
      { label: 'Polling', value: '30 sec' },
      { label: 'Upload limit', value: '100 MB' },
      { label: 'Artifact', value: '.exe' },
    ],
  },
  {
    id: 'office-agents',
    featureName: 'Office Agent Monitor',
    route: '/office-agents',
    materialIcon: 'computer',
    tagline: 'Laptop health signals are visible before support tickets arrive.',
    problem:
      'Office machines can go offline, run hot, fill disks, or stop reporting while users still expect support to know what changed.',
    solution:
      'Office Agent Monitor shows machine inventory, online/offline status, metric thresholds, process load, heartbeat history, label editing, and a fake installer workflow.',
    impact:
      'Support can identify which laptop needs attention, whether the issue is resource pressure or missed heartbeats, and when it last checked in.',
    metrics: [
      { label: 'Heartbeat cadence', value: '60 sec' },
      { label: 'Machines modeled', value: '6' },
      { label: 'Detail depth', value: '10 heartbeats' },
    ],
    techHighlight:
      'The page uses frontend-only mock state so the portfolio can demonstrate real-time monitoring behavior without requiring a Windows agent backend.',
  },
  {
    id: 'accounts',
    featureName: 'Accounts',
    route: '/admin/users',
    materialIcon: 'manage_accounts',
    tagline: 'Accountability starts with named users and scoped access.',
    problem:
      'Shared admin access makes it hard to assign responsibility, restrict branch data, or safely delegate operational tasks.',
    solution:
      'Accounts supports user creation, role assignment, branch scope editing, permission overrides, password changes/resets, and delete controls based on permissions.',
    impact:
      'Each user can receive only the access they need, with branch-level visibility aligned to their operational responsibility.',
    metrics: [
      { label: 'Scope model', value: 'Branch-based' },
      { label: 'Override types', value: 'Allow/deny' },
      { label: 'Admin page size', value: '25' },
    ],
  },
  {
    id: 'roles',
    featureName: 'Roles',
    route: '/admin/roles',
    materialIcon: 'admin_panel_settings',
    tagline: 'RBAC that is explicit enough for real operations.',
    problem:
      'A simple admin/viewer split cannot safely represent backup actions, EOD retries, service restarts, branch scopes, and account management.',
    solution:
      'Roles exposes system and custom roles with grouped permissions, edit controls, create/delete support for custom roles, and immutable protection for system roles.',
    impact:
      'Least-privilege access can be configured without changing code whenever responsibility changes.',
    metrics: [
      { label: 'System roles', value: '6' },
      { label: 'Permissions', value: '30' },
      { label: 'Override support', value: 'Per user' },
    ],
    techHighlight:
      'RBAC v2 resolves database-backed roles, user permission overrides, and branch scopes while retaining legacy role fallback compatibility.',
  },
  {
    id: 'after-hours',
    featureName: 'After Hours',
    route: '/admin/afterhours',
    materialIcon: 'nightlight',
    tagline: 'After-hours activity is only useful when it becomes an alert, report, and trend.',
    problem:
      'Store computers or uploads active outside operational windows can quietly affect next-day reporting and require branch-level follow-up.',
    solution:
      'After Hours combines daily violation checks, notification settings, staged warning schedules, branch targets, monthly rankings, report generation, and export.',
    impact:
      'Off-window activity becomes visible, repeat offenders can be ranked, and branch notifications can be managed in one place.',
    metrics: [
      { label: 'Warning stages', value: '4' },
      { label: 'Report view', value: 'Monthly' },
      { label: 'Export', value: 'XLSX' },
    ],
  },
  {
    id: 'after-hours-report',
    featureName: 'After Hours Report',
    route: '/admin/afterhours',
    materialIcon: 'summarize',
    tagline: 'Monthly violation patterns are turned into a reviewable branch report.',
    problem:
      'Daily after-hours alerts are useful, but repeated off-window activity needs a monthly view that can be reviewed and shared.',
    solution:
      'The report view summarizes monthly violation days, branch rankings, report windows, generated timestamps, and export-ready detail tables.',
    impact:
      'Managers can see recurring patterns instead of isolated events, then focus follow-up on branches and stores with repeat violations.',
    metrics: [
      { label: 'Report grain', value: 'Monthly' },
      { label: 'Ranking view', value: 'Branch + store' },
      { label: 'Export', value: 'XLSX' },
    ],
  },
  {
    id: 'logout',
    featureName: 'Logout',
    route: '/logout',
    materialIcon: 'logout',
    tagline: 'Session exit is explicit instead of hidden behind a sidebar click.',
    problem:
      'Operational users need a safe way to end sessions, especially when shared workstations or demo environments are involved.',
    solution:
      'The logout page confirms intent, calls the logout endpoint, handles API failure gracefully, and clears local auth state before returning to login.',
    impact:
      'Session cleanup is visible, recoverable, and consistent with the rest of the permission-gated workflow.',
    metrics: [
      { label: 'Confirmation', value: 'Required' },
      { label: 'Fallback', value: 'Local logout' },
      { label: 'Redirect', value: '/login' },
    ],
  },
  {
    id: 'profile',
    featureName: 'Profile',
    route: '/profile',
    materialIcon: 'account_circle',
    tagline: 'Current-user context and account actions stay close to the operator.',
    problem:
      'Users need to confirm which account and role are active before taking guarded operational actions.',
    solution:
      'Profile displays username, role, initials, account-management navigation, password change controls, and logout access.',
    impact:
      'Reviewers can see how account identity connects to permissions without opening the admin console first.',
    metrics: [
      { label: 'Password flow', value: 'Self-service' },
      { label: 'Admin shortcut', value: 'Conditional' },
      { label: 'Session action', value: 'Logout' },
    ],
  },
  {
    id: 'about',
    featureName: 'About This Project',
    route: '/about',
    materialIcon: 'info',
    tagline: 'The portfolio context is documented inside the product, not only in README files.',
    problem:
      'A reviewer needs to understand the project purpose, simulated data boundary, tech stack, and feature intent while using the app.',
    solution:
      'About centralizes the project story, demo disclosure, tech stack, verified surfaces, and per-feature Problem/Solution/Impact narratives.',
    impact:
      'The app can explain itself during a live review and connect each operational screen to the portfolio goals it demonstrates.',
    metrics: [
      { label: 'Story catalog', value: 'All routes' },
      { label: 'Disclosure', value: 'In-app' },
      { label: 'Backend changes', value: 'None' },
    ],
  },
  {
    id: 'live-sync',
    featureName: 'Live Sync',
    route: '/live',
    materialIcon: 'live_tv',
    tagline: 'A public wallboard for operational awareness.',
    problem:
      'Not every operational display should require a full authenticated admin session, especially when a team needs a read-only screen during monitoring windows.',
    solution:
      'Live Sync provides a public read-only view for store sync and EOD attention signals, with automatic polling and display-focused layout.',
    impact:
      'Teams can keep a shared operational screen open without exposing account-management or write-capable workflows.',
    metrics: [
      { label: 'Routes', value: '/live + /live.html' },
      { label: 'Mode', value: 'Read-only' },
      { label: 'Display', value: 'Wallboard' },
    ],
  },
];

export const featureStoryById = featureStories.reduce((acc, story) => {
  acc[story.id] = story;
  return acc;
}, {});

export function getFeatureStory(id) {
  return featureStoryById[id] || null;
}
