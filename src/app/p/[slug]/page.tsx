import { notFound } from "next/navigation";
import Link from "next/link";
import { getPublicPortfolio } from "@/lib/actions/portfolio";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function PublicPortfolioPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const portfolio = await getPublicPortfolio(slug);
  if (!portfolio) notFound();

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-6 py-16 sm:py-20">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">
          Portfolio
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-balance">
          {portfolio.portfolioHeadline ||
            `${portfolio.name || "Founder"}’s products`}
        </h1>
        {portfolio.portfolioBio && (
          <p className="mt-4 text-muted-foreground whitespace-pre-wrap text-pretty max-w-3xl">
            {portfolio.portfolioBio}
          </p>
        )}

        <div className="mt-12 space-y-6">
          {portfolio.projects.map((project) => {
            const [tagline, ...rest] = (project.portfolioBlurb || "")
              .split("\n\n")
              .filter(Boolean);
            const description =
              rest.join("\n\n") || project.description || tagline || "";

            return (
              <article
                key={project.id}
                className="rounded-2xl border px-5 py-5 space-y-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="text-xl font-semibold">{project.name}</h2>
                    {tagline && tagline !== description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {tagline}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {project.status}
                  </Badge>
                </div>
                {description && (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {description}
                  </p>
                )}
                {project.brandAudience && (
                  <p className="text-xs text-muted-foreground">
                    Audience: {project.brandAudience}
                  </p>
                )}
                {project.features.length > 0 && (
                  <ul className="text-sm space-y-1">
                    {project.features.map((f) => (
                      <li key={f.title} className="flex gap-2">
                        <span className="text-muted-foreground">•</span>
                        <span>
                          {f.title}{" "}
                          <span className="text-muted-foreground text-xs">
                            ({f.category})
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex flex-wrap gap-3 pt-1 text-sm">
                  {project.productionUrl && (
                    <a
                      href={project.productionUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline"
                    >
                      Live site
                    </a>
                  )}
                  {project.earlyAccessEnabled && project.earlyAccessSlug && (
                    <Link
                      href={`/early/${project.earlyAccessSlug}`}
                      className="text-primary hover:underline"
                    >
                      Early access
                    </Link>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}
