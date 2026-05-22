import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/shared/PageHeader';
import PageShell from '@/components/shared/PageShell';
import { SectionCard } from '@/components/shared/SectionCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Modal from '@/components/shared/Modal';
import { useAuth } from '@/context/AuthContext';
import { hasPermission, Permissions } from '@/lib/auth/permissions';
import { apiPatch } from '@/lib/api/client';
import FeatureStoryBanner from '@/components/FeatureStoryBanner';
import { getFeatureStory } from '@/data/stories';
import { AlertCircle, Key, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { ApiResponse } from '@/lib/api/types';

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

function getInitials(username: string | undefined | null, role: string | undefined | null): string {
  const source = (username || role || '').trim();
  if (!source) return '??';

  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase();
  }

  const compact = source.replace(/[^a-zA-Z0-9]/g, '');
  return compact.substring(0, 2).toUpperCase() || '??';
}

const Profile: React.FC = () => {
  const { user, logout } = useAuth() as any;
  const navigate = useNavigate();

  const [showPasswordModal, setShowPasswordModal] = useState<boolean>(false);
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const initials = useMemo<string>(
    () => getInitials(user?.username, user?.role),
    [user?.username, user?.role]
  );
  const role = String(user?.role || 'viewer');
  const username = String(user?.username || '');
  const canManageAccounts = hasPermission(user, Permissions.USERS_VIEW);
  const isEnvAdmin = user?.id === 'env_admin';

  const closePasswordModal = (): void => {
    setShowPasswordModal(false);
    setError('');
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
  };

  const handlePasswordChange = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError('');

    if (user?.isDemo || user?.roleNames?.includes('demo') || user?.role === 'demo') {
      setError('This action is not available in the demo account');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setError('New password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      const res = (await apiPatch('/auth/me/password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      })) as ApiResponse;

      if (res.ok) {
        toast.success('Password Changed', { description: 'Your password has been updated successfully. Please log in again.' });
        setShowPasswordModal(false);
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        // Log out user after password change
        setTimeout(() => {
          logout();
          navigate('/login');
        }, 1500);
      } else {
        setError(res.error?.message || 'Failed to change password');
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell>
      <FeatureStoryBanner story={getFeatureStory('profile')} />

      <div className="space-y-6 max-w-2xl w-full">
        <PageHeader title="Profile" subtitle="Basic account information" />

        <SectionCard>
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-primary text-lg font-bold text-primary-foreground ring-2 ring-ring/20">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="text-base font-semibold text-foreground break-words">
                {username || 'Admin'}
              </div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide">{role}</div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-muted-foreground">Username</div>
              <div className="text-sm font-medium text-foreground">{username || '-'}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Role</div>
              <div className="text-sm font-medium text-foreground">{role}</div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => navigate('/')}>
              Back
            </Button>
            {!isEnvAdmin &&
              !user?.isDemo &&
              !user?.roleNames?.includes('demo') &&
              user?.role !== 'demo' && (
                <Button variant="secondary" onClick={() => setShowPasswordModal(true)}>
                  <Key className="size-4" />
                  Change Password
                </Button>
              )}
            {canManageAccounts && (
              <Button onClick={() => navigate('/admin/users')}>Account Management</Button>
            )}
            <Button variant="destructive" onClick={() => navigate('/logout')}>
              Logout
            </Button>
          </div>
        </SectionCard>
      </div>

      <Modal open={showPasswordModal} onClose={closePasswordModal} title="Change Password">
        <form onSubmit={handlePasswordChange} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-status-error/20 bg-status-error/10 p-3 text-sm text-status-error">
              <AlertCircle className="size-4" />
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Current Password
            </label>
            <Input
              type="password"
              value={passwordForm.currentPassword}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
              }
              placeholder="Enter current password"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">New Password</label>
            <Input
              type="password"
              value={passwordForm.newPassword}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              placeholder="Enter new password (min 8 chars)"
              required
              minLength={8}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Confirm New Password
            </label>
            <Input
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
              }
              placeholder="Confirm new password"
              required
              minLength={8}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={closePasswordModal}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              <Loader2 className="animate-spin mr-2" />
              {loading ? 'Changing...' : 'Change Password'}
            </Button>
          </div>
        </form>
      </Modal>
    </PageShell>
  );
};

export default Profile;
