import React, { useCallback, useEffect, useMemo, useState } from 'react';
import PageShell from '../../components/ui/PageShell';
import PageHeader from '../../components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import DataTable from '../../components/ui/DataTable';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import Modal from '../../components/ui/Modal';
import { useToast } from '../../components/ui/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { hasPermission, Permissions } from '../../lib/auth/permissions';
import { apiGet, apiPatch, apiPost, apiDelete } from '../../lib/api/client';
import UserAccessModal from '../../components/UserAccessModal';
import FeatureStoryBanner from '../../components/FeatureStoryBanner';
import { getFeatureStory } from '../../data/stories';
import { Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function UsersAdmin() {
  const { user } = useAuth();
  const { push } = useToast();

  const canView = hasPermission(user, Permissions.USERS_VIEW);
  const canCreate = hasPermission(user, Permissions.USERS_CREATE);
  const canReset = hasPermission(user, Permissions.USERS_RESET_PASSWORD);
  const canChangePassword = hasPermission(user, Permissions.USERS_CHANGE_PASSWORD);
  const canEditRoles = hasPermission(user, Permissions.USERS_ROLE_EDIT);
  const canEditScope = hasPermission(user, Permissions.USERS_SCOPE_EDIT);
  const canEditPerms = hasPermission(user, Permissions.USERS_PERMISSION_EDIT);
  const canDelete = hasPermission(user, Permissions.USERS_DELETE);
  const isSuperAdmin = Boolean(
    user?.roleNames?.includes('super_admin') || String(user?.role || '') === 'super_admin'
  );

  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [rolesList, setRolesList] = useState([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ username: '', password: '', role: 'viewer' });

  const [resetOpen, setResetOpen] = useState(false);
  const [resetUser, setResetUser] = useState(null);
  const [tempPassword, setTempPassword] = useState(null);
  const [resetLoading, setResetLoading] = useState(false);

  // Change Password modal state (superadmin only)
  const [changePassOpen, setChangePassOpen] = useState(false);
  const [changePassUser, setChangePassUser] = useState(null);
  const [changePassForm, setChangePassForm] = useState('');
  const [changePassLoading, setChangePassLoading] = useState(false);

  // RBAC v2: Edit Access modal
  const [accessModalOpen, setAccessModalOpen] = useState(false);
  const [accessModalUser, setAccessModalUser] = useState(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteUser, setDeleteUser] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const load = useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    try {
      const res = await apiGet('/users', { params: { page, pageSize, q: q.trim() || undefined } });
      setUsers(res.data?.users || []);
      setPagination(res.meta?.pagination || null);
    } catch (error) {
      push({
        variant: 'error',
        title: 'Failed to load users',
        message: error?.message || 'Unexpected error',
      });
    } finally {
      setLoading(false);
    }
  }, [canView, page, pageSize, q, push]);

  // Fetch roles for the dropdown
  useEffect(() => {
    if (!canCreate && !canEditRoles) return;
    apiGet('/roles')
      .then((res) => {
        setRolesList(res.data?.roles || []);
      })
      .catch((err) => {
        console.error('Failed to load roles:', err);
      });
  }, [canCreate, canEditRoles]);

  const assignableRoles = useMemo(() => {
    if (isSuperAdmin) return rolesList;
    return rolesList.filter((r) => r.name !== 'admin' && r.name !== 'super_admin');
  }, [rolesList, isSuperAdmin]);

  useEffect(() => {
    if (assignableRoles.length === 0) return;
    if (!assignableRoles.some((r) => r.name === createForm.role)) {
      setCreateForm((prev) => ({ ...prev, role: assignableRoles[0].name }));
    }
  }, [assignableRoles, createForm.role]);

  useEffect(() => {
    load();
  }, [load]);

  const columns = useMemo(
    () => [
      { header: 'Username', accessor: 'username' },
      {
        header: 'Roles',
        className: 'w-1/4',
        render: (row) => {
          const roles = row.roles || [];
          if (roles.length === 0) {
            return <span className="text-xs text-muted-foreground">—</span>;
          }
          return (
            <div className="flex flex-wrap gap-1">
              {roles.slice(0, 3).map((r) => (
                <span
                  key={r.id || r.name}
                  className="inline-flex items-center rounded-md border border-border bg-muted px-1.5 py-0.5 text-xs"
                >
                  {r.label || r.name}
                </span>
              ))}
              {roles.length > 3 && (
                <span className="text-xs text-muted-foreground">+{roles.length - 3}</span>
              )}
            </div>
          );
        },
      },
      {
        header: 'Branch Scope',
        className: 'w-1/6 text-center',
        render: (row) => {
          const scope = row.branchScope;
          if (scope === 'ALL') {
            return <span className="text-xs text-green-600 font-medium">ALL</span>;
          }
          if (Array.isArray(scope)) {
            return <span className="text-xs">{scope.length} branches</span>;
          }
          return <span className="text-xs text-muted-foreground">—</span>;
        },
      },
      {
        header: 'Overrides',
        className: 'w-1/6 text-center',
        render: (row) => {
          const ov = row.overridesCount || {};
          const allow = ov.allow || 0;
          const deny = ov.deny || 0;
          if (allow === 0 && deny === 0) {
            return <span className="text-xs text-muted-foreground">—</span>;
          }
          return (
            <div className="flex gap-2 justify-center text-xs">
              {allow > 0 && <span className="text-green-600">+{allow}</span>}
              {deny > 0 && <span className="text-red-600">-{deny}</span>}
            </div>
          );
        },
      },
      {
        header: 'Actions',
        className: 'min-w-[320px] text-center',
        render: (row) => {
          const isDemoUser =
            user?.isDemo || user?.roleNames?.includes('demo') || user?.role === 'demo';
          const canManageAccess = canEditRoles || canEditScope || canEditPerms;

          const withDemoCheck = (action) => (e) => {
            e.stopPropagation();
            if (isDemoUser) {
              push({
                variant: 'warning',
                title: 'Demo Account',
                message: 'This action is restricted in the demo environment.',
              });
              return;
            }
            action();
          };

          return (
            <div className="flex flex-row flex-nowrap items-center justify-center gap-2">
              {(canManageAccess || isDemoUser) && (
                <Button
                  size="sm"
                  variant="secondary"
                  className={isDemoUser ? 'opacity-50 cursor-not-allowed' : ''}
                  onClick={withDemoCheck(() => {
                    setAccessModalUser(row);
                    setAccessModalOpen(true);
                  })}
                >
                  Edit Access
                </Button>
              )}
              {(canChangePassword || isDemoUser) && (
                <Button
                  size="sm"
                  variant="secondary"
                  className={isDemoUser ? 'opacity-50 cursor-not-allowed' : ''}
                  onClick={withDemoCheck(() => {
                    setChangePassUser(row);
                    setChangePassForm('');
                    setChangePassOpen(true);
                  })}
                >
                  Change Pass
                </Button>
              )}
              {(canReset || isDemoUser) && (
                <Button
                  size="sm"
                  variant="destructive"
                  className={isDemoUser ? 'opacity-50 cursor-not-allowed' : ''}
                  onClick={withDemoCheck(() => {
                    setResetUser(row);
                    setTempPassword(null);
                    setResetOpen(true);
                  })}
                >
                  Reset
                </Button>
              )}
              {(canDelete || isDemoUser) && (
                <Button
                  size="sm"
                  variant="destructive"
                  className={isDemoUser ? 'opacity-50 cursor-not-allowed' : ''}
                  onClick={withDemoCheck(() => {
                    setDeleteUser(row);
                    setDeleteOpen(true);
                  })}
                >
                  Delete
                </Button>
              )}
            </div>
          );
        },
      },
    ],
    [canReset, canChangePassword, canEditRoles, canEditScope, canEditPerms, canDelete]
  );

  const handleCreate = async () => {
    if (!canCreate) return;
    const payload = {
      username: createForm.username.trim(),
      password: createForm.password,
      role: createForm.role,
    };

    setLoading(true);
    try {
      const res = await apiPost('/users', payload);
      push({
        variant: 'success',
        title: 'User created',
        message: res.data?.user?.username || 'Created',
      });
      setCreateForm({ username: '', password: '', role: 'viewer' });
      setCreateOpen(false);
      setPage(1);
      await load();
    } catch (error) {
      push({
        variant: 'error',
        title: 'Create failed',
        message: error?.message || 'Unexpected error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!canReset || !resetUser) return;
    setResetLoading(true);
    try {
      const res = await apiPost(`/users/${resetUser.id}/reset-password`, { confirm: true });
      const pwd = res.data?.tempPassword;
      setTempPassword(pwd || null);
    } catch (error) {
      push({
        variant: 'error',
        title: 'Reset failed',
        message: error?.message || 'Unexpected error',
      });
      setResetOpen(false);
      setResetUser(null);
    } finally {
      setResetLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!canChangePassword || !changePassUser || !changePassForm) return;
    if (changePassForm.length < 8) {
      push({
        variant: 'warning',
        title: 'Password too short',
        message: 'Password must be at least 8 characters',
      });
      return;
    }
    setChangePassLoading(true);
    try {
      await apiPatch(`/users/${changePassUser.id}/password`, { newPassword: changePassForm });
      push({
        variant: 'success',
        title: 'Password changed',
        message: `Password updated for ${changePassUser.username}`,
      });
      setChangePassOpen(false);
      setChangePassUser(null);
      setChangePassForm('');
    } catch (error) {
      push({
        variant: 'error',
        title: 'Change failed',
        message: error?.message || 'Unexpected error',
      });
    } finally {
      setChangePassLoading(false);
    }
  };

  const closeChangePasswordModal = () => {
    setChangePassOpen(false);
    setChangePassUser(null);
    setChangePassForm('');
  };

  const handleDelete = async () => {
    if (!canDelete || !deleteUser) return;
    setDeleteLoading(true);
    try {
      await apiDelete(`/users/${deleteUser.id}`);
      push({
        variant: 'success',
        title: 'User deleted',
        message: `User ${deleteUser.username} has been deleted`,
      });
      setDeleteOpen(false);
      setDeleteUser(null);
      await load();
    } catch (error) {
      push({
        variant: 'error',
        title: 'Delete failed',
        message: error?.message || 'Unexpected error',
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  if (!canView) {
    return (
      <PageShell>
        <FeatureStoryBanner story={getFeatureStory('accounts')} />
        <PageHeader title="Users" subtitle="Account management" />
        <Card className="p-6">
          <CardContent>
            <div className="text-sm text-muted-foreground">
              You do not have access to manage users.
            </div>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <FeatureStoryBanner story={getFeatureStory('accounts')} />
      <PageHeader
        title="Users"
        subtitle="Manage accounts, roles, and access permissions"
        actions={
          canCreate ? (
            <Button onClick={() => setCreateOpen((v) => !v)} variant="default">
              {createOpen ? 'Close' : 'Add User'}
            </Button>
          ) : null
        }
      />
      <Card className="p-4">
        <CardContent>
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="w-full md:max-w-sm">
              <label className="text-xs text-muted-foreground">Search username</label>
              <div className="relative w-full">
                <span className="absolute left-3 inset-y-0 flex items-center text-muted-foreground material-symbols-outlined text-xl leading-none pointer-events-none">
                  search
                </span>
                <Input
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search..."
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      {createOpen && (
        <Card className="p-4">
          <CardContent>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div>
                <label className="text-xs text-muted-foreground">Username</label>
                <Input
                  value={createForm.username}
                  onChange={(e) => setCreateForm((s) => ({ ...s, username: e.target.value }))}
                  placeholder="username"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Password</label>
                <Input
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm((s) => ({ ...s, password: e.target.value }))}
                  placeholder="temporary password"
                />
                <div className="mt-1 text-xs text-muted-foreground">
                  Min 8 chars with uppercase, lowercase, number, and special character.
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Role</label>
                <Select
                  value={createForm.role}
                  onValueChange={(val) => {
                    const e = {
                      target: {
                        value: val,
                      },
                    };

                    return setCreateForm((s) => ({ ...s, role: e.target.value }));
                  }}
                  disabled={assignableRoles.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Role" />
                  </SelectTrigger>
                  <SelectContent>
                    {assignableRoles.map((r) => (
                      <SelectItem key={r.id} value={r.name}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Button
                onClick={handleCreate}
                disabled={loading || !createForm.username.trim() || !createForm.password}
              >
                <Loader2 className="animate-spin mr-2" />
                Create
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      <DataTable
        columns={columns}
        data={users}
        loading={loading}
        pagination={pagination}
        onPageChange={(next) => setPage(next)}
      />
      {/* RBAC v2: Edit Access Modal */}
      <UserAccessModal
        open={accessModalOpen}
        user={accessModalUser}
        canEditRoles={canEditRoles}
        canEditScope={canEditScope}
        canEditPerms={canEditPerms}
        onClose={() => {
          setAccessModalOpen(false);
          setAccessModalUser(null);
          load(); // Reload after closing
        }}
        onSave={() => {
          load();
        }}
      />
      <ConfirmDialog
        open={resetOpen}
        title="Reset password"
        desc={resetUser ? `Generate random password for ${resetUser.username}?` : ''}
        confirmText={tempPassword ? 'Done' : 'Reset'}
        danger={!tempPassword}
        onClose={() => {
          setResetOpen(false);
          setResetUser(null);
          setTempPassword(null);
        }}
        onConfirm={async () => {
          if (tempPassword) {
            setResetOpen(false);
            setResetUser(null);
            setTempPassword(null);
            await load();
            return;
          }
          await handleResetPassword();
        }}
        confirmHint={
          tempPassword ? (
            <div className="mt-3 space-y-2">
              <div className="text-xs text-muted-foreground">
                Temporary password (copy before closing):
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 rounded-md border border-border bg-background px-3 py-2 font-mono text-sm text-foreground select-all">
                  {tempPassword}
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(String(tempPassword));
                      push({
                        variant: 'success',
                        title: 'Copied',
                        message: 'Password copied to clipboard',
                      });
                    } catch {
                      push({
                        variant: 'warning',
                        title: 'Copy failed',
                        message: 'Clipboard not available',
                      });
                    }
                  }}
                >
                  Copy
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">
              This will generate a new random temporary password.
            </div>
          )
        }
        confirmDisabled={resetLoading}
      />
      <ConfirmDialog
        open={deleteOpen}
        title="Delete User"
        desc={
          deleteUser
            ? `Are you sure you want to delete user "${deleteUser.username}"? This action cannot be undone.`
            : ''
        }
        confirmText="Delete Account"
        danger
        onClose={() => {
          setDeleteOpen(false);
          setDeleteUser(null);
        }}
        onConfirm={handleDelete}
        confirmDisabled={deleteLoading}
      />
      <Modal
        open={changePassOpen}
        onClose={closeChangePasswordModal}
        title={`Change Password for ${changePassUser?.username || ''}`}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">New Password</label>
            <Input
              type="password"
              value={changePassForm}
              onChange={(e) => setChangePassForm(e.target.value)}
              placeholder="Enter new password (min 8 chars)"
              minLength={8}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={closeChangePasswordModal}>
              Cancel
            </Button>
            <Button
              className="flex-1"
              disabled={changePassLoading || changePassForm.length < 8}
              onClick={handleChangePassword}
            >
              {changePassLoading ? 'Changing...' : 'Change Password'}
            </Button>
          </div>
        </div>
      </Modal>
    </PageShell>
  );
}
