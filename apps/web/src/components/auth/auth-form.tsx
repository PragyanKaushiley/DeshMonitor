"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { login, signup, type AuthErrorCode, type AuthUser } from "@/lib/auth";
import { useAuth } from "./auth-provider";
import { Desh } from "@/components/landing/Desh";

// Log in / Sign up, email and password — the only method the API supports.
// Field rules mirror the API's (a valid email, 8 to 200 characters), so the
// common mistakes are caught before a round trip.

type Mode = "login" | "signup";

const MAX_PASSWORD = 200;

// Deliberately loose: the API is the authority on what an address is. This
// only catches the obvious typo before asking the server.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FieldErrors {
  email?: string;
  password?: string;
}

function bannerFor(error: AuthErrorCode, mode: Mode): string | null {
  switch (error) {
    case "invalid_credentials":
      return "Email or password is incorrect.";
    case "rate_limited":
      // The two routes have different limits, so say which one applies.
      return mode === "signup"
        ? "Too many sign-ups from this network. Try again in an hour."
        : "Too many attempts. Try again in 15 minutes.";
    case "network":
      return "Couldn't reach देश Monitor. Check your connection and try again.";
    case "server":
      return "Something went wrong at our end. Try again.";
    // email_taken is shown on its own, with a link across to Log in.
    case "email_taken":
    case "invalid_input":
      return null;
  }
}

export function AuthForm({ onSignedIn }: { onSignedIn: (user: AuthUser) => void }) {
  const { setSignedIn } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [pending, setPending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [emailTaken, setEmailTaken] = useState(false);
  const ids = useId();
  const emailId = `${ids}-email`;
  const passwordId = `${ids}-password`;
  const signUp = mode === "signup";

  function switchTo(next: Mode) {
    setMode(next);
    setFieldErrors({});
    setBanner(null);
    setEmailTaken(false);
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");

    const errors: FieldErrors = {};
    if (!EMAIL_PATTERN.test(email)) errors.email = "Enter an email like name@example.com.";
    if (password.length < 8) errors.password = "Use at least 8 characters.";
    else if (password.length > MAX_PASSWORD) errors.password = `Use at most ${MAX_PASSWORD} characters.`;

    setFieldErrors(errors);
    setBanner(null);
    setEmailTaken(false);
    if (Object.keys(errors).length > 0) return;

    setPending(true);
    const result = await (signUp ? signup(email, password) : login(email, password));
    setPending(false);

    if (result.ok) {
      setSignedIn(result.user);
      onSignedIn(result.user);
      return;
    }

    if (result.error === "email_taken") {
      setEmailTaken(true);
      return;
    }
    if (result.error === "invalid_input") {
      // The API disagreed with the checks above — say so on the field most
      // likely at fault rather than showing a bare code.
      setFieldErrors({ email: "Enter an email like name@example.com." });
      return;
    }
    setBanner(bannerFor(result.error, mode));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-center gap-1.5 text-center md:items-start md:text-left">
        <span className="font-mono text-[10.5px] tracking-[0.25em] text-muted-foreground">
          {signUp ? "CREATE AN ACCOUNT" : "WELCOME BACK"}
        </span>
        <h2 className="font-display text-2xl leading-tight text-foreground">
          {signUp ? (
            <>
              Join <Desh tooltip={false} /> Monitor
            </>
          ) : (
            <>
              Log in to <Desh tooltip={false} /> Monitor
            </>
          )}
        </h2>
        <p className="max-w-[34ch] text-sm text-muted-foreground">
          {signUp ? "An email and a password is all it takes." : "Pick up where you left off."}
        </p>
      </div>

      <div role="tablist" aria-label="Log in or sign up" className="grid grid-cols-2 border-b border-border">
        {(["login", "signup"] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={mode === value}
            onClick={() => switchTo(value)}
            className={`-mb-px border-b px-0 py-2.5 font-mono text-[11px] tracking-[0.2em] transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400 ${
              mode === value
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {value === "login" ? "LOG IN" : "SIGN UP"}
          </button>
        ))}
      </div>

      {banner && (
        <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/8 px-3 py-2 text-[12.5px] leading-relaxed text-foreground">
          {banner}
        </p>
      )}
      {emailTaken && (
        <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/8 px-3 py-2 text-[12.5px] leading-relaxed text-foreground">
          That email already has an account.{" "}
          <button
            type="button"
            onClick={() => switchTo("login")}
            className="underline underline-offset-2 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
          >
            Log in instead
          </button>
        </p>
      )}

      {/* noValidate: the messages above are ours, in our wording. */}
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={emailId} className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground">
            EMAIL
          </label>
          <input
            id={emailId}
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            aria-invalid={fieldErrors.email ? true : undefined}
            aria-describedby={fieldErrors.email ? `${emailId}-error` : undefined}
            className="min-h-9.5 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/70 focus:border-foreground/50 focus:ring-3 focus:ring-teal-400/25 aria-invalid:border-destructive"
          />
          {fieldErrors.email && (
            <p id={`${emailId}-error`} className="text-xs text-destructive">
              {fieldErrors.email}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor={passwordId} className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground">
            PASSWORD
          </label>
          <input
            id={passwordId}
            name="password"
            type="password"
            // Tells password managers to offer a new password on sign up and
            // the saved one on log in.
            autoComplete={signUp ? "new-password" : "current-password"}
            placeholder={signUp ? "At least 8 characters" : "••••••••"}
            aria-invalid={fieldErrors.password ? true : undefined}
            aria-describedby={fieldErrors.password ? `${passwordId}-error` : signUp ? `${passwordId}-help` : undefined}
            className="min-h-9.5 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/70 focus:border-foreground/50 focus:ring-3 focus:ring-teal-400/25 aria-invalid:border-destructive"
          />
          {fieldErrors.password ? (
            <p id={`${passwordId}-error`} className="text-xs text-destructive">
              {fieldErrors.password}
            </p>
          ) : (
            signUp && (
              <p id={`${passwordId}-help`} className="text-xs text-muted-foreground">
                At least 8 characters.
              </p>
            )
          )}
        </div>

        <button
          type="submit"
          disabled={pending}
          className="mt-1 inline-flex min-h-10 items-center justify-center gap-2 border border-foreground/30 bg-background font-display text-sm tracking-[0.2em] text-foreground transition-colors outline-none hover:border-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400 disabled:opacity-60"
        >
          {pending ? "ONE MOMENT…" : signUp ? "SIGN UP" : "LOG IN"}
          {!pending && <span aria-hidden>→</span>}
        </button>
      </form>

      <p className="text-xs leading-relaxed text-muted-foreground">
        Logging in records your IP address, approximate location and browser to keep your account secure, and sets a
        cookie that keeps you logged in for 30 days.{" "}
        <Link href="/privacy" className="underline underline-offset-2 hover:text-foreground">
          Privacy policy
        </Link>
      </p>
    </div>
  );
}
