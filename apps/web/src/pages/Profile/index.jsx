import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader';
import PageShell from '../../components/ui/PageShell';
import { SectionCard } from '../../components/ui/SectionCard';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui/ToastContext';
import { hasPermission, Permissions } from '../../lib/auth/permissions';
import { apiPatch } from '../../lib/api/client';
import FeatureStoryBanner from '../../components/FeatureStoryBanner';
import { getFeatureStory } from '../../data/stories';

function getInitials(username, role) {
  const source = (username || role || '').trim();
  if (!source) return '??';

  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase();
  }

  const compact = source.replace(/[^a-zA-Z0-9]/g, '');
  return compact.substring(0, 2).toUpperCase() || '??';
}

const Profile = () => {
  const { user, logout } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const initials = useMemo(
    () => getInitials(user?.username, user?.role),
    [user?.username, user?.role]
  );
  const role = String(user?.role || 'viewer');
  const username = String(user?.username || '');
  const canManageAccounts = hasPermission(user, Permissions.USERS_VIEW);
  const isEnvAdmin = user?.id === 'env_admin';

  const closePasswordModal = () => {
    setShowPasswordModal(false);
    setError('');
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setError('');

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
      const res = await apiPatch('/auth/me/password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });

      if (res.ok) {
        push({
          variant: 'success',
          title: 'Password Changed',
          message: 'Your password has been updated successfully. Please log in again.',
        });
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
            <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg ring-2 ring-ring/30">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="text-base font-semibold text-foreground truncate">
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
            {!isEnvAdmin && (
              <Button variant="secondary" onClick={() => setShowPasswordModal(true)}>
                <span className="material-symbols-outlined text-base mr-1">key</span>
                Change Password
              </Button>
            )}
            {canManageAccounts && (
              <Button variant="primary" onClick={() => navigate('/admin/users')}>
                Account Management
              </Button>
            )}
            <Button variant="danger" onClick={() => navigate('/logout')}>
              Logout
            </Button>
          </div>
        </SectionCard>
      </div>

      <Modal open={showPasswordModal} onClose={closePasswordModal} title="Change Password">
        <form onSubmit={handlePasswordChange} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg">error</span>
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
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                  }
                  placeholder="Enter current password"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  New Password
                </label>
                <Input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                  }
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
                  onChange={(e) =>
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
                <Button type="submit" variant="primary" className="flex-1" disabled={loading}>
                  {loading ? 'Changing...' : 'Change Password'}
                </Button>
              </div>
            </form>
      </Modal>
    </PageShell>
  );
};

export default Profile;
