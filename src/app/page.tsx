import Link from "next/link";
import { SignInButton, SignedIn, SignedOut } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import {
  Lightbulb,
  Kanban,
  Users,
  TrendingUp,
  CreditCard,
  GitBranch,
  ArrowRight,
} from "lucide-react";

const features = [
  {
    icon: Lightbulb,
    title: "Brainstorm & Score",
    description: "Validate ideas with the soloOS 7-dimension AI scoring engine.",
  },
  {
    icon: Kanban,
    title: "Build Tracker",
    description: "Manage milestones and tasks from idea to shipped product.",
  },
  {
    icon: Users,
    title: "Lead Finder",
    description: "Discover and track prospects linked to your projects.",
  },
  {
    icon: TrendingUp,
    title: "Growth Engine",
    description: "Plan content, SEO, and distribution across channels.",
  },
  {
    icon: CreditCard,
    title: "Revenue",
    description: "Track MRR, subscriptions, and transaction history.",
  },
  {
    icon: GitBranch,
    title: "Repository",
    description: "Connect GitHub repos and monitor build activity.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold">
              S
            </div>
            <span className="font-bold text-lg">Solopreneur OS</span>
          </div>
          <div className="flex items-center gap-3">
            <SignedOut>
              <SignInButton mode="modal">
                <Button variant="outline">Sign in</Button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <Button asChild>
                <Link href="/dashboard">Open Dashboard</Link>
              </Button>
            </SignedIn>
          </div>
        </div>
      </header>

      <main>
        <section className="max-w-6xl mx-auto px-6 py-20 text-center">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight max-w-3xl mx-auto">
            The all-in-one operating system for solopreneurs
          </h1>
          <p className="text-lg text-muted-foreground mt-6 max-w-2xl mx-auto">
            From idea validation to build tracking, leads, growth, and revenue —
            run your entire solo business from one command center.
          </p>
          <div className="flex items-center justify-center gap-4 mt-10">
            <SignedOut>
              <SignInButton mode="modal">
                <Button size="lg">
                  Get started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <Button size="lg" asChild>
                <Link href="/dashboard">
                  Go to Command Center
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </SignedIn>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-6 pb-20">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="rounded-xl border border-border bg-card p-6"
                >
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        <Link href="/privacy" className="hover:text-foreground mx-2">
          Privacy
        </Link>
        ·
        <Link href="/terms" className="hover:text-foreground mx-2">
          Terms
        </Link>
      </footer>
    </div>
  );
}
