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
    <div className="dark bg-background text-foreground min-h-screen flex flex-col md:flex-row overflow-hidden">
      {/* Need Help Modal */}
      {helpOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setHelpOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl p-6 shadow-2xl bg-card border border-border/60 animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold tracking-tight">Need Assistance?</h3>
              <button
                type="button"
                className="p-1 rounded-full hover:bg-muted transition-colors"
                onClick={() => setHelpOpen(false)}
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-muted/30 border border-border/40">
                <div className="flex gap-4">
                  <Compass className="size-5 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-bold">How to sign in</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Use the "demo" quick login button to explore.
                    </div>
                  </div>
                </div>
              </div>

              <Button
                onClick={openSupportChannel}
                variant="secondary"
                className="w-full h-12 rounded-2xl font-bold"
              >
                <Activity className="mr-2 size-4" />
                Contact IT Support
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Left Section: Branding */}
      <section className="hidden md:flex w-1/2 flex-col justify-between p-16 relative overflow-hidden bg-muted/5 border-r border-border/40">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-full bg-radial-login" />
        </div>

        <div className="z-10 flex items-center gap-4 text-foreground font-black tracking-tighter">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-xl shadow-primary/20">
            <LineChart className="size-7" />
          </div>
          <span className="text-lg uppercase tracking-widest-lg">Operations Hub</span>
        </div>

        <div className="z-10 max-w-lg">
          <h1 className="text-5xl lg:text-7xl font-black text-foreground leading-tightest tracking-tight mb-8">
            Enterprise <br /> Monitor
          </h1>
          <p className="text-muted-foreground text-xl mb-12 leading-relaxed font-medium">
            Real-time tracking for Store EOD processes, data integrity, and network-wide system
            health.
          </p>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-status-success/10 border border-status-success/20 text-3xs font-black uppercase tracking-widest text-status-success">
              <span className="w-2 h-2 rounded-full bg-status-success animate-pulse" />
              Operational
            </div>
            <div className="flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-muted/30 border border-border/40 text-3xs font-black uppercase tracking-widest text-muted-foreground">
              <ShieldCheck className="size-4" />
              Secure Hub
            </div>
          </div>
        </div>

        <div className="z-10 text-3xs font-black uppercase tracking-widest text-muted-foreground/40">
          © 2026 Enterprise Operations Monitor
        </div>
      </section>

      {/* Right Section: Form */}
      <main className="flex-1 flex flex-col justify-center items-center p-6 md:p-12 relative">
        <div className="w-full max-w-md">
          <div className="rounded-5xl border border-border/60 bg-card p-8 sm:p-12 shadow-2xl">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-black tracking-tight text-foreground mb-3">
                Welcome Back
              </h2>
              <p className="text-muted-foreground font-medium">Access your operational dashboard</p>
            </div>

            {error && (
              <div className="mb-8 p-4 bg-status-error/10 border border-status-error/20 rounded-2xl flex items-start gap-3 text-status-error text-sm animate-in fade-in duration-300">
                <AlertCircle className="size-5 shrink-0 mt-0.5" />
                <p className="font-medium leading-relaxed">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label
                  className="text-xs font-black uppercase tracking-widest text-muted-foreground/60 ml-4"
                  htmlFor="username"
                >
                  Identity
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
                    <User className="size-5" />
                  </div>
                  <input
                    className="block w-full pl-12 pr-4 h-14 bg-muted/30 border border-border/60 rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-foreground font-medium placeholder:text-muted-foreground/40"
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
                <label
                  className="text-xs font-black uppercase tracking-widest text-muted-foreground/60 ml-4"
                  htmlFor="password"
                >
                  Security Key
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
                    <Lock className="size-5" />
                  </div>
                  <input
                    className="block w-full pl-12 pr-12 h-14 bg-muted/30 border border-border/60 rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-foreground font-medium placeholder:text-muted-foreground/40"
                    id="password"
                    name="password"
                    placeholder="Password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-muted-foreground hover:text-foreground transition-colors"
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3 px-2">
                <input
                  className="size-4 rounded-md border-border/60 bg-muted/30 text-primary focus:ring-primary/20"
                  id="remember"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <label
                  className="text-xs font-bold text-muted-foreground cursor-pointer"
                  htmlFor="remember"
                >
                  Keep me signed in
                </label>
              </div>

              <Button
                className="w-full h-14 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-98"
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="animate-spin size-5 mr-2" />
                ) : (
                  <LogIn className="size-5 mr-2" />
                )}
                Sign In
              </Button>
            </form>

            <div className="mt-10 pt-8 border-t border-border/40">
              <p className="text-3xs font-black text-muted-foreground/40 uppercase tracking-widest-lg text-center mb-6">
                Portfolio Showcase
              </p>
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.username}
                  disabled={isAnimating || isLoading}
                  onClick={() => typeCredentials(acc.username, acc.password)}
                  className="w-full group flex items-center justify-between p-4 rounded-2xl bg-muted/20 border border-border/40 hover:border-primary/40 hover:bg-background transition-all active:scale-98"
                >
                  <div className="flex items-center gap-3 text-left">
                    <div className="size-10 flex items-center justify-center rounded-xl bg-background border border-border/60 group-hover:text-primary transition-colors">
                      <Key className="size-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold">{acc.label}</div>
                      <div className="text-3xs text-muted-foreground uppercase font-black tracking-widest">
                        Login: {acc.username}
                      </div>
                    </div>
                  </div>
                  <div className="text-3xs font-black uppercase tracking-widest text-primary/40 group-hover:text-primary transition-colors">
                    QUICK START
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-10 text-center">
              <span className="text-3xs font-black uppercase tracking-widest text-muted-foreground/30">
                v2.4.0 • PRODUCTION READY
              </span>
            </div>
          </div>
        </div>

        <div className="mt-8 flex items-center gap-8">
          <button
            type="button"
            className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-status-success/70 hover:text-status-success transition-all"
            onClick={() => window.open('/live', '_blank', 'noopener')}
          >
            <Tv className="size-4" />
            Live TV
          </button>
          <button
            type="button"
            className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-all"
            onClick={() => setHelpOpen(true)}
          >
            <HelpCircle className="size-4" />
            System Support
          </button>
        </div>
      </main>

      <div className="md:hidden p-8 border-t border-border bg-card text-center">
        <p className="text-3xs font-black uppercase tracking-widest-lg text-muted-foreground/60">
          Enterprise Operations Platform
        </p>
      </div>
    </div>
  );
};

export default Login;
