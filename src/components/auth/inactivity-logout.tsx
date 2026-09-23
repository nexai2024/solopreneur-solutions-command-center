"use client";

import { useEffect, useRef } from "react";
import { useAuth, useClerk } from "@clerk/nextjs";
import { toast } from "sonner";
import {
  INACTIVITY_REDIRECT,
  INACTIVITY_TIMEOUT_MS,
  LAST_ACTIVITY_KEY,
} from "@/lib/auth-session";

const ACTIVITY_EVENTS = [
  "mousedown",
  "keydown",
  "touchstart",
  "scroll",
  "mousemove",
  "pointerdown",
] as const;

/** How often we persist activity / reset the timer (ms). */
const TOUCH_THROTTLE_MS = 30_000;

/**
 * Signs the user out after {@link INACTIVITY_TIMEOUT_MS} with no interaction.
 * Syncs activity across tabs via localStorage.
 */
export function InactivityLogout() {
  const { isLoaded, isSignedIn } = useAuth();
  const { signOut } = useClerk();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTouchRef = useRef(0);
  const signingOutRef = useRef(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    const clearTimer = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const forceSignOut = async () => {
      if (signingOutRef.current) return;
      signingOutRef.current = true;
      clearTimer();
      try {
        localStorage.removeItem(LAST_ACTIVITY_KEY);
      } catch {
        // ignore
      }
      toast.message("Signed out after 1 hour of inactivity");
      await signOut({ redirectUrl: INACTIVITY_REDIRECT });
    };

    const schedule = (fromTs: number) => {
      clearTimer();
      const remaining = INACTIVITY_TIMEOUT_MS - (Date.now() - fromTs);
      if (remaining <= 0) {
        void forceSignOut();
        return;
      }
      timerRef.current = setTimeout(() => {
        void forceSignOut();
      }, remaining);
    };

    const touch = (force = false) => {
      const now = Date.now();
      if (!force && now - lastTouchRef.current < TOUCH_THROTTLE_MS) return;
      lastTouchRef.current = now;
      try {
        localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
      } catch {
        // ignore
      }
      schedule(now);
    };

    // Resume: if already idle past the window, sign out immediately
    let last = 0;
    try {
      last = Number(localStorage.getItem(LAST_ACTIVITY_KEY) || 0);
    } catch {
      last = 0;
    }
    if (last > 0 && Date.now() - last >= INACTIVITY_TIMEOUT_MS) {
      void forceSignOut();
      return;
    }

    touch(true);

    const onActivity = () => touch(false);
    const onVisible = () => {
      if (document.visibilityState === "visible") touch(true);
    };
    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, onActivity, { passive: true });
    }
    document.addEventListener("visibilitychange", onVisible);

    const onStorage = (e: StorageEvent) => {
      if (e.key !== LAST_ACTIVITY_KEY || e.newValue == null) return;
      const ts = Number(e.newValue);
      if (!Number.isFinite(ts)) return;
      lastTouchRef.current = ts;
      schedule(ts);
    };
    window.addEventListener("storage", onStorage);

    return () => {
      clearTimer();
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, onActivity);
      }
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("storage", onStorage);
    };
  }, [isLoaded, isSignedIn, signOut]);

  return null;
}
