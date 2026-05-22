import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageShell } from '@/components/shared/PageShell';
import { SectionCard } from '@/components/shared/SectionCard';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import FeatureStoryBanner from '../../components/FeatureStoryBanner';
import { getFeatureStory } from '../../data/stories';

const Logout: React.FC = () => {
  const { logout, api } = useAuth() as any;
  const navigate = useNavigate();
  const [open, setOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  const handleConfirm = async (): Promise<void> => {
    setLoading(true);
    try {
      await api.post('/auth/logout');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Continuing with local logout.';
      toast.warning('Logout failed', { description: message });
    } finally {
      logout();
      navigate('/login');
      setLoading(false);
    }
  };

  return (
    <PageShell>
      <FeatureStoryBanner story={getFeatureStory('logout')} />

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
              <Button variant="destructive" onClick={() => setOpen(true)} disabled={loading}>
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
