"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { SIGN_IN_PATH } from "@/lib/auth/access";
import { eventDayLabel } from "@/lib/event";
import type { BulkSendMessageResult, BulkSendSummary } from "@/lib/registrations/bulk-send";
import type { BulkSendMode } from "@/lib/registrations/bulk-send-params";
import { cn } from "@/lib/utils";
import { sendFailureMessage } from "../_registration-list/event-pass-email";
import { registrationListKey } from "../_registration-list/list-endpoint";
import { toastError, toastInfo, toastSuccess } from "../_shell/toasts";
import { BackOfficeRequestError } from "../query-provider";
import { bulkSendSummaryKey, bulkSendSummaryQuery, postEventPassBatch } from "./bulk-send-api";

const formatCount = new Intl.NumberFormat("en-GB").format;

/** "emails" after any count but 1. */
const emailsUnit = (count: number) => (count === 1 ? "email" : "emails");

/** "1 email" / "1,234 emails". */
const formatEmails = (count: number) => `${formatCount(count)} ${emailsUnit(count)}`;

/** "1 person" / "1,234 people". */
const formatPeople = (count: number) => `${formatCount(count)} ${count === 1 ? "person" : "people"}`;

const modeOptions: { mode: BulkSendMode; title: string; description: string; recipients: string }[] = [
  {
    mode: "unsent",
    title: "Only those not yet sent",
    description: "Attendees never successfully sent an Event Pass, for example during an email outage",
    recipients: "Attendees not yet sent an Event Pass",
  },
  {
    mode: "all",
    title: "Everyone",
    description: "Every Attendee. Those already sent one get another.",
    recipients: "every Attendee",
  },
];

type Failure = Extract<BulkSendMessageResult, { status: "failed" }>;

/** Why a bulk send is waiting for Staff. */
type PauseReason = "stopped" | "all-failed" | "request-failed" | "signed-out" | "email-not-configured";

/** One confirmed bulk send, as far as it has got. */
type Run = {
  mode: BulkSendMode;
  /** Emails in the confirmed summary. */
  total: number;
  /** The summary's bound: Registrations made after it are left out. */
  throughId: number;
  /** The cursor: the next batch starts after this Registration id. */
  afterId: number;
  /** Emails tried so far, sent or failed. */
  processed: number;
  sent: number;
  failures: Failure[];
  state: "running" | "paused" | "done";
  pauseReason?: PauseReason;
};

/**
 * Bulk send of Event Pass emails: choose who, read the summary, confirm, then batches of up to 25
 * go out one request at a time until the server says done. Stop takes effect after the batch in
 * flight (its cursor is needed to go on); Resume carries on from there. One loop at a time.
 * Progress stays on the page while it runs; a toast sums up the run when it ends or stops.
 */
export function BulkSend() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [mode, setMode] = useState<BulkSendMode>("unsent");
  /** The summary Staff are confirming; its numbers stay put while they decide. */
  const [confirming, setConfirming] = useState<BulkSendSummary | null>(null);
  const [run, setRun] = useState<Run | null>(null);
  const [stopPending, setStopPending] = useState(false);
  const loopActive = useRef(false);
  const stopRequested = useRef(false);
  const summary = useQuery({ ...bulkSendSummaryQuery(mode), enabled: run === null && confirming === null });

  // Leaving the page stops the loop after the batch in flight.
  useEffect(() => {
    return () => {
      stopRequested.current = true;
    };
  }, []);

  async function sendBatches(from: Run) {
    if (loopActive.current) return; // never two loops at once
    loopActive.current = true;
    stopRequested.current = false;
    setStopPending(false);
    let current: Run = { ...from, state: "running", pauseReason: undefined };
    setRun(current);
    try {
      for (;;) {
        if (stopRequested.current) {
          current = { ...current, state: "paused", pauseReason: "stopped" };
          break;
        }
        let batch;
        try {
          batch = await postEventPassBatch({
            mode: current.mode,
            afterId: current.afterId,
            throughId: current.throughId,
          });
        } catch (error) {
          const signedOut = error instanceof BackOfficeRequestError && error.status === 401;
          current = { ...current, state: "paused", pauseReason: signedOut ? "signed-out" : "request-failed" };
          break;
        }
        if (batch.status === "email-not-configured") {
          current = { ...current, state: "paused", pauseReason: "email-not-configured" };
          break;
        }
        const failures = batch.results.filter((result): result is Failure => result.status === "failed");
        const sent = batch.results.length - failures.length;
        current = {
          ...current,
          afterId: batch.nextAfterId,
          processed: current.processed + batch.results.length,
          sent: current.sent + sent,
          failures: [...current.failures, ...failures],
        };
        if (batch.done) {
          current = { ...current, state: "done" };
          break;
        }
        // Nothing in a whole batch went out: the SMTP server or the quota is the likely cause,
        // so wait for Staff instead of running through the rest of the list.
        if (sent === 0) {
          current = { ...current, state: "paused", pauseReason: "all-failed" };
          break;
        }
        setRun(current);
      }
    } finally {
      loopActive.current = false;
      setStopPending(false);
      setRun(current);
      void queryClient.invalidateQueries({ queryKey: bulkSendSummaryKey });
      void queryClient.invalidateQueries({ queryKey: registrationListKey });
      // The overview numbers (Event Pass email not sent) are server-rendered.
      router.refresh();
      toastRunEnded(current);
    }
  }

  function start(confirmed: BulkSendSummary) {
    if (confirmed.throughId === null) return;
    setConfirming(null);
    void sendBatches({
      mode: confirmed.mode,
      total: confirmed.emails,
      throughId: confirmed.throughId,
      afterId: 0,
      processed: 0,
      sent: 0,
      failures: [],
      state: "running",
    });
  }

  function stop() {
    stopRequested.current = true;
    setStopPending(true);
  }

  function startOver() {
    setRun(null);
    void queryClient.invalidateQueries({ queryKey: bulkSendSummaryKey });
  }

  const locked = run !== null || confirming !== null;

  return (
    <div className="mt-6 space-y-6">
      <fieldset disabled={locked} className="disabled:opacity-60">
        <legend className="text-sm leading-normal font-medium">Send to</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {modeOptions.map((option) => (
            <label
              key={option.mode}
              className={cn(
                "flex cursor-pointer flex-col gap-1 rounded-lg border-2 border-neutral-300 bg-white px-4 py-3 leading-normal",
                "has-[:checked]:border-neutral-950 has-[:checked]:bg-neutral-950 has-[:checked]:text-white",
                "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-neutral-950",
                "has-[:disabled]:cursor-not-allowed",
              )}
            >
              <input
                type="radio"
                name="bulk-send-mode"
                value={option.mode}
                checked={mode === option.mode}
                onChange={() => setMode(option.mode)}
                className="sr-only"
              />
              <span className="font-medium">{option.title}</span>
              <span className="text-sm">{option.description}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {run ? (
        <RunPanel run={run} stopPending={stopPending} onStop={stop} onResume={() => void sendBatches(run)} onStartOver={startOver} />
      ) : (
        <SummaryPanel
          query={summary}
          confirming={confirming}
          onSend={setConfirming}
          onCancel={() => setConfirming(null)}
          onConfirm={start}
        />
      )}
    </div>
  );
}

function SummaryPanel({
  query,
  confirming,
  onSend,
  onCancel,
  onConfirm,
}: {
  query: ReturnType<typeof useQuery<BulkSendSummary>>;
  confirming: BulkSendSummary | null;
  onSend: (summary: BulkSendSummary) => void;
  onCancel: () => void;
  onConfirm: (summary: BulkSendSummary) => void;
}) {
  const shown = confirming ?? query.data;

  if (!shown) {
    if (query.isError) {
      const signedOut = query.error instanceof BackOfficeRequestError && query.error.status === 401;
      return (
        <section aria-labelledby="bulk-send-summary-heading" className="rounded-xl border bg-white p-5">
          <h2 id="bulk-send-summary-heading" className="font-semibold leading-normal">
            Summary before sending
          </h2>
          {signedOut ? (
            <p className="mt-2 leading-normal">
              Session expired.{" "}
              <Link href={SIGN_IN_PATH} className="font-medium underline underline-offset-4">
                Sign in again
              </Link>
            </p>
          ) : (
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <p className="leading-normal">Couldn&apos;t count the emails</p>
              <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
                Try again
              </Button>
            </div>
          )}
        </section>
      );
    }
    return (
      <p role="status" className="text-sm leading-normal text-muted-foreground">
        Counting emails…
      </p>
    );
  }

  const recipients = modeOptions.find((option) => option.mode === shown.mode)?.recipients;
  const canSend = shown.emailConfigured && shown.emails > 0;

  return (
    <section aria-labelledby="bulk-send-summary-heading" className="rounded-xl border bg-white p-5">
      <h2 id="bulk-send-summary-heading" className="font-semibold leading-normal">
        Summary before sending
      </h2>
      <p className="mt-3 leading-normal">
        <span className="text-4xl font-semibold tabular-nums">{formatCount(shown.emails)}</span>{" "}
        <span className="text-muted-foreground">{emailsUnit(shown.emails)}</span>
      </p>
      <p className="text-sm leading-normal text-muted-foreground">
        Emails to send, to {recipients} (one per Registration)
      </p>

      <h3 className="mt-5 text-sm leading-normal font-medium">By Event Day chosen</h3>
      <dl className="mt-1 divide-y border-y">
        {shown.eventDays.map((day) => (
          <div key={day.eventDay} className="flex items-baseline justify-between gap-4 py-2 text-sm leading-normal">
            <dt>{eventDayLabel(day.eventDay, "en")}</dt>
            <dd className="font-medium tabular-nums">{formatPeople(day.registrations)}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-sm leading-normal text-muted-foreground">
        People who chose both days count on each day but get one email.
      </p>

      {!shown.emailConfigured && (
        <p className="mt-4 rounded-lg border-2 border-orange-700 bg-orange-50 p-3 text-sm leading-normal font-medium text-orange-900">
          Email (SMTP) isn&apos;t set up, so Event Passes can&apos;t be emailed yet.
        </p>
      )}
      {shown.emailConfigured && shown.emails === 0 && (
        <p className="mt-4 text-sm leading-normal font-medium">No emails to send</p>
      )}

      {confirming ? (
        <ConfirmBox summary={confirming} recipients={recipients ?? ""} onCancel={onCancel} onConfirm={onConfirm} />
      ) : (
        <Button className="mt-5" disabled={!canSend} onClick={() => onSend(shown)}>
          Send {formatEmails(shown.emails)}…
        </Button>
      )}
    </section>
  );
}

function ConfirmBox({
  summary,
  recipients,
  onCancel,
  onConfirm,
}: {
  summary: BulkSendSummary;
  recipients: string;
  onCancel: () => void;
  onConfirm: (summary: BulkSendSummary) => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);

  return (
    <div role="group" aria-labelledby="bulk-send-confirm-heading" className="mt-5 rounded-lg bg-neutral-100 p-4">
      <h3 id="bulk-send-confirm-heading" ref={heading} tabIndex={-1} className="font-semibold leading-normal outline-none">
        Send {formatCount(summary.emails)} Event Pass {emailsUnit(summary.emails)}?
      </h3>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-normal">
        <li>To {recipients}</li>
        {summary.mode === "all" && <li>Attendees already sent an Event Pass get another one</li>}
        <li>Sent in batches of up to 25. Keep this page open until it finishes.</li>
        <li>Gmail limits emails per day (about 500, or 2,000 for Google Workspace).</li>
      </ul>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button onClick={() => onConfirm(summary)}>Confirm: send {formatCount(summary.emails)}</Button>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

const pauseMessages: Record<PauseReason, string> = {
  stopped: "Sending stopped. Press “Resume” to send the rest.",
  "all-failed": "Every email in the last batch failed, so sending is paused. Check the reasons below, then press “Resume”.",
  "request-failed": "Couldn't reach the server. Part of the last batch may have been sent. Press “Resume” to try again.",
  "signed-out": "Session expired. Sign in in a new tab, then come back and press “Resume”.",
  "email-not-configured": "Email (SMTP) isn't set up, so nothing can be sent.",
};

/**
 * The run's result once it ends or stops. It may show on another page (leaving this one stops the
 * run), so the title names the bulk send. A clean finish and a stop (Stop, or leaving the page)
 * close by themselves; failed emails and the other pauses need Staff, so they stay.
 */
function toastRunEnded(run: Run) {
  const tally = `${formatCount(run.sent)} sent · ${formatCount(run.failures.length)} failed`;
  if (run.state === "done") {
    // "Finished", not "sent", when some failed (the organisers' choice).
    if (run.failures.length > 0) toastError("Event Pass emails finished", { description: tally });
    else toastSuccess("Event Pass emails sent", { description: tally });
    return;
  }
  const reason = run.pauseReason ?? "stopped";
  const toast = reason === "stopped" ? toastInfo : toastError;
  toast("Event Pass emails paused", {
    description: (
      <>
        <span className="block">{tally}</span>
        <span className="block">{pauseMessages[reason]}</span>
      </>
    ),
  });
}

function RunPanel({
  run,
  stopPending,
  onStop,
  onResume,
  onStartOver,
}: {
  run: Run;
  stopPending: boolean;
  onStop: () => void;
  onResume: () => void;
  onStartOver: () => void;
}) {
  const percent = run.state === "done" ? 100 : Math.min(100, Math.floor((run.processed / Math.max(run.total, 1)) * 100));
  const heading = { running: "Sending Event Pass emails…", paused: "Paused", done: "Finished" }[run.state];

  return (
    <section aria-labelledby="bulk-send-run-heading" className="rounded-xl border bg-white p-5">
      {/* Stop sits up here, away from Resume and the confirm button below: a double click on
          either would otherwise land on Stop as soon as it replaces them. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="bulk-send-run-heading" className="font-semibold leading-normal">
          {heading}
        </h2>
        {run.state === "running" && (
          <Button variant="outline" onClick={onStop} disabled={stopPending}>
            {stopPending ? "Stopping after this batch…" : "Stop"}
          </Button>
        )}
      </div>

      <div
        role="progressbar"
        aria-labelledby="bulk-send-run-heading"
        aria-valuemin={0}
        aria-valuemax={run.total}
        aria-valuenow={Math.min(run.processed, run.total)}
        aria-valuetext={`${formatCount(run.processed)} of ${formatEmails(run.total)}`}
        className="mt-4 h-3 overflow-hidden rounded-full bg-neutral-200"
      >
        <div
          className={cn("h-full rounded-full transition-[width]", run.state === "done" ? "bg-green-700" : "bg-neutral-900")}
          style={{ width: `${percent}%` }}
        />
      </div>

      <div role="status" aria-live="polite" className="mt-3">
        <p className="leading-normal">
          Processed <span className="font-semibold tabular-nums">{formatCount(run.processed)}</span> of{" "}
          <span className="tabular-nums">{formatCount(run.total)}</span> {emailsUnit(run.total)}
        </p>
        <p className="text-sm leading-normal">
          <span className="font-medium tabular-nums">{formatCount(run.sent)}</span> sent ·{" "}
          <span className={cn("font-medium tabular-nums", run.failures.length > 0 && "text-destructive")}>
            {formatCount(run.failures.length)}
          </span>{" "}
          failed
        </p>
        {run.state === "paused" && run.pauseReason && (
          <p className="mt-3 rounded-lg border-2 border-orange-700 bg-orange-50 p-3 text-sm leading-normal font-medium text-orange-900">
            {pauseMessages[run.pauseReason]}
          </p>
        )}
      </div>

      {run.state === "running" && (
        <p className="mt-3 text-sm leading-normal text-muted-foreground">
          Keep this page open until it finishes. If you leave, sending stops after the current batch.
        </p>
      )}

      {run.state !== "running" && (
        <div className="mt-4 flex flex-wrap gap-3">
          {run.state === "paused" && (
            <>
              <Button onClick={onResume}>Resume</Button>
              <Button variant="outline" onClick={onStartOver}>
                Cancel the rest
              </Button>
            </>
          )}
          {run.state === "done" && (
            <Button variant="outline" onClick={onStartOver}>
              Start a new send
            </Button>
          )}
        </div>
      )}

      {run.failures.length > 0 && <FailureList failures={run.failures} done={run.state === "done"} />}
    </section>
  );
}

function FailureList({ failures, done }: { failures: Failure[]; done: boolean }) {
  return (
    <div className="mt-6">
      <h3 className="text-sm leading-normal font-semibold">{formatCount(failures.length)} failed</h3>
      {done && (
        <p className="mt-1 text-sm leading-normal text-muted-foreground">
          Attendees never sent an Event Pass are included in the next “Only those not yet sent” send.
        </p>
      )}
      <ul className="mt-2 divide-y border-y">
        {failures.map((failure) => (
          <li key={failure.id} className="py-2 text-sm leading-normal">
            <p>
              <span className="font-mono font-medium">{failure.passCode}</span> · {failure.givenName} {failure.familyName}{" "}
              · <span className="break-all">{failure.email}</span>
            </p>
            <p className="text-destructive">{sendFailureMessage(failure.reason)}</p>
            <p className="font-mono text-xs break-all text-muted-foreground">{failure.reason}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
