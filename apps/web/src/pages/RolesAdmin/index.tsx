// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '../../lib/api/client';
import { PageShell } from '@/components/shared/PageShell';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Guard } from '../../components/auth/Guard';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import { PermissionGroups } from '../../lib/auth/permissions';
import FeatureStoryBanner from '../../components/FeatureStoryBanner';
import { getFeatureStory } from '../../data/stories';
import { Card, CardContent } from '@/components/ui/card';
import { Edit3, Loader2, Plus, Trash2 } from 'lucide-react';

export default function RolesAdmin() {
  const { user } = useAuth();
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
        toast.error('Error', {
          description: res.error?.message || 'Failed to load roles',
        });
      }
    } catch {
      toast.error('Error', { description: 'Failed to load roles' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  const handleCreate = () => {
    if (isDemoUser) {
      toast.warning('Demo Account', {
        description: 'This action is not available in the demo account.',
      });
      return;
    }
    setSelectedRole(null);
    setEditForm({ name: '', label: '', description: '', permissions: [] });
    setIsEditing(true);
  };

  const handleEdit = (role) => {
    if (isDemoUser) {
      toast.warning('Demo Account', {
        description: 'This action is not available in the demo account.',
      });
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
      toast.warning('Demo Account', {
        description: 'This action is not available in the demo account.',
      });
      return;
    }
    if (role.is_system) {
      toast.error('Error', { description: 'Cannot delete system role' });
      return;
    }
    if (!confirm(`Delete role "${role.label}"? This cannot be undone.`)) return;

    try {
      const res = await apiDelete(`/roles/${role.id}`);
      if (res.ok) {
        toast.success('Success', { description: 'Role deleted' });
        loadRoles();
      } else {
        toast.error('Error', {
          description: res.error?.message || 'Failed to delete',
        });
      }
    } catch {
      toast.error('Error', { description: 'Failed to delete role' });
    }
  };

  const handleSave = async () => {
    if (isDemoUser) {
      toast.warning('Demo Account', {
        description: 'This action is not available in the demo account.',
      });
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
        toast.success('Success', {
          description: selectedRole ? 'Role updated' : 'Role created',
        });
        setIsEditing(false);
        loadRoles();
      } else {
        toast.error('Error', { description: res.error?.message || 'Failed to save' });
      }
    } catch {
      toast.error('Error', { description: 'Failed to save role' });
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
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
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
            <Button onClick={handleCreate}>
              <Plus className="size-4" />
              Create Role
            </Button>
          </Guard>
        }
      />
      {/* Role Editor Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm">
          <Card className="w-full max-w-2xl max-h-screen overflow-y-auto m-4">
            <CardContent>
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
                      <Input
                        type="text"
                        value={editForm.name}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            name: e.target.value.toLowerCase().replace(/[^a-z_]/g, ''),
                          })
                        }
                        className="px-3"
                        placeholder="custom_role"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium mb-1">Label</label>
                    <Input
                      type="text"
                      value={editForm.label}
                      onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
                      className="px-3"
                      placeholder="Custom Role"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Description</label>
                    <Textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      className="resize-none"
                      rows={2}
                      placeholder="Role description..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Permissions</label>
                    <div className="max-h-64 space-y-4 overflow-y-auto rounded-lg border border-border p-3">
                      {Object.entries(PermissionGroups).map(([group, perms]) => (
                        <div key={group}>
                          <div className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                            {group}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {perms.map((perm) => (
                              <Button
                                key={perm}
                                type="button"
                                size="sm"
                                variant={editForm.permissions.includes(perm) ? 'default' : 'secondary'}
                                onClick={() => togglePermission(perm)}
                                className={`h-7 rounded px-2 py-1 text-xs ${
                                  editForm.permissions.includes(perm)
                                    ? ''
                                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                                }`}
                              >
                                {perm}
                              </Button>
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
                  <Button onClick={handleSave}>Save</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      {/* Roles List */}
      <div className="grid gap-4">
        {roles.map((role) => (
          <Card key={role.id} className="p-4">
            <CardContent>
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
                      <Edit3 className="size-4" />
                    </Button>
                  </Guard>
                  {!role.is_system && (
                    <Guard user={user} permission="ROLES_EDIT">
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(role)}>
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </Guard>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}
