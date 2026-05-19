import React, { useState, useRef, useCallback } from 'react';
import {
  Loader2,
  X,
  Compass,
  Lock,
  User,
  Eye,
  EyeOff,
  ShieldCheck,
  LogIn,
  Key,
  Tv,
  HelpCircle,
  Activity,
  LineChart,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../components/ui/ToastContext';
import { Button } from '@/components/ui/button';

const DEMO_ACCOUNTS = [
  {
    username: 'demo',
    password: 'demo123',
    label: 'Demo Account',
    role: 'demo',
    note: 'Portfolio',
    primary: true,
  },
];

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const [helpOpen, setHelpOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const animatingRef = useRef(false);

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const typeCredentials = useCallback(async (targetUsername, targetPassword) => {
    if (animatingRef.current) return;
    animatingRef.current = true;
    setIsAnimating(true);
    setUsername('');
    setPassword('');
    setError('');

    for (let i = 0; i <= targetUsername.length; i++) {
      if (!animatingRef.current) break;
      setUsername(targetUsername.substring(0, i));
      await sleep(40 + Math.random() * 30);
    }

    await sleep(250);

    for (let i = 0; i <= targetPassword.length; i++) {
      if (!animatingRef.current) break;
      setPassword(targetPassword.substring(0, i));
      await sleep(30 + Math.random() * 20);
    }

    animatingRef.current = false;
    setIsAnimating(false);
  }, []);

  const supportUrl = import.meta.env.VITE_IT_SUPPORT_URL || '';
  const supportEmail = import.meta.env.VITE_IT_SUPPORT_EMAIL || '';

  const openSupportChannel = () => {
    if (supportUrl) {
      window.open(supportUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    if (supportEmail) {
      window.location.href = `mailto:${encodeURIComponent(supportEmail)}`;
      return;
    }
    showToast('IT support contact is not configured.', 'info');
  };

  const normalizeLoginError = (message) => {
    const raw = String(message || '').trim();
    if (!raw) return 'Username or password is incorrect';
    const lower = raw.toLowerCase();
    if (
      lower.includes('invalid') ||
      lower.includes('unauthorized') ||
      lower.includes('credential')
    ) {
      return 'Username or password is incorrect';
    }
    if (lower.includes('timeout')) return 'Request timed out. Please try again.';
    return raw;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const res = await login(username, password, { persist: rememberMe });
      if (res.success) {
        navigate('/');
      } else {
        setError(normalizeLoginError(res.error));
      }
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-shell">
      {/* Need Help Modal */}
      {helpOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
          onClick={() => setHelpOpen(false)}
        >
          <div
            className="login-modal-panel animate-in w-full max-w-sm rounded-xl border border-border bg-card p-6 duration-200 fade-in zoom-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold tracking-normal">
                Need Assistance?
              </h3>
              <button
                type="button"
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
                onClick={() => setHelpOpen(false)}
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-muted p-4">
                <div className="flex gap-4">
                  <Compass className="size-5 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-semibold">How to sign in</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Use the "demo" quick login button to explore.
                    </div>
                  </div>
                </div>
              </div>

              <Button onClick={openSupportChannel} variant="secondary" className="h-12 w-full">
                <Activity className="size-4" />
                Contact IT Support
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Left Section: Branding */}
      <section className="relative hidden overflow-hidden border-r border-border bg-background p-12 md:flex md:flex-col md:justify-between lg:p-16">
        <div className="pointer-events-none absolute inset-0 opacity-100">
          <div className="absolute top-0 left-0 w-full h-full bg-radial-login" />
        </div>

        <div className="z-10 flex items-center gap-3 font-display font-bold tracking-normal text-foreground">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <LineChart className="size-5" />
          </div>
          <span className="login-brand-label">Operations Hub</span>
        </div>

        <div className="z-10 max-w-lg">
          <h1 className="mb-6 font-display text-5xl font-bold leading-tight tracking-normal text-foreground">
            Enterprise <br /> Monitor
          </h1>
          <p className="mb-10 max-w-md text-base leading-7 text-muted-foreground">
            Real-time tracking for Store EOD processes, data integrity, and network-wide system
            health.
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
          © 2026 Enterprise Operations Monitor
        </div>
      </section>

      {/* Right Section: Form */}
      <main className="relative flex flex-1 flex-col items-center justify-center border-l border-border bg-card/95 p-6 md:p-10 lg:p-12">
        <div className="mb-8 flex items-center gap-3 self-start md:hidden">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <LineChart className="size-5" />
          </div>
          <span className="login-brand-label font-display font-bold">Operations Hub</span>
        </div>
        <div className="w-full max-w-md">
          <div className="login-card-elevated rounded-xl border border-border bg-card p-6 sm:p-8">
            <div className="mb-8">
              <h2 className="mb-2 font-display text-2xl font-semibold tracking-normal text-foreground">
                Welcome Back
              </h2>
              <p className="text-sm text-muted-foreground">Access your operational dashboard</p>
            </div>

            {error && (
              <div className="animate-in mb-6 flex items-start gap-3 rounded-md border border-status-error/20 bg-status-error/10 p-4 text-sm text-status-error duration-300 fade-in">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <p className="font-medium leading-relaxed">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="form-label" htmlFor="username">
                  Identity
                </label>
                <div className="relative group">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground transition-colors group-focus-within:text-primary">
                    <User className="size-3.5" />
                  </div>
                  <input
                    className="login-input pl-10 pr-3"
                    id="username"
                    name="username"
                    placeholder="Username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="form-label" htmlFor="password">
                  Security Key
                </label>
                <div className="relative group">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground transition-colors group-focus-within:text-primary">
                    <Lock className="size-3.5" />
                  </div>
                  <input
                    className="login-input pl-10 pr-11"
                    id="password"
                    name="password"
                    placeholder="Password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  className="size-4 rounded-sm border-border bg-input text-primary focus:ring-primary/20"
                  id="remember"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <label
                  className="cursor-pointer text-xs font-medium text-muted-foreground"
                  htmlFor="remember"
                >
                  Keep me signed in
                </label>
              </div>

              <Button
                className="h-12 w-full uppercase tracking-wide active:scale-98"
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <LogIn className="size-4" />
                )}
                Sign In
              </Button>
            </form>

            <div className="mt-8 border-t border-border pt-6">
              <p className="form-label mb-4 text-center">Portfolio Showcase</p>
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.username}
                  disabled={isAnimating || isLoading}
                  onClick={() => typeCredentials(acc.username, acc.password)}
                  className="group flex w-full items-center justify-between rounded-lg border border-border bg-muted p-4 transition-all hover:border-primary/40 hover:bg-secondary active:scale-98 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <div className="flex items-center gap-3 text-left">
                    <div className="flex size-10 items-center justify-center rounded-lg border border-border bg-background transition-colors group-hover:text-primary">
                      <Key className="size-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{acc.label}</div>
                      <div className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
                        Login: {acc.username}
                      </div>
                    </div>
                  </div>
                  <div className="login-chip text-primary/60 transition-colors group-hover:text-primary">
                    QUICK START
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-8 text-center">
              <span className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
                v2.4.0 • PRODUCTION READY
              </span>
            </div>
          </div>
        </div>

        <div className="mt-8 flex items-center gap-6">
          <button
            type="button"
            className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-status-success/80 transition-colors hover:text-status-success focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
            onClick={() => window.open('/live', '_blank', 'noopener')}
          >
            <Tv className="size-4" />
            Live TV
          </button>
          <button
            type="button"
            className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
            onClick={() => setHelpOpen(true)}
          >
            <HelpCircle className="size-4" />
            System Support
          </button>
        </div>
      </main>

      <div className="border-t border-border bg-card p-6 text-center md:hidden">
        <p className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
          Enterprise Operations Platform
        </p>
      </div>
    </div>
  );
};

export default Login;
