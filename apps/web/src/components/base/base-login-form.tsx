import type { FormEvent, ReactNode } from "react";
import type { ComponentType } from "react";
import { AlertCircle, Eye, EyeOff, Key, Loader2, Lock, LogIn, User } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { BaseCard } from "./base-card";
import { BaseFormField } from "./base-form-field";

export interface BaseLoginDemoAccount {
  username: string;
  password: string;
  label: string;
  role?: string;
  note?: string;
  icon?: ComponentType<{ className?: string }>;
}

export interface BaseLoginFormProps {
  title?: ReactNode;
  description?: ReactNode;
  username: string;
  password: string;
  rememberMe?: boolean;
  showPassword?: boolean;
  loading?: boolean;
  error?: string;
  demoAccounts?: BaseLoginDemoAccount[];
  submitLabel?: string;
  usernameLabel?: string;
  passwordLabel?: string;
  rememberLabel?: string;
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onRememberMeChange?: (checked: boolean) => void;
  onShowPasswordChange?: (checked: boolean) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onDemoSelect?: (account: BaseLoginDemoAccount) => void;
  footer?: ReactNode;
}

export function BaseLoginForm({
  title = "Welcome back",
  description = "Access your operational dashboard",
  username,
  password,
  rememberMe = false,
  showPassword = false,
  loading = false,
  error,
  demoAccounts = [],
  submitLabel = "Sign in",
  usernameLabel = "Identity",
  passwordLabel = "Security key",
  rememberLabel = "Keep me signed in",
  onUsernameChange,
  onPasswordChange,
  onRememberMeChange,
  onShowPasswordChange,
  onSubmit,
  onDemoSelect,
  footer,
}: BaseLoginFormProps) {
  return (
    <BaseCard title={title} description={description} className="login-card-elevated w-full max-w-md">
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="size-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <form onSubmit={onSubmit} className="grid gap-5">
        <BaseFormField label={usernameLabel} htmlFor="username" required>
          <div className="relative">
            <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="username"
              name="username"
              type="text"
              value={username}
              onChange={(event) => onUsernameChange(event.target.value)}
              placeholder="Username"
              className="pl-9"
              required
            />
          </div>
        </BaseFormField>
        <BaseFormField label={passwordLabel} htmlFor="password" required>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
              placeholder="Password"
              className="pl-9 pr-10"
              required
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="absolute right-1 top-1/2 -translate-y-1/2"
              onClick={() => onShowPasswordChange?.(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff /> : <Eye />}
            </Button>
          </div>
        </BaseFormField>
        {onRememberMeChange && (
          <label className="flex cursor-pointer items-center gap-3 text-xs font-medium text-muted-foreground">
            <Checkbox checked={rememberMe} onCheckedChange={(value) => onRememberMeChange(Boolean(value))} />
            {rememberLabel}
          </label>
        )}
        <Button type="submit" className="h-11 w-full uppercase tracking-wide" disabled={loading}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : <LogIn data-icon="inline-start" />}
          {submitLabel}
        </Button>
      </form>
      {demoAccounts.length > 0 && (
        <>
          <Separator className="my-6" />
          <div className="grid gap-3">
            <p className="text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Portfolio showcase
            </p>
            {demoAccounts.map((account) => {
              const Icon = account.icon ?? Key;
              return (
                <Button
                  key={account.username}
                  type="button"
                  variant="secondary"
                  className="h-auto justify-between p-4"
                  disabled={loading}
                  onClick={() => onDemoSelect?.(account)}
                >
                  <span className="flex min-w-0 items-center gap-3 text-left">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-background">
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{account.label}</span>
                      <span className="block truncate font-mono text-xs text-muted-foreground">
                        Login: {account.username}
                      </span>
                    </span>
                  </span>
                  <span className="text-xs uppercase text-primary">Quick start</span>
                </Button>
              );
            })}
          </div>
        </>
      )}
      {footer}
    </BaseCard>
  );
}
