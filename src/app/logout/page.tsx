"use client";

import { useEffect, useState } from "react";
import { useClerk } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";
import { LAST_ACTIVITY_KEY } from "@/lib/auth-session";

export default function LogoutPage() {
  const { signOut } = useClerk();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        localStorage.removeItem(LAST_ACTIVITY_KEY);
      } catch {
        // ignore
      }
      try {
        await signOut({ redirectUrl: "/" });
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Sign out failed");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [signOut]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="text-center space-y-3">
        {error ? (
          <>
            <p className="text-sm text-destructive">{error}</p>
            <a href="/" className="text-sm text-primary hover:underline">
              Return home
            </a>
          </>
        ) : (
          <>
            <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Signing out…</p>
          </>
        )}
      </div>
    </main>
  );
}
