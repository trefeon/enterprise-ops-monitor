import React from 'react';
import { Play, Hourglass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PageShell from '@/components/shared/PageShell';
import PageHeader from '@/components/shared/PageHeader';
import FeatureStoryBanner from '../../components/FeatureStoryBanner';
import { getFeatureStory } from '../../data/stories';
import { useAfterHours } from './hooks/useAfterHours';
import MonitorTab from './components/MonitorTab';

export default function AfterHours() {
  const { state, derived, actions } = useAfterHours();
  const { checking } = state;
  const { handleRunCheck } = actions;

  return (
    <PageShell debugLabel="After-Hours">
      <FeatureStoryBanner story={getFeatureStory('after-hours')} />
      <PageHeader
        title="After-Hours PC Monitor"
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
    </PageShell>
  );
}
