"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { AccountSettingsPanel } from "@/components/settings/account-settings-panel";
import { ProductionReadinessPanel } from "@/components/settings/production-readiness-panel";
import type { ProductionReadinessDTO } from "@/lib/actions/production-readiness";
import { getProductionReadiness } from "@/lib/actions/production-readiness";

export function SettingsWorkspace({
  initialReadiness,
}: {
  initialReadiness: ProductionReadinessDTO;
}) {
  const [readiness, setReadiness] = useState(initialReadiness);
  const [isPending, startTransition] = useTransition();

  const handleRefresh = () => {
    startTransition(async () => {
      const next = await getProductionReadiness();
      setReadiness(next);
    });
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Production readiness, account privacy, and data management.
        </p>
      </div>

      <ProductionReadinessPanel
        data={readiness}
        onRefresh={handleRefresh}
        isRefreshing={isPending}
      />

      <AccountSettingsPanel />

      <p className="text-xs text-muted-foreground">
        See also{" "}
        <Link href="/privacy" className="text-primary hover:underline">
          Privacy Policy
        </Link>{" "}
        and{" "}
        <Link href="/terms" className="text-primary hover:underline">
          Terms of Service
        </Link>
        .
      </p>
    </div>
  );
}
