import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { SignedInDevice } from "@/lib/auth/accounts";
import { deviceLabel } from "@/lib/auth/device-label";
import { accounts } from "@/lib/auth/server";
import { getCurrentStaff } from "@/lib/auth/session";
import { bangkokEnglishDateTime } from "@/lib/bangkok-time";
import { SignOutDeviceButton, SignOutOtherDevicesButton } from "./sign-out-devices";

/**
 * Where the owner's Account is signed in, on My Account: this device first, then the others newest
 * first. "This device" is the session this request is signed in with, read on the server. Only each
 * device's label, IP and sign-in time are rendered, plus the session id each "Sign out" sends: no
 * user agent, and never a session token. "Sign out all other devices" shows only when there is
 * another device. Reads the session and the database, so render it below its own <Suspense>
 * (`SignedInDevicesSkeleton`).
 */
export async function SignedInDevices() {
  // Already read by the page's requireStaff() in this request, which sent anyone else away.
  const staff = await getCurrentStaff();
  if (!staff) return null;
  const devices = await accounts().listDevices(staff.id, staff.sessionId);
  return (
    <>
      <ul className="divide-y border-y text-sm">
        {devices.map((device) => (
          <DeviceRow key={device.id} device={device} />
        ))}
      </ul>
      {devices.some((device) => !device.isCurrent) && (
        <div className="mt-4">
          <SignOutOtherDevicesButton />
        </div>
      )}
    </>
  );
}

/** One device; any but this one gets "Sign out" (this one signs out from the account menu). */
function DeviceRow({ device }: { device: SignedInDevice }) {
  const descriptionId = `device-${device.id}`;
  return (
    <li className="flex items-center justify-between gap-4 py-3">
      <div id={descriptionId} className="min-w-0">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 leading-normal font-medium">
          {deviceLabel(device.userAgent)}
          {device.isCurrent && <Badge variant="secondary">This device</Badge>}
        </p>
        <p className="mt-0.5 leading-normal text-muted-foreground">
          {device.ipAddress && (
            <>
              <span className="break-all">{device.ipAddress}</span> ·{" "}
            </>
          )}
          Signed in{" "}
          <time dateTime={device.createdAt.toISOString()} className="tabular-nums">
            {bangkokEnglishDateTime(device.createdAt)}
          </time>
        </p>
      </div>
      {!device.isCurrent && <SignOutDeviceButton deviceId={device.id} describedBy={descriptionId} />}
    </li>
  );
}

/** One row's outline while the devices are read. Fixed widths: random ones can't be prerendered. */
export function SignedInDevicesSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-2 border-y py-3">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-4 w-64 max-w-full" />
    </div>
  );
}
