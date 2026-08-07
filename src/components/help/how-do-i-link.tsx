import Link from "next/link";
import { CircleHelp } from "lucide-react";
import { cn } from "@/lib/utils";

/** Stable anchors from `HELP_SECTIONS` in `@/lib/help/help-content`. */
export type HelpAnchor =
  | "what-is"
  | "getting-started"
  | "navigation"
  | "first-week"
  | "command-center"
  | "brainstorm"
  | "build-tracker"
  | "lead-finder"
  | "growth-engine"
  | "revenue"
  | "repository"
  | "settings"
  | "troubleshooting"
  | "glossary";

type HowDoILinkProps = {
  section: HelpAnchor;
  /** Defaults to “How do I…?” */
  label?: string;
  className?: string;
};

/**
 * Small support link for empty states — jumps to the in-app Help section.
 */
export function HowDoILink({
  section,
  label = "How do I…?",
  className,
}: HowDoILinkProps) {
  return (
    <Link
      href={`/dashboard/help#${section}`}
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline",
        className
      )}
    >
      <CircleHelp className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {label}
    </Link>
  );
}
