// Text wordmark used until the organisers supply their original logo files.

export function Wordmark({ size = "header" }: { size?: "header" | "footer" }) {
  const scale =
    size === "header" ? "h-6 text-[0.75rem] tab:h-8 tab:text-[1.3rem]" : "h-5 text-[0.85rem]";

  return (
    <span
      className={`inline-flex items-center gap-[0.35em] whitespace-nowrap font-extrabold uppercase italic leading-none tracking-tight ${scale}`}
    >
      <span aria-hidden="true" className="bg-brand-gradient h-[0.9em] w-[0.5em] -skew-x-12 rounded-[2px]" />
      <span className="text-ink-pure">STEM Racing</span>
      <span className="text-accent">Thailand</span>
    </span>
  );
}

export function PartnerWordmark({ className = "" }: { className?: string }) {
  return (
    <span
      className={`whitespace-nowrap text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-ink tab:text-[0.9rem] ${className}`}
    >
      Grand Richmond
    </span>
  );
}
