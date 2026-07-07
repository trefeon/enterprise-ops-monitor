import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Save, FileText } from 'lucide-react';
import { MONTHLY_REPORT_WHATSAPP_TARGETS_SAMPLE } from '../types';

interface WhatsappTargetSectionProps {
  value: string;
  onChange: (val: string) => void;
  onSave: () => void;
  loading: boolean;
  saving: boolean;
  enabled: boolean;
}

export function WhatsappTargetSection({
  value,
  onChange,
  onSave,
  loading,
  saving,
  enabled,
}: WhatsappTargetSectionProps) {
  return (
    <Card className="p-0">
      <CardContent className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-sm border border-border bg-background/70 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              <FileText className="size-3 text-status-info" />
              Monthly Report Delivery
            </div>
            <h2 className="text-lg font-semibold tracking-normal text-foreground">
              WhatsApp broadcast target
            </h2>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              Configure the target list used when monthly after-hours reports are generated and
              sent automatically at 09:00 WIB.
            </p>
          </div>
          <StatusBadge variant={enabled ? 'success' : 'neutral'} size="lg">
            {enabled ? 'Enabled' : 'Disabled'}
          </StatusBadge>
        </div>

        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-start">
          <div className="relative w-full lg:flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground">
              <Save className="size-4" />
            </div>
            <Input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={MONTHLY_REPORT_WHATSAPP_TARGETS_SAMPLE}
              disabled={loading}
              className="!pl-11"
            />
          </div>
          <Button size="sm" onClick={onSave} disabled={loading}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            <Save className="size-4" />
            Save Target
          </Button>
        </div>

        <p className="mt-2 text-xs text-muted-foreground">
          Separate multiple targets with commas.{' '}
          <code className="text-foreground">{MONTHLY_REPORT_WHATSAPP_TARGETS_SAMPLE}</code>
        </p>
      </CardContent>
    </Card>
  );
}
