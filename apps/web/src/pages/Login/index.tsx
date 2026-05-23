import { useCallback, useRef, useState, type FormEvent } from "react";
import {
  Activity,
  Compass,
  HelpCircle,
  LineChart,
  ShieldCheck,
  Tv,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { BaseDialog, BaseLoginForm, type BaseLoginDemoAccount } from "@/components/base";
import { Button } from "@/components/ui/button";
import { useAuth } from "../../context/AuthContext";

const DEMO_ACCOUNTS: BaseLoginDemoAccount[] = [
  {
    username: "demo",
    password: "demo123",
    label: "Demo Account",
    role: "demo",
    note: "Portfolio",
  },
];

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const animatingRef = useRef(false);
  const { login } = useAuth() as any;
  const navigate = useNavigate();

  const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

  const typeCredentials = useCallback(async (targetUsername: string, targetPassword: string) => {
    if (animatingRef.current) return;
    animatingRef.current = true;
    setIsAnimating(true);
    setUsername("");
    setPassword("");
    setError("");

    for (let index = 0; index <= targetUsername.length; index += 1) {
      if (!animatingRef.current) break;
      setUsername(targetUsername.substring(0, index));
      await sleep(40 + Math.random() * 30);
    }

    await sleep(250);

    for (let index = 0; index <= targetPassword.length; index += 1) {
      if (!animatingRef.current) break;
      setPassword(targetPassword.substring(0, index));
      await sleep(30 + Math.random() * 20);
    }

    animatingRef.current = false;
    setIsAnimating(false);
  }, []);

  const supportUrl = import.meta.env?.VITE_IT_SUPPORT_URL || "";
  const supportEmail = import.meta.env?.VITE_IT_SUPPORT_EMAIL || "";

  const openSupportChannel = (): void => {
    if (supportUrl) {
      window.open(supportUrl, "_blank", "noopener,noreferrer");
      return;
    }
    if (supportEmail) {
      window.location.href = `mailto:${encodeURIComponent(supportEmail)}`;
      return;
    }
    toast.info("IT support contact is not configured.");
  };

  const normalizeLoginError = (message: unknown): string => {
    const raw = String(message || "").trim();
    if (!raw) return "Username or password is incorrect";
    const lower = raw.toLowerCase();
    if (lower.includes("invalid") || lower.includes("unauthorized") || lower.includes("credential")) {
      return "Username or password is incorrect";
    }
    if (lower.includes("timeout")) return "Request timed out. Please try again.";
    return raw;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const result = await login(username, password, { persist: rememberMe });
      if (result.success) {
        navigate("/");
      } else {
        setError(normalizeLoginError(result.error));
      }
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-shell">
      <BaseDialog
        open={helpOpen}
        onOpenChange={setHelpOpen}
        title="Need Assistance?"
        className="max-w-sm"
      >
        <div className="grid gap-4">
          <div className="rounded-lg border border-border bg-muted p-4">
            <div className="flex gap-4">
              <Compass className="size-5 text-muted-foreground" />
              <div>
                <div className="text-sm font-semibold">How to sign in</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Use the demo quick login button to explore.
                </div>
              </div>
            </div>
          </div>
          <Button type="button" onClick={openSupportChannel} variant="secondary" className="h-11 w-full">
            <Activity data-icon="inline-start" />
            Contact IT Support
          </Button>
        </div>
      </BaseDialog>

      <section className="relative hidden overflow-hidden border-r border-border bg-background p-12 md:flex md:flex-col md:justify-between lg:p-16">
        <div className="pointer-events-none absolute inset-0 opacity-100">
          <div className="absolute left-0 top-0 h-full w-full bg-radial-login" />
        </div>
        <div className="z-10 flex items-center gap-3 font-display font-bold tracking-normal text-foreground">
          <div className="flex size-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <LineChart className="size-5" />
          </div>
          <span className="login-brand-label">Operations Hub</span>
        </div>
        <div className="z-10 max-w-lg">
          <h1 className="mb-6 font-display text-5xl font-bold leading-tight tracking-normal text-foreground">
            Enterprise <br /> Monitor
          </h1>
          <p className="mb-10 max-w-md text-base leading-7 text-muted-foreground">
            Real-time tracking for Store EOD processes, data integrity, and network-wide system health.
          </p>
          <div className="flex flex-wrap gap-4">
            <div className="login-chip flex items-center gap-2 rounded-xs bg-status-success/10 px-2 py-1 text-status-success">
              <span className="size-1.5 rounded-full bg-status-success animate-pulse" />
              Operational
            </div>
            <div className="login-chip flex items-center gap-2 rounded-xs bg-secondary px-2 py-1 text-muted-foreground">
              <ShieldCheck className="size-3" />
              Secure Hub
            </div>
          </div>
        </div>
        <div className="z-10 font-mono text-xs text-muted-foreground">
          &copy; 2026 Enterprise Operations Monitor
        </div>
      </section>

      <main className="relative flex flex-1 flex-col items-center justify-center border-l border-border bg-card/95 p-6 md:p-10 lg:p-12">
        <div className="mb-8 flex items-center gap-3 self-start md:hidden">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <LineChart className="size-5" />
          </div>
          <span className="login-brand-label font-display font-bold">Operations Hub</span>
        </div>
        <BaseLoginForm
          username={username}
          password={password}
          rememberMe={rememberMe}
          showPassword={showPassword}
          loading={isLoading || isAnimating}
          error={error}
          demoAccounts={DEMO_ACCOUNTS}
          onUsernameChange={setUsername}
          onPasswordChange={setPassword}
          onRememberMeChange={setRememberMe}
          onShowPasswordChange={setShowPassword}
          onSubmit={handleSubmit}
          onDemoSelect={(account) => typeCredentials(account.username, account.password)}
          footer={
            <div className="mt-8 text-center">
              <span className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
                v2.4.0 &bull; Production Ready
              </span>
            </div>
          }
        />
        <div className="mt-8 flex items-center gap-6">
          <Button
            type="button"
            variant="ghost"
            className="text-xs font-semibold uppercase tracking-wide text-status-success/80 hover:text-status-success"
            onClick={() => window.open("/live", "_blank", "noopener")}
          >
            <Tv data-icon="inline-start" />
            Live TV
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
            onClick={() => setHelpOpen(true)}
          >
            <HelpCircle data-icon="inline-start" />
            System Support
          </Button>
        </div>
      </main>

      <div className="border-t border-border bg-card p-6 text-center md:hidden">
        <p className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
          Enterprise Operations Platform
        </p>
      </div>
    </div>
  );
}
