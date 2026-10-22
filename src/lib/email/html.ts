// Small helpers for hand-written email HTML.

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** Escapes text for use in HTML element content and double-quoted attribute values. */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => HTML_ESCAPES[character]);
}

/** WCAG relative luminance of a `#rrggbb` colour. */
function relativeLuminance(hex: string): number {
  const match = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!match) throw new Error(`Expected a #rrggbb colour, got "${hex}"`);
  const [red, green, blue] = match.slice(1).map((channel) => {
    const value = parseInt(channel, 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrastRatio(a: string, b: string): number {
  const [lighter, darker] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
}

export const WHITE = "#ffffff";
export const NEAR_BLACK = "#111111";

/** White or near-black, whichever reads better on `background`. */
export function readableTextColor(background: string): typeof WHITE | typeof NEAR_BLACK {
  return contrastRatio(WHITE, background) >= contrastRatio(NEAR_BLACK, background)
    ? WHITE
    : NEAR_BLACK;
}
