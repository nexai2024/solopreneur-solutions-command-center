import type { NewsletterBlocksData, NewsletterBlock } from "@/lib/marketing/types";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function styleValue(value: unknown, suffix = "") {
  if (value === null || value === undefined || value === "") return "";
  return `${value}${suffix}`;
}

function renderBlock(block: NewsletterBlock) {
  const content = block.content as Record<string, unknown>;
  const styles = block.styles as Record<string, unknown>;
  const paddingTop = styleValue(styles.paddingTop ?? 16, "px");
  const paddingBottom = styleValue(styles.paddingBottom ?? 16, "px");
  const paddingLeft = styleValue(styles.paddingLeft ?? 16, "px");
  const paddingRight = styleValue(styles.paddingRight ?? 16, "px");
  const backgroundColor = styleValue(styles.backgroundColor);
  const textColor = styleValue(styles.textColor);
  const fontSize = styleValue(styles.fontSize, "px");
  const borderRadius = styleValue(styles.borderRadius, "px");
  const blockStyle = [
    `padding:${paddingTop} ${paddingRight} ${paddingBottom} ${paddingLeft}`,
    backgroundColor ? `background-color:${backgroundColor}` : "",
    textColor ? `color:${textColor}` : "",
    fontSize ? `font-size:${fontSize}` : "",
    borderRadius ? `border-radius:${borderRadius}` : "",
  ]
    .filter(Boolean)
    .join(";");

  switch (block.type) {
    case "text": {
      const text = escapeHtml(String(content.text ?? ""));
      const alignment = String(content.alignment ?? "left");
      return `<div style="${blockStyle};text-align:${alignment}">${text.replace(
        /\n/g,
        "<br/>"
      )}</div>`;
    }
    case "image": {
      const src = escapeHtml(String(content.src ?? ""));
      const alt = escapeHtml(String(content.alt ?? ""));
      const link = String(content.link ?? "");
      const img = `<img src="${src}" alt="${alt}" style="max-width:100%;height:auto;display:block;border-radius:${borderRadius || "0"};" />`;
      return `<div style="${blockStyle}">${
        link ? `<a href="${escapeHtml(link)}">${img}</a>` : img
      }</div>`;
    }
    case "button": {
      const text = escapeHtml(String(content.text ?? "Click"));
      const url = escapeHtml(String(content.url ?? "#"));
      const alignment = String(content.alignment ?? "center");
      const background = String(content.backgroundColor ?? "#2563eb");
      const color = String(content.textColor ?? "#ffffff");
      const radius = styleValue(content.borderRadius ?? 6, "px");
      return `<div style="${blockStyle};text-align:${alignment}"><a href="${url}" style="display:inline-block;background:${background};color:${color};padding:10px 18px;border-radius:${radius};text-decoration:none;">${text}</a></div>`;
    }
    case "divider": {
      const color = escapeHtml(String(content.color ?? "#e2e8f0"));
      const thickness = Number(content.thickness ?? 1);
      const style = escapeHtml(String(content.style ?? "solid"));
      return `<div style="${blockStyle}"><hr style="border:none;border-top:${thickness}px ${style} ${color};" /></div>`;
    }
    case "spacer": {
      const height = Number(content.height ?? 32);
      return `<div style="${blockStyle};height:${height}px"></div>`;
    }
    case "social-links": {
      const links = [
        { label: "Twitter", url: content.twitter },
        { label: "LinkedIn", url: content.linkedin },
        { label: "GitHub", url: content.github },
        { label: "Website", url: content.website },
      ].filter((item) => item.url);
      const items = links
        .map(
          (item) =>
            `<a href="${escapeHtml(String(item.url))}" style="margin-right:12px;color:${textColor || "#2563eb"};text-decoration:none;">${escapeHtml(
              item.label
            )}</a>`
        )
        .join("");
      return `<div style="${blockStyle}">${items}</div>`;
    }
    case "header": {
      const logoUrl = String(content.logoUrl ?? "");
      const title = escapeHtml(String(content.title ?? ""));
      const logo = logoUrl
        ? `<img src="${escapeHtml(
            logoUrl
          )}" alt="${title}" style="height:40px;width:auto;display:block;" />`
        : "";
      return `<div style="${blockStyle}">${logo}${
        title ? `<h1 style="margin:8px 0 0 0;">${title}</h1>` : ""
      }</div>`;
    }
    case "footer": {
      const companyName = escapeHtml(String(content.companyName ?? ""));
      const address = escapeHtml(String(content.address ?? ""));
      const unsubscribeText = escapeHtml(
        String(content.unsubscribeText ?? "Unsubscribe")
      );
      return `<div style="${blockStyle};font-size:12px;color:${
        textColor || "#64748b"
      }">${companyName ? `<div>${companyName}</div>` : ""}${
        address ? `<div>${address}</div>` : ""
      }<div style="margin-top:8px;">${unsubscribeText}</div></div>`;
    }
    case "html": {
      const html = String(content.html ?? "");
      return `<div style="${blockStyle}">${html}</div>`;
    }
    case "video": {
      const url = String(content.url ?? "");
      const thumbnailUrl = String(content.thumbnailUrl ?? "");
      const thumbnail = thumbnailUrl
        ? `<img src="${escapeHtml(
            thumbnailUrl
          )}" alt="Video thumbnail" style="max-width:100%;height:auto;display:block;" />`
        : "Watch video";
      return `<div style="${blockStyle}"><a href="${escapeHtml(
        url
      )}">${thumbnail}</a></div>`;
    }
    case "columns": {
      const columns = Array.isArray(content.columns) ? content.columns : [];
      const columnCount = Number(
        (content.columnCount ?? columns.length) || 2
      );
      const cells = Array.from({ length: columnCount })
        .map((_, index) => {
          const column = columns[index] as { text?: string } | undefined;
          const text = escapeHtml(String(column?.text ?? ""));
          return `<td style="vertical-align:top;padding:8px;width:${Math.floor(
            100 / columnCount
          )}%;">${text.replace(/\n/g, "<br/>")}</td>`;
        })
        .join("");
      return `<table style="${blockStyle};width:100%;border-collapse:collapse"><tr>${cells}</tr></table>`;
    }
    default:
      return "";
  }
}

export function renderNewsletterHtml(
  blocksData: NewsletterBlocksData | null | undefined
) {
  if (!blocksData || !Array.isArray(blocksData.blocks)) {
    return "";
  }

  const wrapperStyle = [
    `background-color:${blocksData.globalStyles?.backgroundColor ?? "#ffffff"}`,
    `font-family:${blocksData.globalStyles?.fontFamily ?? "Arial, sans-serif"}`,
    `max-width:${blocksData.globalStyles?.maxWidth ?? 640}px`,
    "margin:0 auto",
    "padding:24px",
  ].join(";");

  const body = blocksData.blocks.map(renderBlock).join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8" /></head><body><div style="${wrapperStyle}">${body}</div></body></html>`;
}
