# Premium Dashboard Card Proposals

To make the **Enterprise Operations Monitor** dashboard feel complete and enterprise-grade, we can introduce additional high-impact cards. These suggestions map directly to already-existing backend features, database models, and permissions.

---

## 1. Store Agent Health Card
* **Backend Model**: `AgentMonitoring`
* **Current UI Page**: `/office-agents` (or `/agents`)
* **Core Purpose**: Monitor the version, status, and health of background worker agents running at retail stores.

### Suggested Design
```tsx
<StatCard
  title="Active Store Agents"
  value={`${agents.activeCount} / ${agents.totalCount}`}
  icon={<Monitor className="size-5" />}
  subtext={
    <div className="flex gap-2 text-xs">
      <span className="text-emerald-500 font-medium">{agents.onlineCount} Online</span>
      <span>|</span>
      <span className="text-amber-500 font-medium">{agents.updatePending} Outdated</span>
    </div>
  }
  onClick={() => navigate('/office-agents')}
/>
```

---

## 2. After-Hours Violations Card
* **Backend Tables**: `afterhours_pc_log`, `afterhours_monthly_report`
* **Current UI Page**: `/after-hours`
* **Core Purpose**: Highlight unauthorized computer usage inside branches after standard trading hours.

### Suggested Design
```tsx
<StatCard
  title="After-Hours Violations"
  value={violations.todayCount}
  icon={<AlertTriangle className={`size-5 ${violations.todayCount > 0 ? 'text-red-500 animate-pulse' : ''}`} />}
  subtext={
    violations.todayCount > 0 
      ? `${violations.activeTerminals} active systems detected now!`
      : "No active violations detected after hours"
  }
  onClick={() => navigate('/after-hours')}
/>
```

---

## 3. Store Sync / Polling Health Card
* **Backend Models**: `SyncLog`, `SyncSummary`, `SyncAlertState`
* **Current UI Page**: `/sync` (or `/store-sync`)
* **Core Purpose**: Real-time visualization of branch connectivity and database sync delay.

### Suggested Design
```tsx
<StatCard
  title="Real-Time Sync Health"
  value={`${sync.healthyPercentage}%`}
  icon={<RefreshCw className="size-5" />}
  subtext={
    <div className="flex gap-2 text-xs">
      <span className="text-emerald-500">Synced {sync.syncedCount}</span>
      <span>|</span>
      <span className="text-amber-500">Stale {sync.staleCount}</span>
      <span>|</span>
      <span className="text-red-500">Problem {sync.problemCount}</span>
    </div>
  }
  onClick={() => navigate('/sync')}
/>
```

---

## 4. Backup Success & Verification Card
* **Backend Model**: `BackupLog`
* **Current UI Page**: `/backups`
* **Core Purpose**: Verify database backup reliability, sizes, and schedule adherence.

### Suggested Design
```tsx
<StatCard
  title="Backup Health"
  value={backups.successRate ? `${backups.successRate}%` : "100%"}
  icon={<Cloud className="size-5" />}
  subtext={
    backups.failedCount > 0
      ? `${backups.failedCount} backups failed in the last 7 days!`
      : `Last manual backup: ${formatDateTime(backups.latestAt)}`
  }
  onClick={() => navigate('/backups')}
/>
```

---

## Suggested Dashboard Layout (with New Cards)

### Top Stat Cards Row
```
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  Total Stores   │ │  EOD Status     │ │  Store Agents   │ │  Sync Health    │ │  After-Hours    │
│  59             │ │  68% Completed  │ │  56 / 59 Active │ │  94.9% Healthy  │ │  0 Violations   │
│  68% today      │ │  40 Done | 19 P │ │  56 On | 3 Out  │ │  56 OK | 3 Stal │ │  No violations  │
└─────────────────┘ └─────────────────┘ └─────────────────┘ └─────────────────┘ └─────────────────┘
```

### Quick Actions Card
Add shortcuts to trigger automated events:
- **"Run Store Audit"**: Poll all store status endpoints.
- **"Deploy Agent Update"**: Force outdated agents to download latest update.
- **"Reset Violations Log"**: Clean operational flags.
