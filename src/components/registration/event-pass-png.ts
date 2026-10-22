// The downloadable Event Pass card: a print-ready 1024×1204 PNG drawn on a canvas in the browser.
// Browser-only (canvas, Image, XMLSerializer): call it from an event handler, never during render.

import { event } from "@/lib/event";
import { normalisePassCode } from "@/lib/registrations/event-pass-codec";

export const eventPassPng = { width: 1024, height: 1204, quietZone: 80 } as const;

export type EventPassPngContent = {
  /** The QR already on the page (react-qr-code, level M, encoding the Event Pass link). */
  qr: SVGSVGElement;
  passCode: string;
  attendeeName: string;
  eventDayLabels: readonly string[];
};

/**
 * "EP-ABCD2345.png". Built from the Pass Code alone: the token is the pass, so it must never
 * appear in a file name. Anything that is not a Pass Code falls back to a fixed name.
 */
export function eventPassFileName(passCode: string): string {
  return `${normalisePassCode(passCode) ?? "event-pass"}.png`;
}

// Mirrors the tokens in src/app/globals.css. A canvas can't read Tailwind classes, and parsing
// custom properties at draw time would only add ways to fail.
const colours = {
  surface: "#ffffff",
  inkPure: "#000000",
  ink: "#15151e",
  muted: "#606066",
  brandGradient: [
    [0, "#7e1857"],
    [0.55, "#d83e22"],
    [0.82, "#e07225"],
    [1, "#ddb41e"],
  ],
} as const;

// Same stacks as the page (--font-sans in globals.css, Tailwind's --font-mono), used only when
// the live values can't be read. System fonts only: nothing to load before drawing.
const fallbackSans =
  '"SF Pro TH", "SF Pro Display", "SF Pro Icons", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, "Leelawadee UI", "Noto Sans Thai", sans-serif';
const fallbackMono =
  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

const brandBarHeight = 12;
const headerTop = 36;
const bottomPadding = 48;

type TextStyle = {
  family: string;
  /** Preferred size in px; shrinks in 2px steps down to minSize to fit the line. */
  size: number;
  minSize: number;
  weight: number;
  italic?: boolean;
  colour: string;
  /** Line box as a multiple of the font size. */
  lineHeight: number;
  /** Letter spacing in em. */
  tracking?: number;
  /** Lines allowed at minSize before the text is cut with an ellipsis. */
  maxLines?: number;
};

type Paragraph = { text: string; style: TextStyle; spaceBefore?: number };

type Line = { text: string; font: string; letterSpacing: string; colour: string; baseline: number };
type TextBlock = { lines: Line[]; height: number };

/** Draws the Event Pass card and encodes it as PNG. Rejects when the browser can't. */
export async function renderEventPassPng(content: EventPassPngContent): Promise<Blob> {
  const { width, height, quietZone } = eventPassPng;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D is not available");

  const sans = oneLine(getComputedStyle(document.body).fontFamily) || fallbackSans;
  const mono =
    oneLine(getComputedStyle(document.documentElement).getPropertyValue("--font-mono")) ||
    fallbackMono;
  const textWidth = width - 2 * quietZone;

  const header = layOut(
    ctx,
    [
      {
        text: `บัตรเข้างาน ${event.name}`,
        style: { family: sans, size: 40, minSize: 28, weight: 900, italic: true, colour: colours.inkPure, lineHeight: 1.4 },
      },
      {
        text: event.venue,
        style: { family: sans, size: 26, minSize: 20, weight: 400, colour: colours.muted, lineHeight: 1.4 },
        spaceBefore: 2,
      },
    ],
    textWidth,
  );

  const details = layOut(
    ctx,
    [
      {
        text: "รหัส Event Pass",
        style: { family: sans, size: 26, minSize: 26, weight: 400, colour: colours.muted, lineHeight: 1.4 },
      },
      {
        text: content.passCode,
        style: { family: mono, size: 80, minSize: 48, weight: 700, colour: colours.inkPure, lineHeight: 1.2, tracking: 0.06 },
      },
      {
        text: content.attendeeName,
        style: { family: sans, size: 40, minSize: 28, weight: 700, colour: colours.ink, lineHeight: 1.4, maxLines: 2 },
        spaceBefore: 20,
      },
      ...content.eventDayLabels.map(
        (label, index): Paragraph => ({
          text: label,
          style: { family: sans, size: 32, minSize: 24, weight: 700, colour: colours.ink, lineHeight: 1.4 },
          spaceBefore: index === 0 ? 8 : 0,
        }),
      ),
    ],
    textWidth,
  );

  // The QR takes whatever height is left, at a whole number of pixels per module so its edges
  // stay sharp, with at least the quiet zone of white on every side.
  const headerBottom = headerTop + header.height;
  const room = Math.min(
    width - 2 * quietZone,
    height - headerBottom - 2 * quietZone - details.height - bottomPadding,
  );
  const modules = moduleCount(content.qr);
  const qrSize = Math.max(modules, Math.floor(room / modules) * modules);
  const qrX = Math.round((width - qrSize) / 2);
  const qrY = Math.round(headerBottom + quietZone + Math.max(0, room - qrSize) / 2);
  const qrImage = await loadImage(svgDataUrl(content.qr, qrSize));

  ctx.fillStyle = colours.surface;
  ctx.fillRect(0, 0, width, height);
  drawBrandBar(ctx, width);
  draw(ctx, header, headerTop, width / 2);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);
  draw(ctx, details, qrY + qrSize + quietZone, width / 2);

  return toPng(canvas);
}

/**
 * The QR as an image URL. URI-component encoding, not base64: `btoa` throws on anything outside
 * Latin-1, and the QR carries a Thai aria-label.
 */
function svgDataUrl(qr: SVGSVGElement, size: number): string {
  const copy = qr.cloneNode(true) as SVGSVGElement;
  // Page CSS (w-full h-auto) means nothing in a standalone image; the size must be intrinsic.
  copy.removeAttribute("class");
  copy.removeAttribute("style");
  copy.setAttribute("width", String(size));
  copy.setAttribute("height", String(size));
  copy.setAttribute("shape-rendering", "crispEdges");
  let markup = new XMLSerializer().serializeToString(copy);
  if (!/^<svg[^>]*\sxmlns=/.test(markup)) {
    markup = markup.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
}

/** Modules per side, from react-qr-code's `viewBox="0 0 N N"`; 1 (no snapping) if unreadable. */
function moduleCount(qr: SVGSVGElement): number {
  const fromViewBox = qr.viewBox?.baseVal?.width;
  const parsed = Number(qr.getAttribute("viewBox")?.trim().split(/[\s,]+/)[2]);
  const count = Math.round(fromViewBox || parsed);
  return Number.isFinite(count) && count > 0 ? count : 1;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("The Event Pass QR could not be loaded as an image"));
    image.src = src;
  });
}

function toPng(canvas: HTMLCanvasElement): Promise<Blob> {
  // A synchronous throw (e.g. a tainted canvas) also rejects, via the Promise constructor.
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("The Event Pass PNG could not be encoded"))),
      "image/png",
    );
  });
}

function drawBrandBar(ctx: CanvasRenderingContext2D, width: number) {
  const gradient = ctx.createLinearGradient(0, 0, width, 0);
  for (const [offset, colour] of colours.brandGradient) gradient.addColorStop(offset, colour);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, brandBarHeight);
}

function draw(ctx: CanvasRenderingContext2D, block: TextBlock, top: number, centreX: number) {
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  for (const line of block.lines) {
    ctx.font = line.font;
    ctx.letterSpacing = line.letterSpacing;
    ctx.fillStyle = line.colour;
    ctx.fillText(line.text, centreX, top + line.baseline);
  }
  ctx.letterSpacing = "0px";
}

/** Fits each paragraph to `maxWidth` and stacks the lines; baselines are relative to the block top. */
function layOut(ctx: CanvasRenderingContext2D, paragraphs: Paragraph[], maxWidth: number): TextBlock {
  const lines: Line[] = [];
  let y = 0;
  for (const { text, style, spaceBefore = 0 } of paragraphs) {
    y += spaceBefore;
    const { size, texts } = fit(ctx, text, style, maxWidth);
    const lineBox = size * style.lineHeight;
    for (const lineText of texts) {
      // Room above the baseline for Thai vowels and tone marks stacked over the consonant.
      lines.push({
        text: lineText,
        font: font(style, size),
        letterSpacing: letterSpacing(style, size),
        colour: style.colour,
        baseline: y + lineBox / 2 + size * 0.3,
      });
      y += lineBox;
    }
  }
  ctx.letterSpacing = "0px";
  return { lines, height: y };
}

/** The largest size at which the text fits on one line, else wrapped at minSize. */
function fit(ctx: CanvasRenderingContext2D, text: string, style: TextStyle, maxWidth: number) {
  for (let size = style.size; size > style.minSize; size -= 2) {
    apply(ctx, style, size);
    if (ctx.measureText(text).width <= maxWidth) return { size, texts: [text] };
  }
  apply(ctx, style, style.minSize);
  return { size: style.minSize, texts: wrap(ctx, text, maxWidth, style.maxLines ?? 1) };
}

/**
 * Greedy wrapping that works for Thai, which has no spaces between words: break at word
 * boundaries (Intl.Segmenter), inside a word only when it is wider than a line, and end the
 * last allowed line with an ellipsis if text is left over. Uses the font already set on ctx.
 */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number) {
  const fits = (candidate: string) => ctx.measureText(candidate).width <= maxWidth;
  const pieces = words(text).flatMap((word) => (fits(word) ? [word] : graphemes(word)));

  const lines: string[] = [];
  let line = "";
  for (const piece of pieces) {
    if (fits(line + piece)) {
      line += piece;
    } else {
      if (line.trim()) lines.push(line.trim());
      line = piece.trimStart();
    }
  }
  if (line.trim()) lines.push(line.trim());
  if (lines.length <= maxLines) return lines;

  const kept = lines.slice(0, maxLines);
  let last = graphemes(kept[maxLines - 1]);
  while (last.length > 0 && !fits(`${last.join("").trimEnd()}…`)) last = last.slice(0, -1);
  kept[maxLines - 1] = `${last.join("").trimEnd()}…`;
  return kept;
}

function words(text: string): string[] {
  if (typeof Intl.Segmenter !== "function") return text.split(/(\s+)/).filter(Boolean);
  return Array.from(new Intl.Segmenter("th", { granularity: "word" }).segment(text), (s) => s.segment);
}

function graphemes(text: string): string[] {
  if (typeof Intl.Segmenter !== "function") return Array.from(text);
  return Array.from(new Intl.Segmenter("th", { granularity: "grapheme" }).segment(text), (s) => s.segment);
}

function apply(ctx: CanvasRenderingContext2D, style: TextStyle, size: number) {
  ctx.font = font(style, size);
  ctx.letterSpacing = letterSpacing(style, size);
}

const font = (style: TextStyle, size: number) =>
  `${style.italic ? "italic " : ""}${style.weight} ${size}px ${style.family}`;

const letterSpacing = (style: TextStyle, size: number) => `${Math.round((style.tracking ?? 0) * size)}px`;

const oneLine = (value: string) => value.replace(/\s+/g, " ").trim();
