import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  defaultFormatForKind,
  isArtifactKind,
  type ArtifactFormat,
  type ArtifactKind,
} from "@/lib/project-artifacts";
import { revalidatePath } from "next/cache";

export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

function inferFormat(mimeType: string, kind: ArtifactKind): ArtifactFormat {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType === "text/markdown" || mimeType === "text/plain") {
    return kind === "markdown" ? "markdown" : "text";
  }
  if (mimeType === "application/json") return "json";
  return defaultFormatForKind(kind) === "url" ? "file" : defaultFormatForKind(kind);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> }
) {
  try {
    const user = await requireAuth();
    const { projectId } = await context.params;

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: user.id },
    });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json(
        {
          error:
            "File uploads need BLOB_READ_WRITE_TOKEN. Paste a URL instead, or add a Vercel Blob token.",
        },
        { status: 503 }
      );
    }

    const form = await request.formData();
    const file = form.get("file");
    const titleRaw = String(form.get("title") ?? "").trim();
    const kindRaw = String(form.get("kind") ?? "other");
    const kind: ArtifactKind = isArtifactKind(kindRaw) ? kindRaw : "other";

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }
    if (file.size <= 0) {
      return NextResponse.json({ error: "Empty file" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "File too large (max 8 MB). Host it elsewhere and paste the URL." },
        { status: 400 }
      );
    }

    const safeName = file.name.replace(/[^\w.\-()+ ]+/g, "_").slice(0, 120) || "upload";
    const title = (titleRaw || safeName).slice(0, 200);
    const mimeType = file.type || "application/octet-stream";
    const format = inferFormat(mimeType, kind);

    const blob = await put(`projects/${projectId}/artifacts/${Date.now()}-${safeName}`, file, {
      access: "public",
      contentType: mimeType,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    // For text-like uploads, also store readable body when small
    let body: string | null = null;
    if (
      (mimeType.startsWith("text/") || mimeType === "application/json") &&
      file.size <= 200_000
    ) {
      body = await file.text();
    }

    const row = await prisma.projectArtifact.create({
      data: {
        projectId,
        userId: user.id,
        title,
        kind,
        format,
        body,
        url: blob.url,
        mimeType,
        sizeBytes: file.size,
        fileName: safeName,
        tags: [],
        metadata: { blobPathname: blob.pathname },
      },
    });

    revalidatePath("/dashboard/build-tracker");

    return NextResponse.json({
      id: row.id,
      project_id: row.projectId,
      title: row.title,
      kind: row.kind,
      format: row.format,
      body: row.body,
      url: row.url,
      mime_type: row.mimeType,
      size_bytes: row.sizeBytes,
      file_name: row.fileName,
      tags: [],
      metadata: row.metadata,
      sort_order: row.sortOrder,
      created_at: row.createdAt.toISOString(),
      updated_at: row.updatedAt.toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
