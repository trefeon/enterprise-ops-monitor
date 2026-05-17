import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/ui/PageHeader';
import PageShell from '../components/ui/PageShell';
import { SectionCard } from '../components/ui/SectionCard';
import Button from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/ToastContext';

const Logout = () => {
  const { logout, api } = useAuth();
  const navigate = useNavigate();
  const { push } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await api.post('/auth/logout');
    } catch (error) {
      push({
        variant: 'warning',
        title: 'Logout failed',
        message: error.message || 'Continuing with local logout.',
      });
    } finally {
      logout();
      navigate('/login');
      setLoading(false);
    }
  };

  return (
    <PageShell>
      <div className="space-y-6 max-w-2xl w-full">
        <PageHeader title="Logout" subtitle="End your current session safely." />
        <SectionCard>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              You are about to sign out from Enterprise Operations Monitor. Any unsaved changes will
              be lost.
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => navigate('/')}>
                Cancel
              </Button>
              <Button variant="danger" onClick={() => setOpen(true)} loading={loading}>
                Confirm Logout
              </Button>
            </div>
          </div>
        </SectionCard>
      </div>

      <ConfirmDialog
        open={open}
        title="Confirm logout"
        desc="Are you sure you want to end this session?"
        confirmText="Logout"
        danger
        onConfirm={handleConfirm}
        onClose={() => setOpen(false)}
        confirmDisabled={loading}
      />
    </PageShell>
  );
};

export default Logout;
