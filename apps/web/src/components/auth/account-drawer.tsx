"use client";

import { useEffect, useRef, useState } from "react";
import { useLenis } from "lenis/react";
import { X } from "lucide-react";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { AccountAvatar } from "./account-avatar";
import { AccountMenu } from "./account-menu";
import { AuthForm } from "./auth-form";
import { useAuth } from "./auth-provider";

// The nav's account button and the sheet it opens. The sheet slides in from
// the right on desktop and up from the bottom on phones — the same 768px
// breakpoint the landing page uses elsewhere.

const DESKTOP = "(min-width: 768px)";

function useDrawerDirection(open: boolean): "right" | "bottom" {
  // Starts at "bottom" so the server and the first client render agree; the
  // effect settles it before anything opens.
  const [direction, setDirection] = useState<"right" | "bottom">("bottom");

  useEffect(() => {
    const query = window.matchMedia(DESKTOP);
    // Never swap sides mid-flight: a resize across the breakpoint while the
    // sheet is open waits until it closes.
    const apply = () => {
      if (!open) setDirection(query.matches ? "right" : "bottom");
    };
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, [open]);

  return direction;
}

export function AccountDrawer() {
  const { status, user, sessionStartedAt, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const direction = useDrawerDirection(open);
  const avatarRef = useRef<HTMLButtonElement>(null);
  const lenis = useLenis();

  // The landing page's smooth scrolling keeps running behind a modal, which
  // scrubs the pinned scenes while the sheet is open. Other pages have no
  // Lenis instance, so this is simply skipped there.
  useEffect(() => {
    if (!lenis) return;
    if (open) lenis.stop();
    else lenis.start();
    return () => {
      lenis.start();
    };
  }, [open, lenis]);

  function close() {
    setOpen(false);
    // Focus belongs back on the button that opened the sheet.
    requestAnimationFrame(() => avatarRef.current?.focus({ preventScroll: true }));
  }

  // While the first /auth/me call is in flight, hold the avatar's space so
  // the nav doesn't shift when it arrives.
  if (status === "loading") return <span className="size-8" aria-hidden />;

  const right = direction === "right";

  return (
    <>
      <AccountAvatar ref={avatarRef} user={user} expanded={open} onClick={() => setOpen((value) => !value)} />

      <Drawer
        open={open}
        onOpenChange={(next) => (next ? setOpen(true) : close())}
        direction={direction}
        // vaul leaves focus on the page by default; a dialog should take it,
        // and its focus trap then keeps Tab inside until the sheet closes.
        autoFocus
        // Reopening after a direction change would otherwise animate from
        // the old edge.
        key={direction}
      >
        <DrawerContent
          showHandle={!right}
          className={right ? "gap-4 px-7 pt-5 pb-7" : "items-center gap-4 px-6 pt-3 pb-7"}
          aria-describedby={undefined}
        >
          {right && (
            <div className="flex w-full items-center justify-between">
              <span className="font-mono text-[10.5px] tracking-[0.25em] text-muted-foreground">ACCOUNT</span>
              <DrawerClose
                aria-label="Close"
                className="grid size-8 place-items-center rounded-md text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
              >
                <X aria-hidden className="size-4" />
              </DrawerClose>
            </div>
          )}

          {/* Named for screen readers; the visible heading lives in the form. */}
          <DrawerTitle className="sr-only">{user ? "Your account" : "Log in or sign up"}</DrawerTitle>
          <DrawerDescription className="sr-only">
            {user ? "Your account details and sign-out." : "Log in to देश Monitor, or create an account."}
          </DrawerDescription>

          <div className="w-full max-w-[380px] overflow-y-auto">
            {user ? (
              <AccountMenu
                user={user}
                sessionStartedAt={sessionStartedAt}
                onLogOut={() => {
                  // Close first so the sheet animates out, then sign out —
                  // the avatar returns to its dashed state behind it.
                  close();
                  void signOut();
                }}
                onPrivacyChoices={close}
              />
            ) : (
              <AuthForm onSignedIn={() => close()} />
            )}
          </div>

          {!right && (
            <DrawerClose className="font-mono text-[11px] tracking-[0.2em] text-muted-foreground underline underline-offset-4 outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400">
              CLOSE
            </DrawerClose>
          )}
        </DrawerContent>
      </Drawer>
    </>
  );
}
