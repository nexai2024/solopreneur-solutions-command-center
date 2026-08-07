"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CircleHelp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  HELP_SECTIONS,
  type HelpBlock,
  type HelpSection,
} from "@/lib/help/help-content";

function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}

function HelpBlockView({ block }: { block: HelpBlock }) {
  switch (block.type) {
    case "paragraph":
      return <p className="text-sm text-muted-foreground leading-relaxed">{block.text}</p>;
    case "callout":
      return (
        <p className="text-sm leading-relaxed rounded-md border border-border bg-muted/40 px-3 py-2">
          {block.text}
        </p>
      );
    case "list":
      return (
        <ul className="list-disc pl-5 space-y-1.5 text-sm text-muted-foreground">
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );
    case "steps":
      return (
        <ol className="list-decimal pl-5 space-y-1.5 text-sm text-muted-foreground">
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      );
    case "table":
      return (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left font-medium px-3 py-2">{block.headers[0]}</th>
                <th className="text-left font-medium px-3 py-2">{block.headers[1]}</th>
              </tr>
            </thead>
            <tbody>
              {block.rows.map(([a, b]) => (
                <tr key={`${a}-${b}`} className="border-b border-border last:border-0">
                  <td className="px-3 py-2 font-medium align-top">{a}</td>
                  <td className="px-3 py-2 text-muted-foreground align-top">{b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    default:
      return null;
  }
}

function HelpSectionView({ section }: { section: HelpSection }) {
  return (
    <section
      id={section.id}
      className="scroll-mt-8 space-y-4 border-b border-border pb-10 last:border-0"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-xl font-semibold tracking-tight">{section.title}</h2>
        {section.openHref && section.openLabel ? (
          <Button asChild variant="outline" size="sm">
            <Link href={section.openHref}>
              {section.openLabel}
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        ) : null}
      </div>
      <div className="space-y-3">
        {section.blocks.map((block, i) => (
          <HelpBlockView key={`${section.id}-${i}`} block={block} />
        ))}
      </div>
    </section>
  );
}

export function HelpWorkspace() {
  const [activeId, setActiveId] = useState(HELP_SECTIONS[0]?.id ?? "");

  useEffect(() => {
    const applyHash = () => {
      const hash = window.location.hash.replace(/^#/, "");
      if (!hash) return;
      const exists = HELP_SECTIONS.some((s) => s.id === hash);
      if (!exists) return;
      setActiveId(hash);
      // Allow layout to paint before scrolling
      requestAnimationFrame(() => scrollToSection(hash));
    };

    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, []);

  useEffect(() => {
    const sections = HELP_SECTIONS.map((s) => document.getElementById(s.id)).filter(
      (el): el is HTMLElement => Boolean(el)
    );
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const top = visible[0]?.target.id;
        if (top) setActiveId(top);
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: [0.1, 0.25, 0.5] }
    );

    for (const el of sections) observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <div className="flex items-center gap-2 text-primary mb-2">
          <CircleHelp className="h-5 w-5" />
          <span className="text-sm font-medium">In-app help</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Help & Training</h1>
        <p className="text-muted-foreground mt-1">
          How to use Solopreneur OS—no technical background required. Use the
          contents links or deep links like{" "}
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
            /dashboard/help#brainstorm
          </code>
          .
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <nav
          aria-label="Help contents"
          className="lg:sticky lg:top-0 lg:self-start space-y-1 max-h-[calc(100vh-6rem)] overflow-y-auto pb-4"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-2 mb-2">
            Contents
          </p>
          {HELP_SECTIONS.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              onClick={(e) => {
                e.preventDefault();
                setActiveId(section.id);
                window.history.replaceState(null, "", `#${section.id}`);
                scrollToSection(section.id);
              }}
              className={cn(
                "block rounded-md px-2 py-1.5 text-sm transition-colors",
                activeId === section.id
                  ? "bg-accent text-accent-foreground font-medium"
                  : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
              )}
            >
              {section.title}
            </a>
          ))}
        </nav>

        <div className="space-y-10 min-w-0">
          {HELP_SECTIONS.map((section) => (
            <HelpSectionView key={section.id} section={section} />
          ))}
          <p className="text-xs text-muted-foreground">
            Feature availability can depend on your plan and connected services
            (for example payments or GitHub). Start with Brainstorm → Promote →
            Build Tracker, then add Lead Finder and Growth Engine when you&apos;re
            ready.
          </p>
        </div>
      </div>
    </div>
  );
}
