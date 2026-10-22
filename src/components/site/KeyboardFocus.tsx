"use client";

import { useEffect } from "react";

/** Adds `using-pointer` to <html> on pointer input and removes it on Tab, gating focus rings. */
export function KeyboardFocus() {
  useEffect(() => {
    const root = document.documentElement;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Tab") root.classList.remove("using-pointer");
    };
    const onPointerDown = () => root.classList.add("using-pointer");

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, []);

  return null;
}
