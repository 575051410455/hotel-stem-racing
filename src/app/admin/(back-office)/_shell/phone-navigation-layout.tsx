"use client";

import { createContext, type ReactNode, useContext, useEffect, useState, useSyncExternalStore } from "react";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

const PhoneNavigationContext = createContext({ isPhone: false, keyboardOpen: false });

function phoneSnapshot() {
  // Compact screen dimensions survive rotation/keyboard changes. Even the 744pt iPad mini
  // keeps its existing sidebar/drawer; pointer type can change when a tablet gains a trackpad.
  return Math.min(window.screen.width, window.screen.height) < 600;
}

function subscribeToPhoneLayout(onChange: () => void) {
  window.addEventListener("resize", onChange);
  window.addEventListener("orientationchange", onChange);
  return () => {
    window.removeEventListener("resize", onChange);
    window.removeEventListener("orientationchange", onChange);
  };
}

function isEditingText() {
  const element = document.activeElement;
  return element instanceof HTMLElement && (
    element.isContentEditable || element instanceof HTMLTextAreaElement ||
    (element instanceof HTMLInputElement && !["button", "checkbox", "color", "file", "hidden", "radio", "range", "reset", "submit"].includes(element.type))
  );
}

/** Scoped to the signed-in shell; neither the public site nor the Kiosk gains bottom spacing. */
export function PhoneNavigationLayout({ children }: { children: ReactNode }) {
  const isPhone = useSyncExternalStore(subscribeToPhoneLayout, phoneSnapshot, () => false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    if (!isPhone) return;
    const viewport = window.visualViewport;
    const heights = new Map<number, number>();
    let wasOpen = false;
    let frame = 0;

    function update() {
      // Width distinguishes rotation from a keyboard shrinking only the viewport's height,
      // including Safari versions that keep screen.width/height in portrait orientation.
      const landscape = window.innerWidth > Math.min(window.screen.width, window.screen.height) + 1;
      const orientation = landscape ? 1 : 0;
      const editing = isEditingText();
      const screenHeight = landscape
        ? Math.min(window.screen.width, window.screen.height)
        : Math.max(window.screen.width, window.screen.height);
      const baseline = heights.get(orientation) ?? (editing ? screenHeight : window.innerHeight);
      const visibleHeight = viewport ? viewport.height * viewport.scale : window.innerHeight;
      const lostHeight = baseline - Math.min(window.innerHeight, visibleHeight);
      // Focus alone (including a hardware keyboard) and normal toolbar movement are insufficient.
      const reduced = lostHeight > Math.max(120, baseline * 0.2);
      wasOpen = reduced && (editing || wasOpen);
      if (!wasOpen && !editing) heights.set(orientation, Math.max(baseline, window.innerHeight));
      setKeyboardOpen(wasOpen);
    }

    function schedule() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    }

    schedule();
    window.addEventListener("resize", schedule);
    window.addEventListener("orientationchange", schedule);
    viewport?.addEventListener("resize", schedule);
    viewport?.addEventListener("scroll", schedule);
    document.addEventListener("focusin", schedule);
    document.addEventListener("focusout", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("orientationchange", schedule);
      viewport?.removeEventListener("resize", schedule);
      viewport?.removeEventListener("scroll", schedule);
      document.removeEventListener("focusin", schedule);
      document.removeEventListener("focusout", schedule);
    };
  }, [isPhone]);

  const state = { isPhone, keyboardOpen: isPhone && keyboardOpen };
  return (
    <PhoneNavigationContext.Provider value={state}>
      <div
        className="back-office-phone-layout flex min-w-0 flex-1 flex-col"
        data-phone-navigation={isPhone}
        data-keyboard-open={state.keyboardOpen}
      >
        {children}
      </div>
    </PhoneNavigationContext.Provider>
  );
}

export function usePhoneNavigation() {
  return useContext(PhoneNavigationContext);
}

/** The phone bar replaces this trigger; desktop/iPad retain normal sidebar controls. */
export function BackOfficeSidebarToggle() {
  const { isPhone } = usePhoneNavigation();
  if (isPhone) return null;
  return (
    <>
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4" />
    </>
  );
}
