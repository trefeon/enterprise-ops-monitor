import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { LineChart, Loader2, Eye, EyeOff, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { apiClient } from "@/lib/api/client";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [orgName, setOrgName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (!orgName.trim()) {
      setError("Organization name is required");
      return;
    }

    setIsLoading(true);

    try {
      const res = await apiClient.post("/auth/register", {
        email: email.trim(),
        password,
        orgName: orgName.trim(),
      });

      const data = res as any;

      if (data.ok) {
        const { token, user } = data.data || {};
        if (token) {
          localStorage.setItem("token", token);
          if (user) {
            localStorage.setItem("user", JSON.stringify(user));
          }
          // Set auth header for subsequent requests
          apiClient.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        }
        toast.success("Account created", {
          description: "Welcome! Redirecting to your organization dashboard...",
        });
        navigate("/app");
      } else {
        setError(data.error?.message || "Registration failed. Please try again.");
      }
    } catch (err: any) {
      const message =
        err?.message || err?.response?.data?.error?.message || "An unexpected error occurred";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-shell" data-debug-component-root="Signup">
      <section className="relative hidden overflow-hidden border-r border-border bg-background p-12 md:flex md:flex-col md:justify-between lg:p-16">
        <div className="pointer-events-none absolute inset-0 opacity-100">
          <div className="absolute left-0 top-0 h-full w-full bg-radial-login" />
        </div>
        <div className="z-10 flex items-center gap-3 font-display font-medium tracking-normal text-foreground">
          <div className="flex size-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <LineChart aria-hidden="true" className="size-5" />
          </div>
          <span className="login-brand-label">Ops Starter</span>
        </div>
        <div className="z-10 max-w-lg">
          <h1 className="mb-6 font-display text-5xl font-medium leading-tight tracking-normal text-foreground">
            Enterprise Ops <br /> Starter
          </h1>
          <p className="mb-10 max-w-md text-base leading-7 text-muted-foreground">
            Create your organization account to get started with real-time branch operations, compliance monitoring, and system health.
          </p>
        </div>
        <div className="z-10 font-mono text-xs text-muted-foreground">
          &copy; 2026 Enterprise Ops Starter
        </div>
      </section>

      <main className="relative flex flex-1 flex-col items-center justify-center border-l border-border bg-card/95 p-6 md:p-10 lg:p-12">
        <div className="mb-8 flex items-center gap-3 self-start md:hidden">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <LineChart aria-hidden="true" className="size-5" />
          </div>
          <span className="login-brand-label font-display font-medium">Ops Starter</span>
        </div>

        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Create an account</CardTitle>
            <CardDescription>Set up your organization to get started</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="size-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <form onSubmit={handleSubmit} className="grid gap-5">
              <Field>
                <FieldLabel htmlFor="email">
                  Email <span className="text-destructive">*</span>
                </FieldLabel>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="orgName">
                  Organization name <span className="text-destructive">*</span>
                </FieldLabel>
                <Input
                  id="orgName"
                  name="orgName"
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="My Company"
                  required
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="password">
                  Password <span className="text-destructive">*</span>
                </FieldLabel>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    className="pr-10"
                    required
                    minLength={8}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff /> : <Eye />}
                  </Button>
                </div>
              </Field>

              <Field>
                <FieldLabel htmlFor="confirmPassword">
                  Confirm password <span className="text-destructive">*</span>
                </FieldLabel>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className="pr-10"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? <EyeOff /> : <Eye />}
                  </Button>
                </div>
              </Field>

              <Button
                type="submit"
                className="h-11 w-full uppercase tracking-wide"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <LineChart aria-hidden="true" data-icon="inline-start" className="size-4" />
                )}
                Create account
              </Button>
            </form>

            <Separator className="my-6" />

            <div className="flex flex-col gap-3">
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full gap-2"
                onClick={() => {
                  window.location.href = "/api/auth/google";
                }}
              >
                <svg className="size-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Sign up with Google
              </Button>
            </div>

            <p className="mt-6 text-center text-xs text-muted-foreground">
              Already have an account?{" "}
              <Link
                to="/login"
                className="font-medium text-primary hover:text-primary/80 underline underline-offset-2"
              >
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </main>

      <div className="border-t border-border bg-card p-6 text-center md:hidden">
        <p className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
          Enterprise Ops Starter
        </p>
      </div>
    </div>
  );
}
