// Camera preference (pure, separate from React): which camera the Check-In scanner opens on this
// device. It is kept per device in localStorage, not per Account, because the right camera
// depends on the phone or tablet and how it is mounted, not on who is signed in.

/** The camera the scanner opens: the device's front (selfie) camera or its back camera. */
export type CameraFacing = "front" | "back";

/** The slice of Web Storage the preference needs; `window.localStorage` fits it. */
export type PreferenceStorage = Pick<Storage, "getItem" | "setItem">;

/** The localStorage key holding this device's choice. */
export const CAMERA_PREFERENCE_KEY = "stem-racing:check-in-camera";

/**
 * Reads and saves the device's camera choice in the storage `storage()` returns. Storage is
 * reached through a function because Safari can throw on merely touching `window.localStorage`
 * (private browsing, blocked site data). Neither method ever throws: a failed read means the back
 * camera, and a failed save just isn't remembered.
 */
export function cameraPreference(storage: () => PreferenceStorage) {
  return {
    /** "front" only when exactly "front" is stored; anything else, or nothing, is the back camera. */
    read(): CameraFacing {
      try {
        return storage().getItem(CAMERA_PREFERENCE_KEY) === "front" ? "front" : "back";
      } catch {
        return "back";
      }
    },

    save(facing: CameraFacing): void {
      try {
        storage().setItem(CAMERA_PREFERENCE_KEY, facing);
      } catch {
        // Not remembered; the scanner still works with the camera that is open.
      }
    },
  };
}

/** This device's camera preference, in the browser's localStorage. */
export const deviceCameraPreference = cameraPreference(() => window.localStorage);
