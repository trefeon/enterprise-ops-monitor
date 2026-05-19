import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from './ui/ToastContext';
import { apiGet, apiPatch } from '../lib/api/client';
import { PermissionGroups } from '../lib/auth/permissions';
import { Loader2, X, Check } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

/**
 * UserAccessModal - Modal for managing user roles, branch scope, and permission overrides
 * @param {Object} props
 * @param {boolean} props.open
 * @param {Object} props.user - User object with id, username, roles, overrides, branchScope
 * @param {boolean} [props.canEditRoles]
 * @param {boolean} [props.canEditScope]
 * @param {boolean} [props.canEditPerms]
 * @param {() => void} props.onClose
 * @param {() => void} [props.onSave]
 */
export default function UserAccessModal({
  open,
  user,
  canEditRoles = false,
  canEditScope = false,
  canEditPerms = false,
  onClose,
  onSave,
}) {
  const [activeTab, setActiveTab] = useState('roles');
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState([]);
  const [branches, setBranches] = useState([]);
  const { push } = useToast();

  const availableTabs = useMemo(() => {
    const tabs = [];
    if (canEditRoles) tabs.push('roles');
    if (canEditScope) tabs.push('branches');
    if (canEditPerms) tabs.push('overrides');
    return tabs;
  }, [canEditRoles, canEditScope, canEditPerms]);

  // Form state
  const [selectedRoleIds, setSelectedRoleIds] = useState([]);
  const [selectedBranches, setSelectedBranches] = useState([]);
  const [allBranches, setAllBranches] = useState(true);
  const [overrides, setOverrides] = useState(/** @type {Record<string, 'allow' | 'deny'>} */ ({}));

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      // Load roles list
      if (canEditRoles) {
        const rolesRes = await apiGet('/roles');
        if (rolesRes.ok) {
          setRoles(rolesRes.data.roles || []);
        }
      }

      // Load branches dynamically
      const branchesRes = await apiGet('/system/branches');
      if (branchesRes.ok && Array.isArray(branchesRes.data)) {
        setBranches(branchesRes.data);
      } else {
        // Fallback or empty if failed
        setBranches([]);
      }

      // Load user details
      const userRes = await apiGet(`/users/${user.id}`);
      if (userRes.ok) {
        const u = userRes.data.user;
        setSelectedRoleIds((u.roles || []).map((r) => r.id));

        const scope = u.branchScope;
        if (scope === 'ALL' || (Array.isArray(scope) && scope.length === 0)) {
          setAllBranches(true);
          setSelectedBranches([]);
        } else {
          setAllBranches(false);
          // Normalize to strings for consistent comparison with branch.id
          setSelectedBranches(Array.isArray(scope) ? scope.map(String) : []);
        }

        // Build overrides map
        const ovMap = /** @type {Record<string, 'allow' | 'deny'>} */ ({});
        if (u.overrides) {
          (u.overrides.allow || []).forEach((p) => {
            ovMap[p] = 'allow';
          });
          (u.overrides.deny || []).forEach((p) => {
            ovMap[p] = 'deny';
          });
        }
        setOverrides(ovMap);
      }
    } catch {
      push({ variant: 'error', title: 'Error', message: 'Failed to load user data' });
    } finally {
      setLoading(false);
    }
  }, [user?.id, canEditRoles, push]);

  useEffect(() => {
    if (open && user) {
      loadData();
    }
  }, [open, user, loadData]);

  useEffect(() => {
    if (availableTabs.length === 0) return;
    if (!availableTabs.includes(activeTab)) {
      setActiveTab(availableTabs[0]);
    }
  }, [availableTabs, activeTab]);

  const handleSaveRoles = async () => {
    setLoading(true);
    try {
      const res = await apiPatch(`/users/${user.id}/roles`, { role_ids: selectedRoleIds });
      if (res.ok) {
        push({ variant: 'success', title: 'Success', message: 'Roles updated' });
        onSave?.();
      } else {
        push({
          variant: 'error',
          title: 'Error',
          message: res.error?.message || 'Failed to update roles',
        });
      }
    } catch {
      push({ variant: 'error', title: 'Error', message: 'Failed to update roles' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBranchScope = async () => {
    setLoading(true);
    try {
      const branchIds = allBranches ? [] : selectedBranches;
      const res = await apiPatch(`/users/${user.id}/branch-scope`, { branch_ids: branchIds });
      if (res.ok) {
        push({ variant: 'success', title: 'Success', message: 'Branch scope updated' });
        onSave?.();
      } else {
        push({
          variant: 'error',
          title: 'Error',
          message: res.error?.message || 'Failed to update branch scope',
        });
      }
    } catch {
      push({ variant: 'error', title: 'Error', message: 'Failed to update branch scope' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveOverrides = async () => {
    setLoading(true);
    try {
      const allow = Object.entries(overrides)
        .filter(([, v]) => v === 'allow')
        .map(([k]) => k);
      const deny = Object.entries(overrides)
        .filter(([, v]) => v === 'deny')
        .map(([k]) => k);
      const res = await apiPatch(`/users/${user.id}/permissions`, { allow, deny });
      if (res.ok) {
        push({ variant: 'success', title: 'Success', message: 'Permission overrides updated' });
        onSave?.();
      } else {
        push({
          variant: 'error',
          title: 'Error',
          message: res.error?.message || 'Failed to update overrides',
        });
      }
    } catch {
      push({ variant: 'error', title: 'Error', message: 'Failed to update overrides' });
    } finally {
      setLoading(false);
    }
  };

  const toggleRole = (roleId) => {
    setSelectedRoleIds((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
    );
  };

  const toggleBranch = (branchId) => {
    const strId = String(branchId);
    setSelectedBranches((prev) =>
      prev.includes(strId) ? prev.filter((id) => id !== strId) : [...prev, strId]
    );
  };

  /** @param {string} perm */
  const cycleOverride = (perm) => {
    setOverrides((prev) => {
      const current = prev[perm];
      if (!current) return { ...prev, [perm]: 'allow' };
      if (current === 'allow') return { ...prev, [perm]: 'deny' };
      const next = { ...prev };
      delete next[perm];
      return next;
    });
  };

  if (!open) return null;

  if (availableTabs.length === 0) {
    return null;
  }

  const tabLabel = {
    roles: 'roles',
    branches: 'Branch Scope',
    overrides: 'overrides',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm">
      <Card className="w-full max-w-2xl max-h-screen overflow-hidden m-4 flex flex-col">
        <CardContent className="p-0">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="text-lg font-semibold">Edit Access: {user?.username}</h2>
            <button onClick={onClose} className="p-1 hover:bg-secondary rounded transition-colors">
              <X className="size-5" />
            </button>
          </div>
          {/* Tabs */}
          <div className="flex border-b border-border">
            {availableTabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium capitalize ${
                  activeTab === tab
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tabLabel[tab] || tab}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {/* Roles Tab */}
                {activeTab === 'roles' && (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">Select roles for this user:</p>
                    <div className="grid grid-cols-2 gap-2">
                      {roles.map((role) => (
                        <label
                          key={role.id}
                          className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors ${
                            selectedRoleIds.includes(role.id)
                              ? 'border-primary bg-primary/10'
                              : 'border-border hover:bg-secondary/50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedRoleIds.includes(role.id)}
                            onChange={() => toggleRole(role.id)}
                            className="rounded"
                          />
                          <div>
                            <div className="font-medium text-sm">{role.label}</div>
                            <div className="text-xs text-muted-foreground">{role.name}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                    <div className="flex justify-end pt-2">
                      <Button onClick={handleSaveRoles} disabled={loading}>
                        {loading && <Loader2 className="animate-spin mr-2 size-4" />}
                        Save Roles
                      </Button>
                    </div>
                  </div>
                )}

                {/* Branch Scope Tab */}
                {activeTab === 'branches' && (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Restrict user to specific branches. Empty selection = all branches.
                    </p>
                    <label className="flex items-center gap-2 p-2 rounded border border-border">
                      <input
                        type="checkbox"
                        checked={allBranches}
                        onChange={(e) => {
                          setAllBranches(e.target.checked);
                          if (e.target.checked) setSelectedBranches([]);
                        }}
                        className="rounded"
                      />
                      <span className="font-medium">All Branches (no restriction)</span>
                    </label>
                    {!allBranches && (
                      <div className="grid grid-cols-2 gap-2">
                        {branches.map((branch) => (
                          <label
                            key={branch.id}
                            className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors ${
                              selectedBranches.includes(String(branch.id))
                                ? 'border-primary bg-primary/10'
                                : 'border-border hover:bg-secondary/50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selectedBranches.includes(String(branch.id))}
                              onChange={() => toggleBranch(branch.id)}
                              className="rounded"
                            />
                            <span className="text-sm">{branch.name}</span>
                          </label>
                        ))}
                      </div>
                    )}
                    <div className="flex justify-end pt-2">
                      <Button onClick={handleSaveBranchScope} disabled={loading}>
                        {loading && <Loader2 className="animate-spin mr-2 size-4" />}
                        Save Branch Scope
                      </Button>
                    </div>
                  </div>
                )}

                {/* Overrides Tab */}
                {activeTab === 'overrides' && (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Override specific permissions. Click to cycle: Inherited → Allow → Deny
                    </p>
                    <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
                      {Object.entries(PermissionGroups).map(([group, perms]) => (
                        <div key={group}>
                          <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-2">
                            {group}
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {perms.map((perm) => {
                              const state = overrides[perm];
                              let bgClass =
                                'bg-secondary text-secondary-foreground border-border/40';
                              let icon = null;
                              if (state === 'allow') {
                                bgClass =
                                  'bg-status-success/15 text-status-success border-status-success/30';
                                icon = <Check className="size-3" />;
                              } else if (state === 'deny') {
                                bgClass =
                                  'bg-status-error/15 text-status-error border-status-error/30';
                                icon = <X className="size-3" />;
                              }
                              return (
                                <button
                                  key={perm}
                                  onClick={() => cycleOverride(perm)}
                                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-all active:scale-95 ${bgClass}`}
                                >
                                  {icon}
                                  {perm}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-end pt-4">
                      <Button onClick={handleSaveOverrides} disabled={loading}>
                        {loading && <Loader2 className="animate-spin mr-2 size-4" />}
                        Save Overrides
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
