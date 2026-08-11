import { motion } from 'framer-motion';
import { TriangleAlertIcon } from 'lucide-react';
import { toast } from 'sonner';

const SIMULATION_MS = 900;
const REVEAL_MS = 3800;

const DEFAULT_DESCRIPTION = 'This action is not available in the demo account.';

let activeToastId: string | number | null = null;
let swapTimer: ReturnType<typeof setTimeout> | null = null;

function DemoBlockedToast({ title, description }: { title: string; description: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 26 }}
      className="flex items-start gap-3 rounded-[var(--radius)] border border-border bg-popover p-3.5 text-popover-foreground shadow-lg shadow-black/5"
    >
      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-500">
        <TriangleAlertIcon className="size-3.5" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
    </motion.div>
  );
}

/**
 * Demo-mode guard feedback: "fake-runs" the blocked action with a brief
 * simulated-progress toast (spinner), then reveals the demo notice with a
 * spring-animated warning toast. Keeps the demo feeling responsive instead
 * of dead-ending on a static warning.
 */
export function demoBlocked(description = DEFAULT_DESCRIPTION, title = 'Demo Account') {
  if (swapTimer) clearTimeout(swapTimer);
  if (activeToastId === null) {
    activeToastId = toast.loading(title, {
      description: 'Simulating action…',
      // kept alive until the reveal below swaps it out
      duration: 60_000,
    });
  }
  swapTimer = setTimeout(() => {
    const loadingId = activeToastId;
    activeToastId = null;
    swapTimer = null;
    if (loadingId !== null) toast.dismiss(loadingId);
    // brief beat so the spinner exits before the spring reveal
    window.setTimeout(() => {
      toast.custom(() => <DemoBlockedToast title={title} description={description} />, {
        duration: REVEAL_MS,
      });
    }, 120);
  }, SIMULATION_MS);
}
