import { describe, expect, it } from "vitest";
import {
  artifactClipboardValue,
  artifactPreviewText,
  defaultFormatForKind,
  isArtifactKind,
} from "@/lib/project-artifacts";

describe("project-artifacts helpers", () => {
  it("recognizes kinds and default formats", () => {
    expect(isArtifactKind("value_proposition")).toBe(true);
    expect(isArtifactKind("nonsense")).toBe(false);
    expect(defaultFormatForKind("logo")).toBe("image");
    expect(defaultFormatForKind("google_doc")).toBe("url");
    expect(defaultFormatForKind("feature_list")).toBe("markdown");
  });

  it("copies body for text artifacts and url for link-only", () => {
    expect(
      artifactClipboardValue({
        format: "text",
        body: "One-liner pitch",
        url: null,
        title: "Tagline",
      })
    ).toBe("One-liner pitch");

    expect(
      artifactClipboardValue({
        format: "url",
        body: null,
        url: "https://docs.google.com/x",
        title: "Spec",
      })
    ).toBe("https://docs.google.com/x");
  });

  it("previews body with ellipsis", () => {
    const long = "a".repeat(200);
    expect(artifactPreviewText({ body: long, url: null }).endsWith("…")).toBe(
      true
    );
  });
});
