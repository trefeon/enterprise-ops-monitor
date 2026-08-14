import React, { useMemo } from 'react';
import { Download, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageTemplate } from '@/components/template';
import { getFeatureStory } from '../../data/stories';
import { useAfterHoursReport } from './hooks/useAfterHoursReport';
import { WhatsappTargetSection } from './components/WhatsappTargetSection';
import { ReportToolbar } from './components/ReportToolbar';
import { ActiveFilters } from './components/ActiveFilters';
import { AvailableMonthsChips } from './components/AvailableMonthsChips';
import { StatsCards } from './components/StatsCards';
import { RankingTable } from './components/RankingTable';
import {
  BRANCH_OPTIONS,
  LIMIT_OPTIONS,
  TOOLBAR_META_PILL_CLASS,
  DEFAULT_WINDOW_START,
} from './types';
import { formatMonthLabel, formatWindowLabel } from './utils';

export default function AfterHoursReport() {
  const {
    // State
    ranking,
    summary,
    loading,
    generating,
    downloading,
    month,
    branch,
    search,
    limit,
    windowStart,
    availableMonths,
    expandedRow,
    monthlyReportWhatsappTargets,
    loadingMonthlyReportSettings,
    savingMonthlyReportSettings,

    // Computed
    isDemoUser,
    currentMonth,
    monthOptions,
    totalStores,
    totalViolationDays,
    normalizedSearch,
    hasExportableReport,
    monthlyReportBroadcastEnabled,
    canGoNextMonth,
    isBusy,

    // Actions
    setExpandedRow,
    setMonthlyReportWhatsappTargets,
    handleSaveMonthlyReportSettings,
    handleGenerate,
    handleDownloadReport,
    handleResetFilters,
    handleSearchChange,
    handleBranchChange,
    handleLimitChange,
    handleWindowStartChange,
    handleMonthChange,
    handlePrevMonth,
    handleNextMonth,
    loadReport,
    loadMonths,
  } = useAfterHoursReport();

  const selectedBranchLabel = useMemo(
    () =>
      BRANCH_OPTIONS.find((b) => String(b.id) === String(branch))?.label || 'All Branches',
    [branch]
  );

  const activeFilters = useMemo(() => {
    const filters = [
      `Month: ${formatMonthLabel(month + '-01')}`,
      `Branch: ${selectedBranchLabel}`,
      `Limit: ${LIMIT_OPTIONS.find((opt) => opt.value === limit)?.label || 'Top 20'}`,
      `Window: ${formatWindowLabel(windowStart)}`,
    ];
    if (normalizedSearch) {
      filters.push(`Search: ${normalizedSearch}`);
    }
    return filters;
  }, [month, selectedBranchLabel, limit, windowStart, normalizedSearch]);

  return (
    <PageTemplate
      story={getFeatureStory('after-hours-report')}
      title="Monthly Report"
      subtitle="After-hours PC monitoring monthly violation report"
      actions={
        <>
          {hasExportableReport && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleDownloadReport}
              disabled={isBusy}
            >
              {downloading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              {downloading ? 'Downloading...' : 'Export'}
            </Button>
          )}
          <Button
            onClick={handleGenerate}
            size="sm"
            disabled={isBusy}
          >
            {generating ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <FileText className="size-4" />
            )}
            {generating ? 'Generating...' : 'Generate Report'}
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        <WhatsappTargetSection
          value={monthlyReportWhatsappTargets}
          onChange={setMonthlyReportWhatsappTargets}
          onSave={handleSaveMonthlyReportSettings}
          loading={loadingMonthlyReportSettings}
          saving={savingMonthlyReportSettings}
          enabled={monthlyReportBroadcastEnabled}
        />

        <ReportToolbar
          search={search}
          branch={branch}
          limit={limit}
          month={month}
          monthOptions={monthOptions}
          windowStart={windowStart}
          canGoNextMonth={canGoNextMonth}
          isBusy={isBusy}
          downloading={downloading}
          generating={generating}
          hasExportableReport={hasExportableReport}
          formatMonthLabel={formatMonthLabel}
          onSearchChange={handleSearchChange}
          onBranchChange={handleBranchChange}
          onLimitChange={handleLimitChange}
          onMonthChange={handleMonthChange}
          onPrevMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
          onWindowStartChange={handleWindowStartChange}
          onResetFilters={handleResetFilters}
          onThisMonth={() => handleMonthChange(currentMonth)}
          onDownload={handleDownloadReport}
          onGenerate={handleGenerate}
        />

        <ActiveFilters filters={activeFilters} />

        <AvailableMonthsChips
          availableMonths={availableMonths}
          selectedMonth={month}
          onSelectMonth={(val: string | null) => handleMonthChange(val)}
        />

        <StatsCards
          totalStores={totalStores}
          totalViolationDays={totalViolationDays}
          month={month}
          windowStart={windowStart}
          branch={branch}
          branchLabel={selectedBranchLabel}
          search={search}
        />

        <RankingTable
          ranking={ranking}
          loading={loading}
          totalStores={totalStores}
          branchLabel={selectedBranchLabel}
          month={month}
          search={search}
          expandedRow={expandedRow}
          onToggleExpand={(storeCode) => setExpandedRow(storeCode)}
          onFormatMonthLabel={formatMonthLabel}
        />
      </div>
    </PageTemplate>
  );
}
