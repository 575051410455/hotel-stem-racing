import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  ClockIcon,
  LoaderCircleIcon,
  ScanLineIcon,
  ShieldAlertIcon,
  XCircleIcon,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode, Ref } from "react";
import { Button } from "@/components/ui/button";
import { SIGN_IN_PATH } from "@/lib/auth/access";
import { bangkokTime } from "@/lib/bangkok-time";
import type { StaffCheckInFlow } from "@/lib/check-in/staff-flow";
import { eventDayLabel } from "@/lib/event";
import type { CheckedInAttendee, CheckInResult } from "@/lib/registrations/check-in";
import { attendeeRoleShortLabels } from "@/lib/registrations/fields";
import { cn } from "@/lib/utils";
import { staffActionStyles } from "./staff-action-styles";

function Attendee({ attendee, day }: { attendee: CheckedInAttendee; day: string }) {
  return (
    <>
      <p className="w-full text-2xl leading-tight font-semibold wrap-anywhere tab:text-3xl">
        {attendee.givenName} {attendee.familyName}
      </p>
      <p className="text-sm">
        {attendeeRoleShortLabels.en[attendee.role]} · <span className="font-mono">{attendee.passCode}</span>
      </p>
      <p className="text-sm">{eventDayLabel(day, "en")}</p>
    </>
  );
}

function Panel({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex w-full flex-col items-center justify-center gap-3 text-center">
      <span aria-hidden="true">{icon}</span>
      <h2 className="text-xl leading-tight font-semibold tab:text-2xl">{title}</h2>
      {children}
    </div>
  );
}

function DayWarning({ recorded }: { recorded: boolean }) {
  return (
    <p className="rounded-lg border border-yellow-500 bg-yellow-100 px-3 py-2 text-sm font-medium text-neutral-950">
      <AlertTriangleIcon aria-hidden="true" className="mr-1 inline size-4" />
      Not registered for this day.{" "}
      {recorded ? "Check-In has been recorded." : "Confirm only if admitting this Attendee."}
    </p>
  );
}

function Recorded({ result, last = false }: { result: CheckInResult; last?: boolean }) {
  if (!("attendee" in result)) return null;
  const existing = result.status === "already-checked-in";
  const outside = existing
    ? result.outsideRegisteredDay
    : result.status === "checked-in-outside-registered-day";
  return (
    <Panel
      title={existing ? `Already checked in at ${bangkokTime(result.checkedInAt)}` : "Check-In recorded"}
      icon={existing ? <ClockIcon className="size-8" /> : <CheckCircle2Icon className="size-8" />}
    >
      {last && <p className="text-xs font-semibold tracking-wide uppercase">Last result</p>}
      <Attendee attendee={result.attendee} day={result.eventDay} />
      {!existing && <p className="text-sm">Recorded at {bangkokTime(result.checkedInAt)}</p>}
      {outside && <DayWarning recorded />}
    </Panel>
  );
}

type ResultProps = {
  flow: StaffCheckInFlow;
  onConfirm: () => void;
  onClear: () => void;
  onRetryInspection: () => void;
};

function resultTone({ step, lastResult }: StaffCheckInFlow) {
  if (step.kind === "ready") return lastResult ? "success" : "neutral";
  if (step.kind === "signed-out" || step.kind === "uncertain") return "warning";
  if (step.kind === "result") return step.result.status === "not-an-event-pass" ? "error" : "warning";
  return "neutral";
}

/** One persistent announcement region; the entire panel owns its authoritative outcome color. */
export function StaffCheckInResult({ ref, ...props }: ResultProps & { ref?: Ref<HTMLDivElement> }) {
  const tone = resultTone(props.flow);
  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-label="Attendee and Check-In status"
      className={cn(
        "order-1 flex min-w-0 flex-col justify-center rounded-2xl border-2 p-4 shadow-sm outline-offset-4 tab:order-2",
        {
          "border-border bg-card text-card-foreground": tone === "neutral",
          "border-green-800 bg-green-700 text-white": tone === "success",
          "border-yellow-600 bg-yellow-100 text-neutral-950": tone === "warning",
          "border-red-800 bg-red-700 text-white": tone === "error",
        },
      )}
    >
      <ResultContents {...props} />
    </div>
  );
}

/** Staff presentation is separate from the Kiosk's immediate-recording result panel. */
function ResultContents({
  flow,
  onConfirm,
  onClear,
  onRetryInspection,
}: ResultProps) {
  const step = flow.step;
  const scanNext = (
    <Button type="button" size="lg" className={cn("min-h-12 w-full whitespace-normal", staffActionStyles.primary)} onClick={onClear}>
      Scan next
    </Button>
  );
  if (step.kind === "ready")
    return (
      <div className="space-y-3 text-center">
        <p className="flex items-center justify-center gap-2 text-lg font-semibold">
          <ScanLineIcon aria-hidden="true" className="size-5" />
          Ready to scan next
        </p>
        {flow.lastResult ? (
          <Recorded result={flow.lastResult} last />
        ) : (
          <p className="text-sm text-muted-foreground">
            Start the camera or enter a Pass Code.
            <br />
            Review the Attendee before confirming arrival.
          </p>
        )}
      </div>
    );
  if (step.kind === "signed-out")
    return (
      <div className="space-y-4">
        <Panel title="Session ended" icon={<ShieldAlertIcon className="size-8" />}>
          <p className="text-sm">Sign in again, then inspect the pass again before confirming.</p>
        </Panel>
        <Button asChild size="lg" className={cn("min-h-12 w-full", staffActionStyles.primary)}>
          <Link href={SIGN_IN_PATH}>Sign in again</Link>
        </Button>
      </div>
    );
  if (step.kind === "inspecting")
    return (
      <Panel title="Inspecting pass…" icon={<LoaderCircleIcon className="size-8 animate-spin" />}>
        <p className="text-sm">No Check-In is being recorded.</p>
      </Panel>
    );
  if (step.kind === "preview" || step.kind === "confirming" || step.kind === "uncertain") {
    const { preview } = step;
    const confirming = step.kind === "confirming";
    const uncertain = step.kind === "uncertain";
    return (
      <div className="space-y-4">
        <Panel
          title={
            uncertain ? "Unable to confirm result" : confirming ? "Confirming Check-In…" : "Ready to confirm"
          }
          icon={
            confirming ? (
              <LoaderCircleIcon className="size-8 animate-spin" />
            ) : uncertain ? (
              <AlertTriangleIcon className="size-8" />
            ) : (
              <ScanLineIcon className="size-8" />
            )
          }
        >
          <Attendee attendee={preview.attendee} day={preview.eventDay} />
          {preview.outsideRegisteredDay && <DayWarning recorded={false} />}
          <p className="text-sm">
            {uncertain
              ? "A Check-In may already be recorded. Retry to retrieve the result safely."
              : confirming
                ? "Keep this Attendee here while the result is confirmed."
                : "No Check-In recorded yet."}
          </p>
        </Panel>
        <div className="flex flex-wrap justify-center gap-2">
          <Button
            type="button"
            size="lg"
            disabled={confirming}
            className={cn("min-h-14 h-auto flex-1 px-6 py-3 text-lg whitespace-normal", uncertain ? staffActionStyles.retry : staffActionStyles.confirm)}
            onClick={onConfirm}
          >
            {uncertain ? "Retry confirmation" : confirming ? "Confirming…" : "Confirm Check-In"}
          </Button>
          {step.kind === "preview" && (
            <Button type="button" size="lg" variant="outline" className={cn("min-h-14", staffActionStyles.secondary)} onClick={onClear}>
              Cancel
            </Button>
          )}
        </div>
      </div>
    );
  }
  const result = step.result;
  return (
    <div className="space-y-4">
      {"attendee" in result ? (
        <Recorded result={result} />
      ) : (
        <Panel
          title={
            result.status === "inspection-failed"
              ? "Unable to inspect pass"
              : result.status === "not-an-event-day"
                ? "Choose an Event Day"
                : "Invalid Event Pass"
          }
          icon={
            result.status === "not-an-event-pass" ? (
              <XCircleIcon className="size-8" />
            ) : (
              <AlertTriangleIcon className="size-8" />
            )
          }
        >
          <p className="text-sm">
            {result.status === "inspection-failed"
              ? "Inspection did not record a Check-In. Check your connection and retry."
              : result.status === "not-an-event-day"
                ? "Select Scan next, then choose a configured Event Day."
                : "No Check-In recorded. Ask for a valid Event Pass."}
          </p>
        </Panel>
      )}
      {result.status === "inspection-failed" && (
        <Button type="button" variant="outline" className={cn("min-h-12 w-full", staffActionStyles.retry)} onClick={onRetryInspection}>
          Retry inspection
        </Button>
      )}
      {scanNext}
    </div>
  );
}
