"use client";

// The camera scanner at the entrance. It reads QR codes anywhere in the frame with html5-qrcode,
// which loads only in the browser, when Staff open the camera, so it never touches the server
// render or the build. Event Passes go to `onPass`, which checks them in through the desk; any
// other QR gets a brief orange notice and scanning carries on.

import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { type CameraFacing, deviceCameraPreference } from "@/lib/check-in/camera-preference";
import { looksLikeEventPass } from "@/lib/check-in/pass-recogniser";
import { cn } from "@/lib/utils";

/** Non-exact facing modes: a device without that camera opens the camera it has instead of failing. */
const FACING_MODES: Record<CameraFacing, "user" | "environment"> = { front: "user", back: "environment" };

const CAMERA_NAMES: Record<CameraFacing, string> = { front: "กล้องหน้า", back: "กล้องหลัง" };

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
 * Runs camera operations strictly one after another. html5-qrcode throws if one starts while
 * another is under way, and iPhone and iPad need a stream fully stopped before the next starts.
 */
function inTurn(queue: { current: Promise<void> }, operation: () => Promise<void>): Promise<void> {
  const run = queue.current.then(operation);
  queue.current = run.catch(() => {});
  return run;
}

/** Resolves after the browser has laid out the latest render, so the preview has its width. */
const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

/** What went wrong opening a camera, in words Staff can act on. */
function cameraProblem(failure: unknown): string {
  // html5-qrcode rejects with strings such as "Error getting userMedia, error = NotAllowedError: …".
  const detail = String(failure);
  if (!window.isSecureContext) return "เบราว์เซอร์เปิดกล้องได้เฉพาะหน้าเว็บที่เป็น https";
  if (/NotAllowedError|PermissionDenied|Permission denied|SecurityError/i.test(detail)) {
    return "ไม่ได้รับอนุญาตให้ใช้กล้อง อนุญาตให้เว็บไซต์นี้ใช้กล้องในการตั้งค่าเบราว์เซอร์ แล้วลองอีกครั้ง";
  }
  if (/NotFoundError|DevicesNotFoundError|OverconstrainedError/i.test(detail)) return "ไม่พบกล้องบนอุปกรณ์นี้";
  if (/NotReadableError|TrackStartError|AbortError/i.test(detail)) {
    return "กล้องอาจถูกแอปอื่นใช้อยู่ ปิดแอปนั้นแล้วลองอีกครั้ง";
  }
  if (/not supported|mediaDevices/i.test(detail)) return "เบราว์เซอร์นี้ใช้กล้องไม่ได้ ลองเปิดด้วย Safari หรือ Chrome";
  return "ลองอีกครั้ง";
}

type Status = "off" | "starting" | "on" | "stopping";

/**
 * The camera preview with its Start, Switch and Stop controls. `onPass` receives decoded text that
 * looks like an Event Pass, at most once per presentation of a pass.
 *
 * `mirrorPreview` flips the preview like a mirror, with CSS only (what is scanned is unaffected).
 * It defaults to mirroring while the front camera is open; Kiosk mode can set it explicitly.
 */
export function CameraScanner({ onPass, mirrorPreview }: { onPass: (text: string) => void; mirrorPreview?: boolean }) {
  const previewId = useId();
  const [status, setStatus] = useState<Status>("off");
  // The camera that is open, or being reopened after a failed switch.
  const [facing, setFacing] = useState<CameraFacing>("back");
  const [error, setError] = useState<string | null>(null);
  const [noticeShown, setNoticeShown] = useState(false);

  const cameraRef = useRef<Promise<Camera> | null>(null);
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const mountedRef = useRef(false);
  const onPassRef = useRef(onPass);
  const lastPassRef = useRef<{ text: string; seenAt: number } | null>(null);
  const strayWarnedAtRef = useRef(new Map<string, number>());
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // The scanner keeps the decode callback it was started with, so it reads the latest `onPass`
  // (which knows the Event Day chosen now) through a ref.
  useEffect(() => {
    onPassRef.current = onPass;
  });

  useEffect(() => {
    mountedRef.current = true;
    const queue = queueRef;
    const camera = cameraRef;
    const noticeTimer = noticeTimerRef;
    return () => {
      mountedRef.current = false;
      clearTimeout(noticeTimer.current);
      // Leaving the page turns the camera off, after any start or switch under way.
      void inTurn(queue, async () => {
        await (await camera.current)?.close();
      });
    };
  }, []);

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

  function start() {
    const preferred = deviceCameraPreference.read();
    setError(null);
    setFacing(preferred);
    setStatus("starting");
    void inTurn(queueRef, async () => {
      try {
        await nextFrame(); // the preview is showing, so the video is sized to its width
        await (await camera()).open(preferred);
        if (mountedRef.current) setStatus("on");
      } catch (failure) {
        console.error("Opening the camera failed", failure);
        if (!mountedRef.current) return;
        setStatus("off");
        setError(`เปิด${CAMERA_NAMES[preferred]}ไม่ได้: ${cameraProblem(failure)}`);
      }
    });
  }

  function switchCamera() {
    const previous = facing;
    const next: CameraFacing = previous === "back" ? "front" : "back";
    setError(null);
    setStatus("starting");
    void inTurn(queueRef, async () => {
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
        const problem = `เปลี่ยนเป็น${CAMERA_NAMES[next]}ไม่ได้: ${cameraProblem(failure)}`;
        try {
          const scanner = await camera();
          await scanner.close();
          await scanner.open(previous);
          setStatus("on");
          setError(`${problem} กลับมาใช้${CAMERA_NAMES[previous]}แล้ว`);
        } catch (restoreFailure) {
          console.error(`Reopening the ${previous} camera failed`, restoreFailure);
          setStatus("off");
          setError(`${problem} และเปิด${CAMERA_NAMES[previous]}อีกครั้งไม่ได้ กดเปิดกล้องเพื่อลองใหม่`);
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
    void inTurn(queueRef, async () => {
      try {
        await (await camera()).close();
        if (mountedRef.current) setStatus("off");
      } catch (failure) {
        console.error("Closing the camera failed", failure);
        if (!mountedRef.current) return;
        setStatus("on");
        setError("ปิดกล้องไม่ได้ ลองอีกครั้ง หรือโหลดหน้านี้ใหม่");
      }
    });
  }

  const busy = status === "starting" || status === "stopping";
  const mirrored = mirrorPreview ?? facing === "front";

  return (
    <section aria-labelledby={`${previewId}-heading`} className="mt-6">
      <h2 id={`${previewId}-heading`} className="text-sm leading-normal font-medium">
        สแกน QR ด้วยกล้อง
      </h2>

      <div
        className={cn(
          "relative mt-2 w-full max-w-md overflow-hidden rounded-xl bg-neutral-950",
          status === "off" && "hidden",
          status === "starting" && "min-h-48",
        )}
      >
        {/* html5-qrcode owns this element's children (video and canvas), so React renders none.
            The mirror is CSS only: frames are decoded from the camera, not from this element. */}
        <div id={previewId} aria-hidden="true" className={cn(mirrored && "-scale-x-100")} />
        {status === "starting" && (
          <p className="absolute inset-0 grid place-items-center p-4 text-center text-base leading-normal font-medium text-white">
            กำลังเปิดกล้อง…
          </p>
        )}
        {/* A toast over the preview, unlike the result panels below it; outside the mirrored
            element so its text reads the right way round. No sound, no vibration. */}
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none absolute inset-x-3 bottom-3 flex justify-center"
        >
          {noticeShown && (
            <p className="rounded-full bg-orange-500 px-4 py-2 text-center text-base leading-normal font-semibold text-neutral-950 shadow-lg">
              QR นี้ไม่ใช่ Event Pass
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {status === "off" ? (
          <Button type="button" size="lg" onClick={start}>
            เปิดกล้องสแกน QR
          </Button>
        ) : (
          <>
            <Button type="button" size="lg" variant="outline" disabled={busy} onClick={switchCamera}>
              สลับเป็น{CAMERA_NAMES[facing === "back" ? "front" : "back"]}
            </Button>
            <Button type="button" size="lg" variant="outline" disabled={busy} onClick={stop}>
              ปิดกล้อง
            </Button>
          </>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-2 text-sm leading-normal font-medium text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}
