"use client";

// Bot protection on the public form: the Cloudflare Turnstile widget, and the Thai messages for a
// submission the server turned away (failed bot check, or too many submissions from one IP).

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { TURNSTILE_RESPONSE_FIELD } from "@/lib/bot-check/submission-context";
import { SUBMISSION_WINDOW_MINUTES } from "@/lib/registrations/bot-protection";
import { FieldError } from "./controls";
import type { RegistrationFormState } from "./form-state";

/**
 * The public site key, inlined at build time. Empty means no widget: local development, where
 * the server falls back to passThroughBotCheck because TURNSTILE_SECRET_KEY is empty too.
 */
const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? "";

// Explicit rendering, so the widget is created and removed with this component. Cloudflare
// requires this exact URL: proxying or caching the script breaks Turnstile when it updates.
const TURNSTILE_SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

/** The "flexible" widget is at least 300px wide; narrower forms (most phones) get "compact". */
const FLEXIBLE_MIN_WIDTH = 300;

type TurnstileApi = {
  render(container: HTMLElement, options: Record<string, unknown>): string | null | undefined;
  reset(widgetId: string): void;
  remove(widgetId: string): void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

/** Starts a fresh challenge; the widget's old token is discarded. */
function resetTurnstile(widgetId: string | null) {
  if (widgetId) window.turnstile?.reset(widgetId);
}

type WidgetProblem = "load-failed" | "error" | "unsupported";

const widgetProblemMessages: Record<WidgetProblem, string> = {
  "load-failed":
    "โหลดระบบตรวจสอบความปลอดภัยไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต แล้วโหลดหน้านี้ใหม่",
  error: "ระบบตรวจสอบความปลอดภัยขัดข้อง",
  unsupported: "เบราว์เซอร์นี้ไม่รองรับระบบตรวจสอบความปลอดภัย กรุณาอัปเดตหรือเปลี่ยนเบราว์เซอร์",
};

const turnedAwayMessages = {
  "bot-check-failed":
    "การตรวจสอบความปลอดภัยไม่ผ่าน กรุณารอให้การตรวจสอบด้านบนเสร็จสิ้น แล้วกดลงทะเบียนอีกครั้ง",
  "rate-limited": `มีการส่งแบบฟอร์มจากเครือข่ายนี้บ่อยเกินไป กรุณารอประมาณ ${SUBMISSION_WINDOW_MINUTES} นาที แล้วลองใหม่อีกครั้ง`,
} as const;

/**
 * Sits above the submit button. The Turnstile token travels in the form's own FormData, in the
 * hidden input the widget adds. While a submission is pending its last message is hidden, so a
 * repeated message is announced again.
 */
export function BotProtection({ state, pending }: { state: RegistrationFormState; pending: boolean }) {
  const message =
    !pending && (state.status === "bot-check-failed" || state.status === "rate-limited")
      ? turnedAwayMessages[state.status]
      : undefined;
  if (!siteKey && !message) return null;

  return (
    <div className="flex flex-col">
      {siteKey && <TurnstileWidget resetSignal={state} />}
      <FieldError id="registration-bot-protection" message={message} />
    </div>
  );
}

/** `resetSignal` changes with every server result; each change gets a fresh token. */
function TurnstileWidget({ resetSignal }: { resetSignal: unknown }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [problem, setProblem] = useState<WidgetProblem | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const turnstile = window.turnstile;
    if (!scriptReady || !container || !turnstile) return;

    const widgetId = turnstile.render(container, {
      sitekey: siteKey,
      language: "th",
      // The public pages have no dark theme.
      theme: "light",
      size: container.clientWidth >= FLEXIBLE_MIN_WIDTH ? "flexible" : "compact",
      "response-field-name": TURNSTILE_RESPONSE_FIELD,
      // Tokens last 5 minutes and the form can take longer: expired ones are replaced
      // automatically, and a timed-out challenge resets itself.
      "refresh-expired": "auto",
      callback: () => setProblem(null),
      "error-callback": () => setProblem("error"),
      "unsupported-callback": () => setProblem("unsupported"),
    });
    if (!widgetId) return;
    widgetIdRef.current = widgetId;
    return () => {
      widgetIdRef.current = null;
      turnstile.remove(widgetId);
    };
  }, [scriptReady]);

  // A token is single use, and the server spends it on any submission it checks (including one
  // that then fails Field validation), so every result needs a new token for the next attempt.
  const initialSignal = useRef(resetSignal);
  useEffect(() => {
    if (resetSignal !== initialSignal.current) resetTurnstile(widgetIdRef.current);
  }, [resetSignal]);

  function retry() {
    setProblem(null);
    resetTurnstile(widgetIdRef.current);
  }

  return (
    <>
      <Script
        src={TURNSTILE_SCRIPT}
        onReady={() => setScriptReady(true)}
        onError={() => setProblem("load-failed")}
      />
      {/* Turnstile owns this element's children (its iframe and the hidden token input). */}
      <div ref={containerRef} className="min-h-[65px]" />
      <p aria-live="polite" className={problem ? "mt-2 text-[0.875rem] text-accent" : undefined}>
        {problem && (
          <>
            {widgetProblemMessages[problem]}
            {problem === "error" && (
              <>
                {" "}
                <button type="button" onClick={retry} className="font-bold text-link underline">
                  ลองอีกครั้ง
                </button>
              </>
            )}
          </>
        )}
      </p>
    </>
  );
}
