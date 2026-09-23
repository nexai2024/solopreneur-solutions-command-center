"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

/** Shows a one-time toast when redirected after inactivity logout. */
export function InactiveSignOutToast() {
  const params = useSearchParams();

  useEffect(() => {
    if (params.get("reason") !== "inactive") return;
    toast.message("You were signed out after 1 hour of inactivity");
    const url = new URL(window.location.href);
    url.searchParams.delete("reason");
    window.history.replaceState({}, "", url.pathname + url.search);
  }, [params]);

  return null;
}
