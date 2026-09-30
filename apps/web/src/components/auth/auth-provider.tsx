"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { logout as logoutRequest, me, type AuthUser, type Session } from "@/lib/auth";

// One /auth/me call per page load, shared by everything that needs to know
// who is signed in. `status` starts as "loading" so the nav can hold the
// avatar's space instead of popping it in.

type AuthStatus = "loading" | "signed-out" | "signed-in";

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  sessionStartedAt: string | null;
  // Called after a successful login or signup: the response already carries
  // the user, so there's no second round trip.
  setSignedIn: (user: AuthUser) => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [session, setSession] = useState<Session>({ user: null, sessionStartedAt: null });

  useEffect(() => {
    let cancelled = false;
    void me().then((result) => {
      if (cancelled) return;
      setSession(result);
      setStatus(result.user ? "signed-in" : "signed-out");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const setSignedIn = useCallback((user: AuthUser) => {
    setSession({ user, sessionStartedAt: new Date().toISOString() });
    setStatus("signed-in");
  }, []);

  const signOut = useCallback(async () => {
    // Sign out locally first: the visitor asked to, so the UI shouldn't wait
    // on the network, and a failed request is logged rather than surfaced.
    setSession({ user: null, sessionStartedAt: null });
    setStatus("signed-out");
    await logoutRequest();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user: session.user, sessionStartedAt: session.sessionStartedAt, setSignedIn, signOut }),
    [status, session, setSignedIn, signOut],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside <AuthProvider>");
  return value;
}
