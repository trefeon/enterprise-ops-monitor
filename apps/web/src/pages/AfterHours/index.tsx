// @ts-nocheck
import React, { Suspense, lazy } from 'react';
import { Moon, FileText, Play, Hourglass, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import PageShell from '@/components/shared/PageShell';
import PageHeader from '@/components/shared/PageHeader';
import FeatureStoryBanner from '../../components/FeatureStoryBanner';
import { getFeatureStory } from '../../data/stories';
import { useAfterHours } from './hooks/useAfterHours';
import MonitorTab from './components/MonitorTab';

const AfterHoursReport = lazy(() => import('../AfterHoursReport'));

export default function AfterHours() {
  const { state, derived, actions } = useAfterHours();
  const { activeTab, checking } = state;
  const { setActiveTab, handleRunCheck } = actions;

  return (
    <PageShell>
      <FeatureStoryBanner story={getFeatureStory('after-hours')} />
      <PageHeader
        title="After-Hours PC Monitor"
        subtitle="Detect store computers still online after operational hours"
        actions={
          activeTab === 'monitor' ? (
            <Button onClick={handleRunCheck}>
              {checking ? (
                <Hourglass className="animate-spin mr-2 size-4" aria-hidden="true" />
              ) : (
                <Play className="mr-2 size-4" aria-hidden="true" />
              )}
              {checking ? 'Running...' : 'Run Check Now'}
            </Button>
          ) : null
        }
      />
      <Card className="p-0">
        <CardContent className="p-1">
          <div className="grid gap-1 sm:inline-grid sm:grid-cols-2">
            <Button
              type="button"
              variant={activeTab === 'monitor' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('monitor')}
              className="justify-start sm:justify-center"
            >
              <Moon className="size-4" aria-hidden="true" />
              Daily Monitor
            </Button>
            <Button
              type="button"
              variant={activeTab === 'report' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('report')}
              className="justify-start sm:justify-center"
            >
              <FileText className="size-4" aria-hidden="true" />
              Monthly Report
            </Button>
          </div>
        </CardContent>
      </Card>
      {activeTab === 'report' ? (
        <Suspense
          fallback={
            <div className="flex justify-center items-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
            </div>
          }
        >
          <AfterHoursReport />
        </Suspense>
      ) : (
        <MonitorTab state={state} derived={derived} actions={actions} />
      )}
    </PageShell>
  );
}
