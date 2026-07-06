import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import PrivateRoute from "../components/PrivateRoute";
import AppShell from "../components/layout/AppShell";
import PageTransition from "../components/common/PageTransition";
import { Permissions } from "../lib/auth/permissions";

const Login = lazy(() => import("../pages/Login"));
const Landing = lazy(() => import("../pages/Landing"));
const CaseStudy = lazy(() => import("../pages/CaseStudy"));
const Starter = lazy(() => import("../pages/Starter"));
const LiveSync = lazy(() => import("../pages/LiveSync"));
const Dashboard = lazy(() => import("../pages/Dashboard"));
const EODMonitor = lazy(() => import("../pages/EODMonitor"));
const StoreManagement = lazy(() => import("../pages/StoreManagement"));
const StoreSync = lazy(() => import("../pages/StoreSync"));
const IdentityCheck = lazy(() => import("../pages/IdentityCheck"));
const Backups = lazy(() => import("../pages/Backups"));
const SystemHealth = lazy(() => import("../pages/SystemHealth"));
const Logout = lazy(() => import("../pages/Logout"));
const Profile = lazy(() => import("../pages/Profile"));
const UsersAdmin = lazy(() => import("../pages/UsersAdmin"));
const RolesAdmin = lazy(() => import("../pages/RolesAdmin"));
const AfterHours = lazy(() => import("../pages/AfterHours"));
const AgentUpdater = lazy(() => import("../pages/AgentUpdater"));
const OfficeAgents = lazy(() => import("../pages/office-agents"));

const fallback = (
  <div className="flex h-screen items-center justify-center">Loading...</div>
);

const legacyRedirects = [
  ["/eod", "/app/eod"],
  ["/eod-area", "/app/eod"],
  ["/stores", "/app/stores"],
  ["/sync", "/app/sync"],
  ["/identity", "/app/identity"],
  ["/backups", "/app/backups"],
  ["/system", "/app/system"],
  ["/admin/users", "/app/admin/users"],
  ["/admin/roles", "/app/admin/roles"],
  ["/admin/afterhours", "/app/admin/afterhours"],
  ["/agent-updater", "/app/agent-updater"],
  ["/office-agents", "/app/office-agents"],
  ["/profile", "/app/profile"],
  ["/logout", "/app/logout"],
  ["/about", "/case-study"],
] as const;

export default function AppRouter() {
  return (
    <Suspense fallback={fallback}>
      <Routes>
        <Route
          path="/"
          element={
            <PageTransition>
              <Landing />
            </PageTransition>
          }
        />
        <Route
          path="/case-study"
          element={
            <PageTransition>
              <CaseStudy />
            </PageTransition>
          }
        />
        <Route
          path="/starter"
          element={
            <PageTransition>
              <Starter />
            </PageTransition>
          }
        />
        <Route
          path="/login"
          element={
            <PageTransition>
              <Login />
            </PageTransition>
          }
        />
        <Route
          path="/live"
          element={
            <PageTransition>
              <LiveSync />
            </PageTransition>
          }
        />
        <Route
          path="/live.html"
          element={
            <PageTransition>
              <LiveSync />
            </PageTransition>
          }
        />

        {legacyRedirects.map(([from, to]) => (
          <Route key={from} path={from} element={<Navigate to={to} replace />} />
        ))}

        <Route path="/app" element={<PrivateRoute />}>
          <Route element={<AppShell />}>
            <Route
              index
              element={
                <PrivateRoute requiredPerm={Permissions.DASHBOARD_VIEW}>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="eod"
              element={
                <PrivateRoute requiredPerm={Permissions.EOD_VIEW}>
                  <EODMonitor />
                </PrivateRoute>
              }
            />
            <Route path="eod-area" element={<Navigate to="/app/eod" replace />} />
            <Route
              path="stores"
              element={
                <PrivateRoute requiredPerm={Permissions.STORES_VIEW}>
                  <StoreManagement />
                </PrivateRoute>
              }
            />
            <Route
              path="sync"
              element={
                <PrivateRoute requiredPerm={Permissions.SYNC_VIEW}>
                  <StoreSync />
                </PrivateRoute>
              }
            />
            <Route
              path="identity"
              element={
                <PrivateRoute requiredPerm={Permissions.EMPLOYEES_VIEW}>
                  <IdentityCheck />
                </PrivateRoute>
              }
            />
            <Route
              path="backups"
              element={
                <PrivateRoute requiredPerm={Permissions.BACKUPS_VIEW}>
                  <Backups />
                </PrivateRoute>
              }
            />
            <Route
              path="system"
              element={
                <PrivateRoute requiredPerm={Permissions.SYSTEM_VIEW}>
                  <SystemHealth />
                </PrivateRoute>
              }
            />
            <Route
              path="admin/users"
              element={
                <PrivateRoute requiredPerm={Permissions.ACCOUNTS_VIEW}>
                  <UsersAdmin />
                </PrivateRoute>
              }
            />
            <Route
              path="admin/roles"
              element={
                <PrivateRoute requiredPerm={Permissions.ROLES_VIEW}>
                  <RolesAdmin />
                </PrivateRoute>
              }
            />
            <Route
              path="admin/afterhours"
              element={
                <PrivateRoute requiredPerm={Permissions.AFTERHOURS_VIEW}>
                  <AfterHours />
                </PrivateRoute>
              }
            />
            <Route
              path="agent-updater"
              element={
                <PrivateRoute requiredPerm={Permissions.AGENT_UPDATE}>
                  <AgentUpdater />
                </PrivateRoute>
              }
            />
            <Route
              path="office-agents"
              element={
                <PrivateRoute requiredPerm={Permissions.AGENT_UPDATE}>
                  <OfficeAgents />
                </PrivateRoute>
              }
            />
            <Route path="profile" element={<Profile />} />
            <Route path="logout" element={<Logout />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
