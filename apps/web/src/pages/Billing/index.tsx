import { useEffect, useState, useCallback } from 'react';
import { CreditCard, Download, FileText, Loader2, RefreshCw } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DashboardLayout, DashboardPageHeader } from '@/components/base/dashboard-layout';
import { StatCard } from '@/components/ui/cards';
import { DataTable } from '@/components/ui/data-table';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { Guard } from '@/components/auth/Guard';
import { hasPermission, Permissions } from '@/lib/auth/permissions';
import { cn } from '@/lib/utils';
import type { SimpleColumn } from '@/components/ui/data-table';

/* ─── Types ─────────────────────────────────────────────── */

interface Subscription {
  id: string;
  org_id: string;
  status: string;
  plan: string;
  branch_count: number;
  screen_count: number;
  billing_period_start: string;
  billing_period_end: string;
  provider: string;
  last_invoice_url: string | null;
  created_at: string;
}

interface Invoice {
  id: string;
  subscription_id: string;
  amount: number;
  status: string;
  payment_method: string | null;
  paid_at: string | null;
  due_at: string | null;
  invoice_number: string;
  created_at: string;
}

/* ─── Helpers ───────────────────────────────────────────── */

const STATUS_STYLES: Record<string, 'success' | 'warning' | 'destructive' | 'default'> = {
  active: 'success',
  trial: 'default',
  past_due: 'warning',
  cancelled: 'destructive',
};

const PLAN_LABELS: Record<string, string> = {
  starter: 'Starter',
  growth: 'Growth',
  scale: 'Scale',
};

function formatCurrency(amount: number): string {
  return `Rp${(amount / 1000).toFixed(0)}.${String(amount % 1000).padStart(3, '0')}`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/* ─── Page ──────────────────────────────────────────────── */

export default function BillingPage() {
  const { api, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [generating, setGenerating] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBilling = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // Get the first org from user context
      const orgId = user?.orgId || 'default';
      const res = await api.get(`/orgs/${orgId}/billing`);
      if (!res.ok) throw new Error(res.error?.message || 'Failed to load billing');

      setSubscription(res.data?.subscription ?? null);
      setInvoices(res.data?.invoices ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      toast.error('Failed to load billing info');
    } finally {
      setLoading(false);
    }
  }, [api, user]);

  useEffect(() => {
    fetchBilling();
  }, [fetchBilling]);

  const handleGenerateInvoice = useCallback(async () => {
    try {
      setGenerating(true);
      const orgId = user?.orgId || 'default';
      const res = await api.post(`/orgs/${orgId}/billing/invoice`, {});
      if (!res.ok) throw new Error(res.error?.message || 'Failed to generate invoice');

      toast.success('Invoice generated', {
        description: `Invoice ${res.data?.invoiceNumber} created`,
      });
      await fetchBilling();
    } catch (err) {
      toast.error('Failed to generate invoice', {
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setGenerating(false);
    }
  }, [api, user, fetchBilling]);

  const handleConfirmPayment = useCallback(async (invoiceId: string) => {
    try {
      setConfirming(true);
      const orgId = user?.orgId || 'default';
      const res = await api.post(`/orgs/${orgId}/billing/confirm`, { invoiceId });
      if (!res.ok) throw new Error(res.error?.message || 'Failed to confirm payment');

      toast.success('Payment confirmed', { description: 'Invoice marked as paid' });
      await fetchBilling();
    } catch (err) {
      toast.error('Failed to confirm payment', {
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setConfirming(false);
    }
  }, [api, user, fetchBilling]);

  const invoiceColumns: SimpleColumn<Invoice>[] = [
    {
      header: 'Invoice',
      render: (row) => (
        <span className="font-mono text-xs font-medium">{row.invoice_number}</span>
      ),
    },
    {
      header: 'Amount',
      render: (row) => (
        <span className="tabular-nums font-medium">{formatCurrency(row.amount)}</span>
      ),
    },
    {
      header: 'Status',
      render: (row) => (
        <Badge
          variant={
            row.status === 'paid'
              ? 'success'
              : row.status === 'pending'
                ? 'warning'
                : 'default'
          }
        >
          {row.status}
        </Badge>
      ),
    },
    {
      header: 'Due',
      render: (row) => (
        <span className="text-xs text-muted-foreground">{formatDate(row.due_at)}</span>
      ),
    },
    {
      header: 'Paid',
      render: (row) => (
        <span className="text-xs text-muted-foreground">{formatDate(row.paid_at)}</span>
      ),
    },
    {
      header: '',
      render: (row) =>
        row.status === 'pending' && (
          <Button
            size="sm"
            variant="outline"
            disabled={confirming}
            onClick={() => handleConfirmPayment(row.id)}
          >
            {confirming ? (
              <Loader2 aria-hidden="true" className="size-3 animate-spin" />
            ) : (
              'Confirm'
            )}
          </Button>
        ),
    },
  ];

  if (loading) {
    return (
      <DashboardLayout>
        <Skeleton className="h-8 w-48" />
        <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <EmptyState
          title="Failed to load billing"
          description={error}
          icon={<CreditCard aria-hidden="true" className="size-8" />}
          action={
            <Button onClick={fetchBilling}>
              <RefreshCw aria-hidden="true" /> Retry
            </Button>
          }
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <DashboardPageHeader
        title="Subscription & Billing"
        subtitle="Manage your plan, usage, and invoices"
        actions={
          <Guard permission={Permissions.BILLING_VIEW}>
            <Button onClick={fetchBilling} variant="outline" size="sm" disabled={loading}>
              <RefreshCw aria-hidden="true" className={cn('size-4', loading && 'animate-spin')} />
              <span className="ml-2 hidden sm:inline">Refresh</span>
            </Button>
          </Guard>
        }
      />

      {/* Status Cards */}
      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Plan"
          value={PLAN_LABELS[subscription?.plan ?? ''] || 'Not set'}
          icon={<CreditCard aria-hidden="true" className="size-5" />}
          accent="text-primary"
        />
        <StatCard
          title="Status"
          value={subscription?.status ?? 'No subscription'}
          icon={<CreditCard aria-hidden="true" className="size-5" />}
          accent={
            subscription?.status === 'active'
              ? 'text-status-success'
              : subscription?.status === 'trial'
                ? 'text-primary'
                : 'text-status-error'
          }
        />
        <StatCard
          title="Branches"
          value={String(subscription?.branch_count ?? 0)}
          icon={<CreditCard aria-hidden="true" className="size-5" />}
        />
        <StatCard
          title="Screens"
          value={String(subscription?.screen_count ?? 0)}
          icon={<CreditCard aria-hidden="true" className="size-5" />}
        />
      </div>

      {/* Subscription Detail */}
      {subscription && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Subscription Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <dt className="text-xs text-muted-foreground">Plan</dt>
                <dd className="mt-1 font-medium">{PLAN_LABELS[subscription.plan] || subscription.plan}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Status</dt>
                <dd className="mt-1">
                  <Badge variant={STATUS_STYLES[subscription.status] || 'default'}>
                    {subscription.status}
                  </Badge>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Provider</dt>
                <dd className="mt-1 font-mono text-xs uppercase">{subscription.provider}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Billing Period</dt>
                <dd className="mt-1 text-xs">
                  {formatDate(subscription.billing_period_start)} — {formatDate(subscription.billing_period_end)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Branches</dt>
                <dd className="mt-1 tabular-nums">{subscription.branch_count}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Screens (add-on)</dt>
                <dd className="mt-1 tabular-nums">{subscription.screen_count}</dd>
              </div>
            </dl>
          </CardContent>
          <CardFooter className="gap-3">
            <Button size="sm" disabled={generating} onClick={handleGenerateInvoice}>
              {generating ? (
                <Loader2 aria-hidden="true" className="size-4 animate-spin mr-2" />
              ) : (
                <FileText aria-hidden="true" className="size-4 mr-2" />
              )}
              Generate Invoice
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Invoice History */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Invoice History
          </CardTitle>
          <CardDescription>
            {invoices.length} invoice{invoices.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText aria-hidden="true" className="size-8 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">No invoices yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Generate your first invoice to get started.
              </p>
            </div>
          ) : (
            <DataTable
              columns={invoiceColumns}
              data={invoices}
              keyExtractor={(row) => row.id}
            />
          )}
        </CardContent>
      </Card>

      {/* Need Help */}
      <Card className="mt-6 border-primary/20 bg-primary/[0.03]">
        <CardHeader>
          <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Need Help?
          </CardTitle>
          <CardDescription>
            For billing inquiries, payment issues, or plan changes, contact the administrator.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <p className="text-xs text-muted-foreground">
            Payments are processed manually via QRIS. After payment, ask your admin to confirm
            the invoice to activate your subscription.
          </p>
        </CardFooter>
      </Card>
    </DashboardLayout>
  );
}
