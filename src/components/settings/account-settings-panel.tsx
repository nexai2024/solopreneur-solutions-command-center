"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Download, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { exportUserData, deleteUserAccount } from "@/lib/actions/gdpr";

export function AccountSettingsPanel() {
  const [isPending, startTransition] = useTransition();

  const handleExport = () => {
    startTransition(async () => {
      try {
        const data = await exportUserData();
        const blob = new Blob([JSON.stringify(data, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `solopreneur-os-export-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Data exported");
      } catch {
        toast.error("Export failed");
      }
    });
  };

  const handleDelete = () => {
    if (
      !confirm(
        "Permanently delete your account and all data? This cannot be undone."
      )
    ) {
      return;
    }
    startTransition(async () => {
      try {
        await deleteUserAccount();
        toast.success("Account deleted");
        window.location.href = "/";
      } catch {
        toast.error("Deletion failed");
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Privacy & data</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Export all your projects, ideas, leads, and related data (GDPR). Account
          deletion removes your records from our database.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} disabled={isPending}>
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Export my data
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={isPending}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete account
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
