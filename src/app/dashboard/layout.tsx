import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import {
  Lightbulb,
  Kanban,
  Users,
  TrendingUp,
  CreditCard,
  GitBranch,
  LayoutDashboard,
  Settings,
  CircleHelp,
} from "lucide-react";

const navigation = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "Brainstorm & Ideas", href: "/dashboard/brainstorm", icon: Lightbulb },
  { name: "Build Tracker", href: "/dashboard/build-tracker", icon: Kanban },
  { name: "Lead Finder", href: "/dashboard/lead-finder", icon: Users },
  { name: "Growth Engine", href: "/dashboard/growth-engine", icon: TrendingUp },
  { name: "Revenue & Billing", href: "/dashboard/revenue", icon: CreditCard },
  { name: "Repository & VCS", href: "/dashboard/repository", icon: GitBranch },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
  { name: "Help", href: "/dashboard/help", icon: CircleHelp },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-border bg-card flex flex-col justify-between p-4">
        <div className="space-y-6">
          <div className="flex items-center gap-2 px-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold">
              S
            </div>
            <span className="font-bold text-lg">Solopreneur OS</span>
          </div>

          <nav className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Account Controls */}
        <div className="space-y-3 pt-4 border-t border-border px-2">
          <UserButton showName />
          <div className="flex gap-3 text-xs text-muted-foreground">
            <Link href="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-foreground">
              Terms
            </Link>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}