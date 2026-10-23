import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { CAMERA_PREFERENCE_KEY, cameraPreference, type PreferenceStorage } from "./camera-preference";

/** An in-memory stand-in for the device's localStorage. */
function memoryStorage(initial: Record<string, string> = {}): PreferenceStorage & { items: Map<string, string> } {
  const items = new Map(Object.entries(initial));
  return {
    items,
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => void items.set(key, value),
  };
}

describe("Camera preference", () => {
  test("with nothing stored on the device, the back camera is chosen", () => {
    const preference = cameraPreference(() => memoryStorage());
    assert.equal(preference.read(), "back");
  });

  test('a stored "front" chooses the front camera', () => {
    const preference = cameraPreference(() => memoryStorage({ [CAMERA_PREFERENCE_KEY]: "front" }));
    assert.equal(preference.read(), "front");
  });

  test('any stored value other than exactly "front" chooses the back camera', () => {
    for (const stored of ["back", "", "FRONT", "Front", " front", "front ", "user", "environment", "null", "true"]) {
      const preference = cameraPreference(() => memoryStorage({ [CAMERA_PREFERENCE_KEY]: stored }));
      assert.equal(preference.read(), "back", JSON.stringify(stored));
    }
  });

  test("storage that throws, as in private browsing, falls back to the back camera without throwing", () => {
    const fails = () => {
      throw new DOMException("The operation is insecure.", "SecurityError");
    };
    const throwingOnRead = cameraPreference(() => ({ getItem: fails, setItem: fails }));
    assert.equal(throwingOnRead.read(), "back");
    // Safari can throw on merely reaching window.localStorage.
    const unreachable = cameraPreference(fails);
    assert.equal(unreachable.read(), "back");
  });

  test("saving to storage that throws, as when it is full or blocked, does not throw", () => {
    const fails = () => {
      throw new DOMException("The quota has been exceeded.", "QuotaExceededError");
    };
    const throwingOnWrite = cameraPreference(() => ({ getItem: () => null, setItem: fails }));
    assert.doesNotThrow(() => throwingOnWrite.save("front"));
    assert.equal(throwingOnWrite.read(), "back");
    assert.doesNotThrow(() => cameraPreference(fails).save("front"));
  });

  test("a saved choice is what the device reads back, for both cameras", () => {
    const storage = memoryStorage();
    const preference = cameraPreference(() => storage);
    preference.save("front");
    assert.equal(preference.read(), "front");
    preference.save("back");
    assert.equal(preference.read(), "back");
    preference.save("front");
    // Another page load on the same device reads the same storage.
    assert.equal(cameraPreference(() => storage).read(), "front");
  });
});
