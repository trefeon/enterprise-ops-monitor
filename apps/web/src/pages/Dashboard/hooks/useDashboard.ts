import { useCallback, useRef, useState } from "react"
import type { DashboardSummary, Alert } from "../types"
import type { ApiResponse } from "@/types"

interface ApiClient {
  get: (url: string, opts?: Record<string, unknown>) => Promise<ApiResponse>
  post: (url: string, body?: unknown, opts?: Record<string, unknown>) => Promise<ApiResponse>
}

export function useDashboard(api: ApiClient) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const autoSyncAttempted = useRef(false)

  const fetchData = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setLoading(true)
      if (!silent) setError(null)
      try {
        const [summaryRes, alertsRes] = await Promise.all([
          api.get("/dashboard/summary"),
          api.get("/dashboard/alerts", { params: { limit: 10 } }),
        ])
        if (!summaryRes.ok) throw new Error(summaryRes.error?.message || "Failed to load summary")
        if (!alertsRes.ok) throw new Error(alertsRes.error?.message || "Failed to load alerts")
        setSummary(summaryRes.data as DashboardSummary)
        setAlerts((alertsRes.data as Alert[]) || [])
      } catch (err) {
        if (!silent) setError(err instanceof Error ? err.message : "Failed to load dashboard")
      } finally {
        if (!silent) setLoading(false)
      }
    },
    [api],
  )

  const handleManualSync = useCallback(async () => {
    setSyncing(true)
    try {
      const [syncRes, alertsRes] = await Promise.all([
        api.post("/dashboard/sync"),
        api.get("/dashboard/alerts", { params: { limit: 10 } }),
      ])
      if (!syncRes.ok) throw new Error(syncRes.error?.message || "Manual sync failed")
      if (!alertsRes.ok) throw new Error(alertsRes.error?.message || "Failed to refresh alerts")
      setSummary(syncRes.data as DashboardSummary)
      setAlerts((alertsRes.data as Alert[]) || [])
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Sync failed" }
    } finally {
      setSyncing(false)
    }
  }, [api])

  return { summary, alerts, loading, error, syncing, fetchData, handleManualSync, autoSyncAttempted }
}
