import { notFound } from "next/navigation";
import { getPublicEarlyAccess } from "@/lib/actions/early-access";
import { EarlyAccessSignupForm } from "@/components/early-access/signup-form";

export const dynamic = "force-dynamic";

export default async function EarlyAccessPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = await getPublicEarlyAccess(slug);
  if (!project) notFound();

  const tagline = project.artifacts.find((a) => a.kind === "tagline")?.body;
  const valueProp = project.artifacts.find(
    (a) => a.kind === "value_proposition"
  )?.body;
  const logo = project.artifacts.find((a) => a.kind === "logo")?.url;

  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-muted/60 via-background to-background">
      <div className="mx-auto max-w-3xl px-6 py-16 sm:py-24">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">
          Early access
        </p>
        {logo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logo}
            alt=""
            className="h-10 w-auto mb-6 object-contain"
          />
        )}
        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-balance">
          {project.earlyAccessHeadline || project.name}
        </h1>
        <p className="mt-4 text-lg text-muted-foreground text-pretty max-w-2xl">
          {project.earlyAccessBody ||
            tagline ||
            valueProp ||
            `Join the waitlist for ${project.name}.`}
        </p>

        {project.features.length > 0 && (
          <ul className="mt-8 space-y-2 text-sm">
            {project.features.map((f) => (
              <li key={f.title} className="flex gap-2">
                <span className="text-muted-foreground">—</span>
                <span>{f.title}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-10">
          <EarlyAccessSignupForm slug={slug} />
        </div>
      </div>
    </main>
  );
}
