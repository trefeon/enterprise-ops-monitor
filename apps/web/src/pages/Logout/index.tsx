import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { PageTemplate, SectionCard } from '@/components/template';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
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
    <PageTemplate
      story={getFeatureStory('logout')}
      title="Logout"
      subtitle="End your current session safely."
      constrained
    >
      <SectionCard>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            You are about to sign out from Enterprise Ops Starter. Any unsaved changes will be
            lost.
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => navigate('/app')}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => setOpen(true)} disabled={loading}>
              Confirm Logout
            </Button>
          </div>
        </div>
      </SectionCard>

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
    </PageTemplate>
  );
};

export default Logout;
