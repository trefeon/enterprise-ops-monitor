import React, { useState, useRef, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../components/ui/ToastContext';

const DEMO_ACCOUNTS = [
  {
    username: 'demo',
    password: 'demo123',
    label: 'Demo (Read-Only)',
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
  const { showToast } = useToast(); // Using context directly as per inspection
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

  const supportUrl = import.meta.env.VITE_IT_SUPPORT_URL
    ? String(import.meta.env.VITE_IT_SUPPORT_URL)
    : '';
  const supportEmail = import.meta.env.VITE_IT_SUPPORT_EMAIL
    ? String(import.meta.env.VITE_IT_SUPPORT_EMAIL)
    : '';

  const openSupportChannel = () => {
    if (supportUrl) {
      window.open(supportUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    if (supportEmail) {
      window.location.href = `mailto:${encodeURIComponent(supportEmail)}`;
      return;
    }

    showToast('IT support contact is not configured. Please contact IT Support.', 'info');
  };

  const normalizeLoginError = (message) => {
    const raw = String(message || '').trim();
    if (!raw) return 'Username or password is incorrect';
    const lower = raw.toLowerCase();

    if (
      lower.includes('invalid') ||
      lower.includes('unauthorized') ||
      lower.includes('credential') ||
      lower.includes('login failed')
    ) {
      return 'Username or password is incorrect';
    }

    if (lower.includes('timeout')) return 'Request timed out. Please try again.';
    if (lower.includes('network'))
      return "Can't reach the server. Check your connection and try again.";

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
    <div className="dark font-sans bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 min-h-screen flex flex-col md:flex-row overflow-hidden transition-colors duration-300">
      {/* Need Help Modal */}
      {helpOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 p-4 backdrop-blur-sm"
          onClick={() => setHelpOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6 shadow-2xl bg-zinc-900/95 border border-zinc-800 backdrop-blur-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-display font-semibold text-white">Need Assistance?</h3>
              <button
                type="button"
                className="p-1 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                onClick={() => setHelpOpen(false)}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-zinc-950/50 border border-zinc-800/50">
                <div className="flex gap-3">
                  <span className="material-symbols-outlined text-zinc-400">explore</span>
                  <div>
                    <div className="text-sm font-medium text-white">How to sign in</div>
                    <div className="text-xs text-zinc-500 mt-0.5">
                      Use one of the configured demo usernames.
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-zinc-950/50 border border-zinc-800/50">
                <div className="flex gap-3">
                  <span className="material-symbols-outlined text-zinc-400">lock_reset</span>
                  <div>
                    <div className="text-sm font-medium text-white">Forgot Password</div>
                    <div className="text-xs text-zinc-500 mt-0.5">
                      Contact IT Support to reset credentials.
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={openSupportChannel}
                className="w-full mt-2 bg-zinc-800 hover:bg-zinc-700 text-white py-3 rounded-xl flex items-center justify-center gap-2 transition-colors font-medium text-sm"
              >
                <span className="material-symbols-outlined text-lg">support_agent</span>
                Contact IT Support
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Left Section: Illustration/Branding */}
      <section className="hidden md:flex w-1/2 flex-col justify-between p-16 relative overflow-hidden bg-gradient-to-br from-zinc-950 via-zinc-950 to-zinc-950">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute -top-24 -left-24 w-80 h-80 bg-white/5 blur-3xl rounded-full"></div>
          <div className="absolute -bottom-16 -right-16 w-72 h-72 bg-white/3 blur-3xl rounded-full"></div>
        </div>

        <div className="absolute inset-0 pointer-events-none opacity-60 bg-gradient-to-br from-white/5 via-transparent to-white/5" />

        <div className="z-10 flex items-center gap-3 text-white">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
            <span className="material-symbols-outlined text-3xl">monitoring</span>
          </span>
          <span className="text-sm font-semibold uppercase tracking-widest text-zinc-300">
            Portfolio Demo
          </span>
        </div>

        <div className="z-10 max-w-lg">
          <h1 className="text-5xl lg:text-6xl font-display font-semibold text-white leading-tight mb-6">
            Enterprise Operations Monitor
          </h1>
          <p className="text-zinc-400 text-lg mb-10 leading-relaxed border-l-2 border-zinc-800 pl-6">
            Real-time tracking for Store EOD processes, data integrity, and system health across the
            entire network.
          </p>
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-800/50 border border-zinc-700 text-xs font-medium uppercase tracking-wider text-zinc-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              System Operational
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-800/50 border border-zinc-700 text-xs font-medium uppercase tracking-wider text-zinc-300">
              <span className="material-symbols-outlined text-sm">shield</span>
              Secure Connection
            </div>
          </div>
        </div>

        <div className="z-10 text-xs text-zinc-500">Enterprise Operations Monitor demo</div>
      </section>

      <div className="hidden md:block w-px bg-zinc-800/70" />

      {/* Right Section: Login Form */}
      <main className="flex-1 flex flex-col justify-center items-center p-6 md:p-12 relative bg-background-light dark:bg-gradient-to-br dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-950">

        <div className="w-full max-w-lg">
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/40 backdrop-blur-md shadow-2xl shadow-black/40 p-6 sm:p-8">
            <div className="text-center md:text-left">
              <h2 className="text-3xl font-display font-semibold text-zinc-900 dark:text-white">
                Welcome Back
              </h2>
              <p className="mt-2 text-zinc-500 dark:text-zinc-400">
                Please enter your credentials to access the dashboard.
              </p>
            </div>

            {error && (
              <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-500 dark:text-red-400 text-sm animate-in">
                <span className="material-symbols-outlined text-xl mt-0.5">error</span>
                <p>{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-6">
              <div className="space-y-2">
                <label
                  className="text-sm font-medium text-zinc-700 dark:text-zinc-300 ml-1"
                  htmlFor="username"
                >
                  Username or Email
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400 group-focus-within:text-zinc-600 dark:group-focus-within:text-zinc-200 transition-colors">
                    <span className="material-symbols-outlined text-xl">person</span>
                  </div>
                  <input
                    className="block w-full pl-11 pr-4 py-3 bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/80 rounded-xl focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-700 focus:border-transparent transition-all outline-none text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
                    id="username"
                    name="username"
                    placeholder="admin"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 ml-1">
                  Use "demo" to explore all features in read-only mode.
                </p>
              </div>

              <div className="space-y-2">
                <label
                  className="text-sm font-medium text-zinc-700 dark:text-zinc-300 ml-1"
                  htmlFor="password"
                >
                  Password
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400 group-focus-within:text-zinc-600 dark:group-focus-within:text-zinc-200 transition-colors">
                    <span className="material-symbols-outlined text-xl">lock</span>
                  </div>
                  <input
                    className="block w-full pl-11 pr-12 py-3 bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/80 rounded-xl focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-700 focus:border-transparent transition-all outline-none text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
                    id="password"
                    name="password"
                    placeholder="••••••••••••"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors outline-none"
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <span className="material-symbols-outlined text-xl">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="flex items-center h-5">
                  <input
                    className="h-4 w-4 text-zinc-900 border-zinc-300 dark:border-zinc-700 rounded focus:ring-zinc-500 bg-white dark:bg-zinc-900"
                    id="remember"
                    name="remember"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                </div>
                <div className="text-xs">
                  <label
                    className="font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer"
                    htmlFor="remember"
                  >
                    Keep me signed in
                  </label>
                  <p className="text-zinc-400 dark:text-zinc-500">
                    Recommended only on personal devices
                  </p>
                </div>
              </div>

              <button
                className="w-full bg-white text-zinc-900 py-3.5 px-4 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-zinc-100 active:scale-95 transition-all shadow-lg shadow-black/20 hover:shadow-xl hover:shadow-black/30 disabled:opacity-70 disabled:cursor-not-allowed"
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="animate-spin text-xl" />
                ) : (
                  <span className="material-symbols-outlined text-xl">login</span>
                )}
                {isLoading ? 'Signing In...' : 'Sign In to System'}
              </button>
            </form>

            {/* Demo Account Quick Select */}
            <div className="mt-6 pt-6 border-t border-zinc-800/60">
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider text-center mb-3">
                Quick Demo Login
              </p>
              <div className="flex flex-col gap-3">
                {DEMO_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.username}
                    type="button"
                    disabled={isAnimating || isLoading}
                    onClick={() => typeCredentials(acc.username, acc.password)}
                    className="w-full bg-white text-zinc-900 py-3.5 px-4 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-zinc-100 active:scale-95 transition-all shadow-lg shadow-black/20 hover:shadow-xl hover:shadow-black/30 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    <span className="material-symbols-outlined text-xl">vpn_key</span>
                    <span>{acc.label}</span>
                    <span className="text-xs font-mono text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
                      {acc.username}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-8 text-center space-y-1.5">
              <p className="text-xs font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
                System Version v2.4.0
              </p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500">
                Authorized use only. All access is monitored.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-6">
          <button
            type="button"
            className="flex items-center gap-1.5 text-sm text-emerald-500/70 hover:text-emerald-400 transition-colors"
            onClick={() => window.open('/live', '_blank', 'noopener')}
          >
            <span className="material-symbols-outlined text-lg">live_tv</span>
            Live TV
          </button>
          <button
            type="button"
            className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
            onClick={() => setHelpOpen(true)}
          >
            <span className="material-symbols-outlined text-lg">help_outline</span>
            Need Help?
          </button>
        </div>
      </main>

      {/* Mobile Footer */}
      <div className="md:hidden p-8 border-t border-zinc-200 dark:border-zinc-900 bg-zinc-50 dark:bg-zinc-950 text-center">
        <p className="text-xs text-zinc-500 uppercase tracking-wider">
          Enterprise Operations Monitor demo
        </p>
      </div>
    </div>
  );
};
// End of Login Component

export default Login;
