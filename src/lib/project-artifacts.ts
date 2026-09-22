export const ARTIFACT_KINDS = [
  "short_description",
  "long_description",
  "value_proposition",
  "feature_list",
  "hero_text",
  "tagline",
  "logo",
  "image",
  "video",
  "slideshow",
  "form",
  "markdown",
  "document",
  "google_doc",
  "link",
  "other",
] as const;

export type ArtifactKind = (typeof ARTIFACT_KINDS)[number];

export const ARTIFACT_FORMATS = [
  "text",
  "markdown",
  "html",
  "url",
  "image",
  "video",
  "file",
  "json",
] as const;

export type ArtifactFormat = (typeof ARTIFACT_FORMATS)[number];

export type ArtifactCategory = "copy" | "brand" | "media" | "docs" | "other";

export const ARTIFACT_KIND_META: Record<
  ArtifactKind,
  { label: string; category: ArtifactCategory; defaultFormat: ArtifactFormat }
> = {
  short_description: {
    label: "Short description",
    category: "copy",
    defaultFormat: "text",
  },
  long_description: {
    label: "Long description",
    category: "copy",
    defaultFormat: "markdown",
  },
  value_proposition: {
    label: "Value proposition",
    category: "copy",
    defaultFormat: "text",
  },
  feature_list: {
    label: "Features",
    category: "copy",
    defaultFormat: "markdown",
  },
  hero_text: { label: "Hero text", category: "copy", defaultFormat: "text" },
  tagline: { label: "Tagline", category: "copy", defaultFormat: "text" },
  logo: { label: "Logo", category: "brand", defaultFormat: "image" },
  image: { label: "Image", category: "brand", defaultFormat: "image" },
  video: { label: "Video", category: "media", defaultFormat: "video" },
  slideshow: { label: "Slideshow", category: "media", defaultFormat: "url" },
  form: { label: "Form", category: "docs", defaultFormat: "url" },
  markdown: { label: "Markdown", category: "docs", defaultFormat: "markdown" },
  document: { label: "Document", category: "docs", defaultFormat: "file" },
  google_doc: { label: "Google Doc", category: "docs", defaultFormat: "url" },
  link: { label: "Link", category: "other", defaultFormat: "url" },
  other: { label: "Other", category: "other", defaultFormat: "text" },
};

export const ARTIFACT_CATEGORIES: Array<{
  id: ArtifactCategory | "all";
  label: string;
}> = [
  { id: "all", label: "All" },
  { id: "copy", label: "Copy" },
  { id: "brand", label: "Brand" },
  { id: "media", label: "Media" },
  { id: "docs", label: "Docs" },
  { id: "other", label: "Other" },
];

export function isArtifactKind(value: string): value is ArtifactKind {
  return (ARTIFACT_KINDS as readonly string[]).includes(value);
}

export function isArtifactFormat(value: string): value is ArtifactFormat {
  return (ARTIFACT_FORMATS as readonly string[]).includes(value);
}

export function defaultFormatForKind(kind: ArtifactKind): ArtifactFormat {
  return ARTIFACT_KIND_META[kind].defaultFormat;
}

/** What to put on the clipboard for reuse elsewhere. */
export function artifactClipboardValue(artifact: {
  format: string;
  body: string | null;
  url: string | null;
  title: string;
}): string {
  if (artifact.format === "url" || (!artifact.body && artifact.url)) {
    return artifact.url?.trim() || artifact.title;
  }
  if (artifact.body?.trim()) return artifact.body;
  if (artifact.url?.trim()) return artifact.url;
  return artifact.title;
}

export function artifactPreviewText(artifact: {
  body: string | null;
  url: string | null;
}): string {
  const body = artifact.body?.trim();
  if (body) return body.length > 140 ? `${body.slice(0, 137)}…` : body;
  if (artifact.url) return artifact.url;
  return "No content yet";
}
