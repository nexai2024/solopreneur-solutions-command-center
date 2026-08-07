"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CollapsibleWidgetProps = {
  /** Stable id for localStorage persistence */
  id: string;
  title: ReactNode;
  /** Optional right-side actions (e.g. “View all”) — clicks won’t toggle collapse */
  actions?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
  /** Compact summary shown when collapsed */
  collapsedSummary?: ReactNode;
  className?: string;
  contentClassName?: string;
};

export function CollapsibleWidget({
  id,
  title,
  actions,
  defaultOpen = true,
  children,
  collapsedSummary,
  className,
  contentClassName,
}: CollapsibleWidgetProps) {
  const storageKey = `soloos:dashboard-widget:${id}`;
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored === "0") setOpen(false);
      if (stored === "1") setOpen(true);
    } catch {
      // ignore private mode / blocked storage
    }
  }, [storageKey]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    try {
      localStorage.setItem(storageKey, next ? "1" : "0");
    } catch {
      // ignore
    }
  };

  return (
    <Card className={cn("overflow-hidden", className)}>
      <Collapsible open={open} onOpenChange={handleOpenChange}>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <div className="flex items-center gap-1 min-w-0 flex-1">
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                aria-label={open ? "Collapse section" : "Expand section"}
              >
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform duration-200",
                    open ? "rotate-0" : "-rotate-90"
                  )}
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="text-left min-w-0 truncate rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <CardTitle className="text-lg truncate">{title}</CardTitle>
              </button>
            </CollapsibleTrigger>
          </div>
          {actions ? (
            <div
              className="flex items-center gap-2 shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              {actions}
            </div>
          ) : null}
        </CardHeader>

        {!open && collapsedSummary ? (
          <CardContent className="pt-0 pb-4 text-sm text-muted-foreground">
            {collapsedSummary}
          </CardContent>
        ) : null}

        <CollapsibleContent>
          <CardContent className={cn("pt-0", contentClassName)}>
            {children}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
