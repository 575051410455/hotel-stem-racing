import type { ComponentProps } from "react";

/** Width clamp shared by header, main sections and footer: 24px gutters on mobile, 32px from 735px. */
export function Container({ className = "", ...props }: ComponentProps<"div">) {
  return (
    <div
      className={`mx-auto w-[min(1600px,100%_-_48px)] tab:w-[min(1600px,100%_-_64px)] ${className}`}
      {...props}
    />
  );
}
