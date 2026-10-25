"use client";

// The camera scanner at the entrance. It reads QR codes anywhere in the frame with html5-qrcode,
// which loads only in the browser, when the camera first opens, so it never touches the server
// render or the build. Event Passes go to `onPass`, which checks them in through the desk; any
// other QR gets a brief orange notice and scanning carries on. In Kiosk mode (ticket 19) the same
// scanner opens the front camera by itself and fills the Kiosk's preview box.

import { useEffect, useEffectEvent, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { type CameraFacing, deviceCameraPreference } from "@/lib/check-in/camera-preference";
import { looksLikeEventPass } from "@/lib/check-in/pass-recogniser";
import type { Language } from "@/lib/language";
import { cn } from "@/lib/utils";

/** Non-exact facing modes: a device without that camera opens the camera it has instead of failing. */
const FACING_MODES: Record<CameraFacing, "user" | "environment"> = { front: "user", back: "environment" };

/**
 * Something the scanner says. The desk shows the English; a Kiosk shows the Thai, then the English
 * (`Words`). Every message carries both, even the errors of controls only the desk has, so one
 * kind serves both places.
 */
type Message = Record<Language, string>;

const CAMERA_NAMES: Record<Language, Record<CameraFacing, string>> = {
  th: { front: "กล้องหน้า", back: "กล้องหลัง" },
  en: { front: "front camera", back: "back camera" },
};

const HEADING: Message = { th: "สแกน QR ด้วยกล้อง", en: "Scan a QR with the camera" };
const OPENING: Message = { th: "กำลังเปิดกล้อง…", en: "Opening the camera…" };
const OPEN_AGAIN: Message = { th: "เปิดกล้องอีกครั้ง", en: "Open the camera again" };
const NOT_AN_EVENT_PASS: Message = { th: "QR นี้ไม่ใช่ Event Pass", en: "This QR isn't an Event Pass" };

/** How long the orange "not an Event Pass" notice stays up. */
const NOTICE_MS = 3_000;
/** A stray QR doesn't warn again within this long of its last warning. */
const STRAY_QUIET_MS = 10_000;
/**
 * The same Event Pass isn't sent again until it has been out of sight this long. A pass held up
 * to the camera is decoded ten times a second; this checks it in once, and stops its own repeat
 * from turning the result amber while its owner is still standing there.
 */
const SAME_PASS_QUIET_MS = 5_000;
/** How long the preview's size must stay put after a change before the camera is refitted to it. */
const REFIT_SETTLE_MS = 500;

/**
 * The Kiosk preview's width, inside its box (a size container): as wide as the box allows while a
 * 4:3 stream in landscape, or a 3:4 one in portrait (iPad Safari turns the stream with the
 * device), still fits its height. Any other shape is letterboxed or trimmed, never squashed.
 */
const KIOSK_READER_WIDTH = "w-[min(100cqw,calc(100cqh*4/3))] portrait:w-[min(100cqw,calc(100cqh*3/4))]";

type Camera = {
  open(facing: CameraFacing): Promise<void>;
  close(): Promise<void>;
};

/** Loads html5-qrcode and sets up a scanner that renders its video into the element `elementId`. */
async function loadCamera(elementId: string, onDecoded: (text: string) => void): Promise<Camera> {
  const { Html5Qrcode, Html5QrcodeScannerState, Html5QrcodeSupportedFormats } = await import("html5-qrcode");
  const scanner = new Html5Qrcode(elementId, {
    verbose: false,
    formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
  });
  return {
    async open(facing) {
      // No qrbox, so the whole frame is read; 10 frames a second. ZXing's TRY_HARDER hint stays
      // off (html5-qrcode sets it to false), which keeps decoding fast on phones.
      await scanner.start({ facingMode: FACING_MODES[facing] }, { fps: 10 }, (text) => onDecoded(text), undefined);
    },
    async close() {
      if (scanner.getState() !== Html5QrcodeScannerState.NOT_STARTED) await scanner.stop();
    },
  };
}

/**
 * Camera operations run strictly one after another: html5-qrcode throws if one starts while
 * another is under way, and iPhone and iPad need a stream fully stopped before the next starts.
 * The queue is shared by every scanner on the page, so a scanner that mounts (the Kiosk's) waits
 * for the one that just unmounted (the desk's) to let go of the camera.
 */
const cameraQueue = { current: Promise.resolve() };

function inTurn(operation: () => Promise<void>): Promise<void> {
  const run = cameraQueue.current.then(operation);
  cameraQueue.current = run.catch(() => {});
  return run;
}

/** Resolves after the browser has laid out the latest render, so the preview has its width. */
const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

/**
 * Whether the preview no longer matches the geometry html5-qrcode set up when the camera opened:
 * it fixes the video's width to the reader element's width, and sizes its scan canvas to the
 * video as it first played. A rotated iPad, a resized window or a stream that turned with the
 * device each break one of these. False while no camera is open or it is still starting.
 */
function previewOutOfShape(reader: HTMLElement): boolean {
  const video = reader.querySelector("video");
  const canvas = reader.querySelector("canvas");
  if (!video || !canvas) return false;
  const differs = (a: number, b: number) => Math.abs(a - b) > 1;
  return (
    differs(video.clientWidth, reader.clientWidth) ||
    differs(canvas.width, video.clientWidth) ||
    differs(canvas.height, video.clientHeight)
  );
}

/**
 * What went wrong opening a camera, in words Staff can act on. The English always ends a sentence,
 * so more can follow it.
 */
function cameraProblem(failure: unknown): Message {
  // html5-qrcode rejects with strings such as "Error getting userMedia, error = NotAllowedError: …".
  const detail = String(failure);
  if (!window.isSecureContext) {
    return {
      th: "เบราว์เซอร์เปิดกล้องได้เฉพาะหน้าเว็บที่เป็น https",
      en: "The browser can open the camera only on an https page.",
    };
  }
  if (/NotAllowedError|PermissionDenied|Permission denied|SecurityError/i.test(detail)) {
    return {
      th: "ไม่ได้รับอนุญาตให้ใช้กล้อง อนุญาตให้เว็บไซต์นี้ใช้กล้องในการตั้งค่าเบราว์เซอร์ แล้วลองอีกครั้ง",
      en: "Camera access was denied. Allow this site to use the camera in the browser settings, then try again.",
    };
  }
  if (/NotFoundError|DevicesNotFoundError|OverconstrainedError/i.test(detail)) {
    return { th: "ไม่พบกล้องบนอุปกรณ์นี้", en: "No camera found on this device." };
  }
  if (/NotReadableError|TrackStartError|AbortError/i.test(detail)) {
    return {
      th: "กล้องอาจถูกแอปอื่นใช้อยู่ ปิดแอปนั้นแล้วลองอีกครั้ง",
      en: "Another app may be using the camera. Close it and try again.",
    };
  }
  if (/not supported|mediaDevices/i.test(detail)) {
    return {
      th: "เบราว์เซอร์นี้ใช้กล้องไม่ได้ ลองเปิดด้วย Safari หรือ Chrome",
      en: "This browser can't use the camera. Try Safari or Chrome.",
    };
  }
  return { th: "ลองอีกครั้ง", en: "Try again." };
}

/** A message as the scanner shows it: English at the desk; on a Kiosk, Thai, then the English below. */
function Words({ message, kiosk, englishClassName }: { message: Message; kiosk: boolean; englishClassName?: string }) {
  if (!kiosk) return message.en;
  return (
    <>
      {message.th}{" "}
      <span lang="en" className={cn("block", englishClassName)}>
        {message.en}
      </span>
    </>
  );
}

type Status = "off" | "starting" | "on" | "stopping";

/**
 * The camera preview with its Start, Switch and Stop controls, in English. `onPass` receives
 * decoded text that looks like an Event Pass, at most once per presentation of a pass.
 *
 * `mirrorPreview` flips the preview like a mirror, with CSS only (what is scanned is unaffected).
 * It defaults to mirroring while the front camera is open.
 *
 * `kiosk` (fixed for the scanner's lifetime) sets it up for a Kiosk: it opens the front camera as
 * soon as it mounts, without reading or saving the device's camera choice; it has no switch or
 * stop control, only a retry when the camera couldn't open; it says everything in Thai, then English;
 * and it pauses the camera while the page is hidden. The preview fills the section, which
 * `className` sizes.
 */
export function CameraScanner({
  onPass,
  mirrorPreview,
  kiosk = false,
  className,
}: {
  onPass: (text: string) => void;
  mirrorPreview?: boolean;
  kiosk?: boolean;
  className?: string;
}) {
  const previewId = useId();
  const [status, setStatus] = useState<Status>(kiosk ? "starting" : "off");
  // The camera that is open, or being reopened after a failed switch.
  const [facing, setFacing] = useState<CameraFacing>(kiosk ? "front" : "back");
  const [error, setError] = useState<Message | null>(null);
  const [noticeShown, setNoticeShown] = useState(false);

  const readerRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<Promise<Camera> | null>(null);
  const mountedRef = useRef(false);
  // The camera was closed because the page went out of sight (Kiosk only).
  const pausedRef = useRef(false);
  const onPassRef = useRef(onPass);
  const lastPassRef = useRef<{ text: string; seenAt: number } | null>(null);
  const strayWarnedAtRef = useRef(new Map<string, number>());
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // The scanner keeps the decode callback it was started with, so it reads the latest `onPass`
  // (which knows the Event Day chosen now) through a ref.
  useEffect(() => {
    onPassRef.current = onPass;
  });

  const startOnMount = useEffectEvent(() => {
    if (kiosk) start();
  });

  useEffect(() => {
    mountedRef.current = true;
    const camera = cameraRef;
    const noticeTimer = noticeTimerRef;
    startOnMount();
    return () => {
      mountedRef.current = false;
      clearTimeout(noticeTimer.current);
      // Leaving the page turns the camera off, after any start or switch under way.
      void inTurn(async () => {
        await (await camera.current)?.close();
      }).catch((failure) => console.error("Closing the camera failed", failure));
    };
  }, []);

  // html5-qrcode sizes the video and its scan canvas once, when the camera opens. When the preview
  // changes shape afterwards, reopen the same camera so the whole frame is still read in proportion.
  const refitIfOutOfShape = useEffectEvent(() => {
    const reader = readerRef.current;
    if (status === "on" && reader && previewOutOfShape(reader)) openCamera(facing);
  });

  useEffect(() => {
    const reader = readerRef.current;
    if (!reader || typeof ResizeObserver === "undefined") return;
    let settle: ReturnType<typeof setTimeout> | undefined;
    // The reader's width follows its box and its height follows the video, so this sees both.
    const observer = new ResizeObserver(() => {
      clearTimeout(settle);
      settle = setTimeout(() => refitIfOutOfShape(), REFIT_SETTLE_MS);
    });
    observer.observe(reader);
    return () => {
      observer.disconnect();
      clearTimeout(settle);
    };
  }, []);

  // A Kiosk lets go of the camera while the page is out of sight (iPad locked, another app or tab
  // in front) and opens it again on return, rather than risk a frozen preview nobody can restart.
  const pauseWhileHidden = useEffectEvent(() => {
    if (document.visibilityState === "hidden") {
      if (status === "off" || pausedRef.current) return;
      pausedRef.current = true;
      void inTurn(async () => {
        await (await camera()).close();
      }).catch((failure) => console.error("Pausing the camera failed", failure));
    } else if (pausedRef.current) {
      pausedRef.current = false;
      openCamera(facing);
    }
  });

  useEffect(() => {
    if (!kiosk) return;
    const onVisibilityChange = () => pauseWhileHidden();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [kiosk]);

  function showStrayNotice() {
    setNoticeShown(true);
    clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = setTimeout(() => setNoticeShown(false), NOTICE_MS);
  }

  function handleDecoded(text: string) {
    if (!mountedRef.current) return;
    const now = Date.now();
    if (looksLikeEventPass(text)) {
      const last = lastPassRef.current;
      lastPassRef.current = { text, seenAt: now };
      if (last?.text === text && now - last.seenAt < SAME_PASS_QUIET_MS) return;
      onPassRef.current(text);
      return;
    }
    // Not an Event Pass (a menu, a poster, LINE): a silent notice, then keep scanning.
    const warnedAt = strayWarnedAtRef.current;
    for (const [stray, at] of warnedAt) if (now - at >= STRAY_QUIET_MS) warnedAt.delete(stray);
    if (warnedAt.has(text)) return;
    warnedAt.set(text, now);
    showStrayNotice();
  }

  /** The scanner, loading html5-qrcode on first use. A failed load is retried next time. */
  async function camera(): Promise<Camera> {
    cameraRef.current ??= loadCamera(previewId, handleDecoded);
    try {
      return await cameraRef.current;
    } catch (failure) {
      cameraRef.current = null;
      throw failure;
    }
  }

  /** Opens the `next` camera, closing any camera that is open first. Doesn't save the choice. */
  function openCamera(next: CameraFacing) {
    setError(null);
    setFacing(next);
    setStatus("starting");
    void inTurn(async () => {
      try {
        const scanner = await camera();
        await scanner.close();
        await nextFrame(); // the preview is showing, so the video is sized to its width
        await scanner.open(next);
        if (mountedRef.current) setStatus("on");
      } catch (failure) {
        console.error(`Opening the ${next} camera failed`, failure);
        if (!mountedRef.current) return;
        setStatus("off");
        const problem = cameraProblem(failure);
        setError({
          th: `เปิด${CAMERA_NAMES.th[next]}ไม่ได้: ${problem.th}`,
          en: `Couldn't open the ${CAMERA_NAMES.en[next]}: ${problem.en}`,
        });
      }
    });
  }

  function start() {
    openCamera(kiosk ? "front" : deviceCameraPreference.read());
  }

  function switchCamera() {
    const previous = facing;
    const next: CameraFacing = previous === "back" ? "front" : "back";
    setError(null);
    setStatus("starting");
    void inTurn(async () => {
      try {
        const scanner = await camera();
        // Always wait for the current stream to stop before starting the next one: otherwise
        // iPhone and iPad show a black preview (WebKit bug 179363).
        await scanner.close();
        await scanner.open(next);
      } catch (failure) {
        console.error(`Switching to the ${next} camera failed`, failure);
        if (!mountedRef.current) return;
        // Put the previous camera back and leave the saved choice alone.
        const reason = cameraProblem(failure);
        const problem: Message = {
          th: `เปลี่ยนเป็น${CAMERA_NAMES.th[next]}ไม่ได้: ${reason.th}`,
          en: `Couldn't switch to the ${CAMERA_NAMES.en[next]}: ${reason.en}`,
        };
        try {
          const scanner = await camera();
          await scanner.close();
          await scanner.open(previous);
          setStatus("on");
          setError({
            th: `${problem.th} กลับมาใช้${CAMERA_NAMES.th[previous]}แล้ว`,
            en: `${problem.en} Back to the ${CAMERA_NAMES.en[previous]}.`,
          });
        } catch (restoreFailure) {
          console.error(`Reopening the ${previous} camera failed`, restoreFailure);
          setStatus("off");
          setError({
            th: `${problem.th} และเปิด${CAMERA_NAMES.th[previous]}อีกครั้งไม่ได้ กดเปิดกล้องเพื่อลองใหม่`,
            // The problem's sentence carries on, without its full stop.
            en:
              `${problem.en.replace(/\.$/, "")} and couldn't reopen the ${CAMERA_NAMES.en[previous]}. ` +
              "Press Open camera to try again.",
          });
        }
        return;
      }
      deviceCameraPreference.save(next);
      if (!mountedRef.current) return;
      setFacing(next);
      setStatus("on");
    });
  }

  function stop() {
    setError(null);
    setStatus("stopping");
    void inTurn(async () => {
      try {
        await (await camera()).close();
        if (mountedRef.current) setStatus("off");
      } catch (failure) {
        console.error("Closing the camera failed", failure);
        if (!mountedRef.current) return;
        setStatus("on");
        setError({
          th: "ปิดกล้องไม่ได้ ลองอีกครั้ง หรือโหลดหน้านี้ใหม่",
          en: "Couldn't turn off the camera. Try again, or reload this page.",
        });
      }
    });
  }

  const busy = status === "starting" || status === "stopping";
  const mirrored = mirrorPreview ?? facing === "front";

  return (
    <section
      aria-labelledby={`${previewId}-heading`}
      className={cn(kiosk ? "flex min-h-0 flex-col" : "mt-6", className)}
    >
      {/* Names the section for screen readers; on screen, the camera button says the same. */}
      <h2 id={`${previewId}-heading`} className="sr-only">
        <Words message={HEADING} kiosk={kiosk} />
      </h2>

      <div
        className={cn(
          "relative overflow-hidden bg-neutral-950",
          kiosk
            ? // A size container, so the reader can be sized to fit both ways (KIOSK_READER_WIDTH).
              "grid min-h-0 flex-1 place-content-center rounded-2xl [container-type:size]"
            : ["w-full rounded-xl", status === "off" && "hidden", status === "starting" && "min-h-48"],
        )}
      >
        {/* html5-qrcode owns this element's children (video and canvas), so React renders none.
            The mirror is CSS only: frames are decoded from the camera, not from this element. */}
        <div
          ref={readerRef}
          id={previewId}
          aria-hidden="true"
          className={cn(kiosk && KIOSK_READER_WIDTH, mirrored && "-scale-x-100")}
        />
        {status === "starting" && (
          <p
            className={cn(
              "absolute inset-0 grid place-content-center p-4 text-center leading-normal font-medium text-white",
              kiosk ? "text-2xl" : "text-base",
            )}
          >
            <Words message={OPENING} kiosk={kiosk} englishClassName="text-xl font-normal text-white/80" />
          </p>
        )}
        {kiosk && status === "off" && (
          <div className="absolute inset-0 grid place-content-center justify-items-center gap-5 p-6 text-center">
            {error && (
              <p role="alert" className="max-w-md text-lg leading-normal font-medium text-white">
                <Words message={error} kiosk englishClassName="mt-1 font-normal text-white/80" />
              </p>
            )}
            <Button
              type="button"
              size="lg"
              variant="secondary"
              className="h-auto min-h-14 flex-col gap-0 px-8 py-2 text-lg whitespace-normal"
              onClick={start}
            >
              <Words message={OPEN_AGAIN} kiosk englishClassName="text-base font-normal" />
            </Button>
          </div>
        )}
        {/* A toast over the preview, unlike the result panels; outside the mirrored element so its
            text reads the right way round. No sound, no vibration. */}
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none absolute inset-x-3 bottom-3 flex justify-center"
        >
          {noticeShown && (
            <p
              className={cn(
                "rounded-full bg-orange-500 text-center leading-normal font-semibold text-neutral-950 shadow-lg",
                kiosk ? "px-8 py-3 text-2xl" : "px-4 py-2 text-base",
              )}
            >
              <Words message={NOT_AN_EVENT_PASS} kiosk={kiosk} englishClassName="text-lg font-medium" />
            </p>
          )}
        </div>
      </div>

      {!kiosk && (
        <>
          {/* Full-width buttons, one under another: they fit a phone whatever the label's length. */}
          <div className={cn("grid gap-2", status !== "off" && "mt-3")}>
            {status === "off" ? (
              <Button type="button" size="lg" onClick={start}>
                Open camera to scan QR
              </Button>
            ) : (
              <>
                <Button type="button" size="lg" variant="outline" disabled={busy} onClick={switchCamera}>
                  Switch to {CAMERA_NAMES.en[facing === "back" ? "front" : "back"]}
                </Button>
                <Button type="button" size="lg" variant="outline" disabled={busy} onClick={stop}>
                  Turn off camera
                </Button>
              </>
            )}
          </div>

          {error && (
            <p role="alert" className="mt-2 text-sm leading-normal font-medium text-destructive">
              {error.en}
            </p>
          )}
        </>
      )}
    </section>
  );
}
