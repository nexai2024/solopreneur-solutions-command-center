"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { assertAiRateLimit } from "@/lib/rate-limit";
import { slugify } from "@/lib/project-features";
import { generatePortfolioPack } from "@/lib/ai/product/portfolio-pack";

export type PortfolioSettingsDTO = {
  portfolio_slug: string | null;
  portfolio_public: boolean;
  portfolio_headline: string | null;
  portfolio_bio: string | null;
  public_url: string | null;
};

function publicOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}

export async function getPortfolioSettings(): Promise<PortfolioSettingsDTO> {
  const user = await requireAuth();
  const row = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: {
      portfolioSlug: true,
      portfolioPublic: true,
      portfolioHeadline: true,
      portfolioBio: true,
    },
  });
  return {
    portfolio_slug: row.portfolioSlug,
    portfolio_public: row.portfolioPublic,
    portfolio_headline: row.portfolioHeadline,
    portfolio_bio: row.portfolioBio,
    public_url: row.portfolioSlug
      ? `${publicOrigin()}/p/${row.portfolioSlug}`
      : null,
  };
}

export async function updatePortfolioSettings(input: {
  portfolioSlug?: string;
  portfolioPublic?: boolean;
  portfolioHeadline?: string | null;
  portfolioBio?: string | null;
}): Promise<PortfolioSettingsDTO> {
  const user = await requireAuth();

  let slug = input.portfolioSlug?.trim().toLowerCase();
  if (slug !== undefined) {
    slug = slugify(slug);
    if (!slug) throw new Error("Portfolio slug is required when publishing");
    const taken = await prisma.user.findFirst({
      where: { portfolioSlug: slug, NOT: { id: user.id } },
    });
    if (taken) throw new Error("That portfolio slug is already taken");
  } else if (input.portfolioPublic) {
    const existing = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { portfolioSlug: true, name: true, email: true },
    });
    if (!existing.portfolioSlug) {
      const base = slugify(existing.name || existing.email.split("@")[0] || "portfolio");
      slug = base;
      let n = 1;
      while (
        await prisma.user.findFirst({
          where: { portfolioSlug: slug, NOT: { id: user.id } },
        })
      ) {
        slug = `${base}-${n++}`;
      }
    }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      ...(slug !== undefined ? { portfolioSlug: slug } : {}),
      ...(input.portfolioPublic !== undefined
        ? { portfolioPublic: input.portfolioPublic }
        : {}),
      ...(input.portfolioHeadline !== undefined
        ? { portfolioHeadline: input.portfolioHeadline?.trim() || null }
        : {}),
      ...(input.portfolioBio !== undefined
        ? { portfolioBio: input.portfolioBio?.trim() || null }
        : {}),
    },
  });

  revalidatePath("/dashboard/build-tracker");
  revalidatePath("/p");
  return getPortfolioSettings();
}

export async function generateAndSavePortfolio(): Promise<PortfolioSettingsDTO> {
  const user = await requireAuth();
  assertAiRateLimit(user.id);

  const dbUser = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
  });

  const projects = await prisma.project.findMany({
    where: {
      userId: user.id,
      status: { not: "archived" },
      portfolioVisible: true,
    },
    include: {
      features: {
        where: { status: { not: "cut" } },
        take: 8,
        orderBy: { sortOrder: "asc" },
      },
      artifacts: {
        where: {
          kind: {
            in: [
              "short_description",
              "tagline",
              "value_proposition",
              "feature_list",
            ],
          },
        },
        take: 8,
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 24,
  });

  if (projects.length === 0) {
    throw new Error("Add at least one visible project before generating a portfolio");
  }

  const pack = await generatePortfolioPack({
    founderName: dbUser.name || dbUser.email.split("@")[0] || "Founder",
    apps: projects.map((p) => {
      const short = p.artifacts.find((a) => a.kind === "short_description")?.body;
      const tagline = p.artifacts.find((a) => a.kind === "tagline")?.body;
      return {
        projectId: p.id,
        name: p.name,
        description: p.description,
        status: p.status,
        blurb: p.portfolioBlurb || short || tagline,
        features: p.features.map((f) => f.title),
        audience: p.brandAudience,
      };
    }),
  });

  let slug = dbUser.portfolioSlug;
  if (!slug) {
    const base = slugify(dbUser.name || dbUser.email.split("@")[0] || "portfolio");
    slug = base;
    let n = 1;
    while (
      await prisma.user.findFirst({
        where: { portfolioSlug: slug, NOT: { id: user.id } },
      })
    ) {
      slug = `${base}-${n++}`;
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: {
        portfolioSlug: slug,
        portfolioPublic: true,
        portfolioHeadline: pack.headline,
        portfolioBio: `${pack.bio}\n\n${pack.thesis}`,
      },
    });

    for (const app of pack.apps) {
      const project = projects.find((p) => p.id === app.projectId);
      if (!project) continue;
      const publicSlug =
        project.publicSlug || slugify(app.name) || slugify(project.name);
      await tx.project.update({
        where: { id: project.id },
        data: {
          portfolioBlurb: `${app.tagline}\n\n${app.description}`,
          publicSlug,
          portfolioVisible: true,
        },
      });
    }
  });

  revalidatePath("/dashboard/build-tracker");
  revalidatePath(`/p/${slug}`);
  return getPortfolioSettings();
}

export async function getPublicPortfolio(slug: string) {
  const user = await prisma.user.findFirst({
    where: { portfolioSlug: slug, portfolioPublic: true },
    select: {
      id: true,
      name: true,
      portfolioHeadline: true,
      portfolioBio: true,
      portfolioSlug: true,
      projects: {
        where: {
          portfolioVisible: true,
          status: { not: "archived" },
        },
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          productionUrl: true,
          portfolioBlurb: true,
          publicSlug: true,
          earlyAccessSlug: true,
          earlyAccessEnabled: true,
          brandAudience: true,
          features: {
            where: { category: { in: ["MVP", "Production"] }, status: { not: "cut" } },
            take: 5,
            orderBy: { sortOrder: "asc" },
            select: { title: true, category: true },
          },
        },
      },
    },
  });
  return user;
}
