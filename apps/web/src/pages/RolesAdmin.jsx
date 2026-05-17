import React, { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '../lib/api/client';
import PageShell from '../components/ui/PageShell';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Guard } from '../components/auth/Guard';
import { useToast } from '../components/ui/ToastContext';
import { useAuth } from '../context/AuthContext';
import { PermissionGroups } from '../lib/auth/permissions';
import FeatureStoryBanner from '../components/FeatureStoryBanner';
import { getFeatureStory } from '../data/stories';

export default function RolesAdmin() {
  const { user } = useAuth();
  const { push } = useToast();

  const isDemoUser = user?.isDemo || user?.roleNames?.includes('demo') || user?.role === 'demo';
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    label: '',
    description: '',
    permissions: [],
  });

  const loadRoles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiGet('/roles');
      if (res.ok) {
        setRoles(res.data.roles || []);
      } else {
        push({
          variant: 'error',
          title: 'Error',
          message: res.error?.message || 'Failed to load roles',
        });
      }
    } catch {
      push({ variant: 'error', title: 'Error', message: 'Failed to load roles' });
    } finally {
      setLoading(false);
    }
  }, [push]);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  const handleCreate = () => {
    if (isDemoUser) {
      push({ variant: 'warning', title: 'Demo Account', message: 'This action is not available in the demo account.' });
      return;
    }
    setSelectedRole(null);
    setEditForm({ name: '', label: '', description: '', permissions: [] });
    setIsEditing(true);
  };

  const handleEdit = (role) => {
    if (isDemoUser) {
      push({ variant: 'warning', title: 'Demo Account', message: 'This action is not available in the demo account.' });
      return;
    }
    setSelectedRole(role);
    setEditForm({
      name: role.name,
      label: role.label,
      description: role.description || '',
      permissions: role.permissions || [],
    });
    setIsEditing(true);
  };

  const handleDelete = async (role) => {
    if (isDemoUser) {
      push({ variant: 'warning', title: 'Demo Account', message: 'This action is not available in the demo account.' });
      return;
    }
    if (role.is_system) {
      push({ variant: 'error', title: 'Error', message: 'Cannot delete system role' });
      return;
    }
    if (!confirm(`Delete role "${role.label}"? This cannot be undone.`)) return;

    try {
      const res = await apiDelete(`/roles/${role.id}`);
      if (res.ok) {
        push({ variant: 'success', title: 'Success', message: 'Role deleted' });
        loadRoles();
      } else {
        push({
          variant: 'error',
          title: 'Error',
          message: res.error?.message || 'Failed to delete',
        });
      }
    } catch {
      push({ variant: 'error', title: 'Error', message: 'Failed to delete role' });
    }
  };

  const handleSave = async () => {
    if (isDemoUser) {
      push({ variant: 'warning', title: 'Demo Account', message: 'This action is not available in the demo account.' });
      return;
    }
    const payload = {
      label: editForm.label,
      description: editForm.description || null,
      permissions: editForm.permissions,
    };

    try {
      let res;
      if (selectedRole) {
        res = await apiPut(`/roles/${selectedRole.id}`, payload);
      } else {
        res = await apiPost('/roles', { ...payload, name: editForm.name });
      }

      if (res.ok) {
        push({
          variant: 'success',
          title: 'Success',
          message: selectedRole ? 'Role updated' : 'Role created',
        });
        setIsEditing(false);
        loadRoles();
      } else {
        push({ variant: 'error', title: 'Error', message: res.error?.message || 'Failed to save' });
      }
    } catch {
      push({ variant: 'error', title: 'Error', message: 'Failed to save role' });
    }
  };

  const togglePermission = (perm) => {
    setEditForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(perm)
        ? prev.permissions.filter((p) => p !== perm)
        : [...prev.permissions, perm],
    }));
  };

  if (loading) {
    return (
      <PageShell>
        <FeatureStoryBanner story={getFeatureStory('roles')} />
        <PageHeader title="Roles Management" subtitle="Manage system and custom roles" />
        <div className="flex justify-center items-center h-64">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <FeatureStoryBanner story={getFeatureStory('roles')} />

      <PageHeader
        title="Roles Management"
        subtitle="Create and manage roles with permissions"
        actions={
          <Guard user={user} permission="ROLES_EDIT">
            <Button onClick={handleCreate} variant="primary">
              <span className="material-symbols-outlined text-lg mr-1">add</span>
              Create Role
            </Button>
          </Guard>
        }
      />

      {/* Role Editor Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-2xl max-h-screen overflow-y-auto m-4">
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4">
                {selectedRole ? `Edit Role: ${selectedRole.label}` : 'Create New Role'}
              </h2>

              <div className="space-y-4">
                {!selectedRole && (
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Name (lowercase, underscores)
                    </label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          name: e.target.value.toLowerCase().replace(/[^a-z_]/g, ''),
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"
                      placeholder="custom_role"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-1">Label</label>
                  <input
                    type="text"
                    value={editForm.label}
                    onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"
                    placeholder="Custom Role"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground resize-none"
                    rows={2}
                    placeholder="Role description..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Permissions</label>
                  <div className="space-y-4 max-h-64 overflow-y-auto border border-border rounded-lg p-3">
                    {Object.entries(PermissionGroups).map(([group, perms]) => (
                      <div key={group}>
                        <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                          {group}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {perms.map((perm) => (
                            <label
                              key={perm}
                              className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs cursor-pointer transition-colors ${
                                editForm.permissions.includes(perm)
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={editForm.permissions.includes(perm)}
                                onChange={() => togglePermission(perm)}
                                className="sr-only"
                              />
                              {perm}
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button variant="secondary" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={handleSave}>
                  Save
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Roles List */}
      <div className="grid gap-4">
        {roles.map((role) => (
          <Card key={role.id} className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-foreground">{role.label}</h3>
                  {role.is_system && (
                    <span className="px-1.5 py-0.5 text-xs rounded bg-primary/10 text-primary">
                      System
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">({role.name})</span>
                </div>
                {role.description && (
                  <p className="text-sm text-muted-foreground mt-1">{role.description}</p>
                )}
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  <span>{role.permissions?.length || 0} permissions</span>
                  <span>{role.userCount || 0} users</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {(role.permissions || []).slice(0, 8).map((p) => (
                    <span
                      key={p}
                      className="px-1.5 py-0.5 text-xs rounded bg-secondary text-secondary-foreground"
                    >
                      {p}
                    </span>
                  ))}
                  {(role.permissions?.length || 0) > 8 && (
                    <span className="px-1.5 py-0.5 text-xs text-muted-foreground">
                      +{role.permissions.length - 8} more
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Guard user={user} permission="ROLES_EDIT">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(role)}>
                    <span className="material-symbols-outlined text-lg">edit</span>
                  </Button>
                </Guard>
                {!role.is_system && (
                  <Guard user={user} permission="ROLES_EDIT">
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(role)}>
                      <span className="material-symbols-outlined text-lg text-destructive">
                        delete
                      </span>
                    </Button>
                  </Guard>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}
