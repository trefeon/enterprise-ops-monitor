import React from 'react';
import { Play, Hourglass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DashboardLayout, DashboardPageHeader } from '@/components/base/dashboard-layout';
import FeatureStoryBanner from '../../components/FeatureStoryBanner';
import { getFeatureStory } from '../../data/stories';
import { useAfterHours } from './hooks/useAfterHours';
import MonitorTab from './components/MonitorTab';

export default function AfterHours() {
  const { state, derived, actions } = useAfterHours();
  const { checking } = state;
  const { handleRunCheck } = actions;

  return (
    <DashboardLayout>
      <FeatureStoryBanner story={getFeatureStory('after-hours')} />
      <DashboardPageHeader
        title="Daily Monitor"
        subtitle="Detect store computers still online after operational hours"
        actions={
          <Button onClick={handleRunCheck}>
            {checking ? (
              <Hourglass className="animate-spin mr-2 size-4" aria-hidden="true" />
            ) : (
              <Play className="mr-2 size-4" aria-hidden="true" />
            )}
            {checking ? 'Running...' : 'Run Check Now'}
          </Button>
        }
      />
      <MonitorTab state={state} derived={derived} actions={actions} />
    </DashboardLayout>
  );
}
