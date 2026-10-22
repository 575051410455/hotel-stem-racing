// Form controls for the public registration form, on the template's structure: real labels,
// 48px inputs (56px from `tab:`), a 1px muted border that turns accent on error, and an
// error line announced politely and tied to its control with aria-describedby.

import type { ComponentProps, FocusEvent, ReactNode } from "react";

export const errorId = (id: string) => `${id}-error`;
export const helpId = (id: string) => `${id}-help`;

/** Space-separated ids for aria-describedby, or undefined when there are none. */
export function describedBy(...ids: (string | false | undefined)[]) {
  return ids.filter(Boolean).join(" ") || undefined;
}

const controlBase =
  "w-full rounded-input border bg-surface px-4 text-base text-ink-pure placeholder:text-muted";
const borderFor = (error?: string) => (error ? "border-accent" : "border-muted");

export function RequiredMark() {
  return (
    <span aria-hidden="true" className="ml-0.5 text-accent">
      *
    </span>
  );
}

function AlertIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="mt-0.5 size-4 shrink-0" fill="currentColor">
      <path d="M10 1.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17Zm0 11.75a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2ZM10 5a1 1 0 0 0-1 1v5a1 1 0 1 0 2 0V6a1 1 0 0 0-1-1Z" />
    </svg>
  );
}

/** Always rendered, so the live region exists before a message arrives. */
export function FieldError({ id, message }: { id: string; message?: string }) {
  return (
    <p
      id={errorId(id)}
      aria-live="polite"
      className={message ? "mt-2 flex items-start gap-1.5 text-[0.875rem] text-accent" : undefined}
    >
      {message && (
        <>
          <AlertIcon />
          <span>{message}</span>
        </>
      )}
    </p>
  );
}

function Help({ id, children }: { id: string; children?: ReactNode }) {
  if (!children) return null;
  return (
    <div id={helpId(id)} className="mb-2 text-[0.875rem] text-muted">
      {children}
    </div>
  );
}

type FieldShellProps = {
  id: string;
  label: ReactNode;
  required?: boolean;
  help?: ReactNode;
  error?: string;
};

export function TextField({
  id,
  label,
  required,
  help,
  error,
  className = "",
  ...input
}: FieldShellProps & Omit<ComponentProps<"input">, "id">) {
  return (
    <div className={`flex flex-col ${className}`}>
      <label htmlFor={id} className="mb-2 font-bold">
        {label}
        {required && <RequiredMark />}
      </label>
      <Help id={id}>{help}</Help>
      <input
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(help ? helpId(id) : undefined, error && errorId(id))}
        className={`${controlBase} ${borderFor(error)} h-12 tab:h-14`}
        {...input}
      />
      <FieldError id={id} message={error} />
    </div>
  );
}

export function TextAreaField({
  id,
  label,
  required,
  help,
  error,
  ...textarea
}: FieldShellProps & Omit<ComponentProps<"textarea">, "id">) {
  return (
    <div className="flex flex-col">
      <label htmlFor={id} className="mb-2 font-bold">
        {label}
        {required && <RequiredMark />}
      </label>
      <Help id={id}>{help}</Help>
      <textarea
        id={id}
        rows={3}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(help ? helpId(id) : undefined, error && errorId(id))}
        className={`${controlBase} ${borderFor(error)} min-h-28 resize-y py-3`}
        {...textarea}
      />
      <FieldError id={id} message={error} />
    </div>
  );
}

type ChoiceGroupProps = {
  id: string;
  name: string;
  type: "radio" | "checkbox";
  legend: ReactNode;
  /** How many may be chosen, e.g. "(เลือก 1 ข้อ)". */
  hint: string;
  options: readonly { value: string; label: string }[];
  selected: readonly string[];
  required?: boolean;
  error?: string;
  onToggle: (value: string, checked: boolean) => void;
  /** Fires when focus leaves the whole group, not when it moves between options. */
  onLeave: () => void;
  columns?: 1 | 2;
};

export function ChoiceGroup({
  id,
  name,
  type,
  legend,
  hint,
  options,
  selected,
  required,
  error,
  onToggle,
  onLeave,
  columns = 1,
}: ChoiceGroupProps) {
  const handleBlur = (event: FocusEvent<HTMLFieldSetElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) onLeave();
  };

  return (
    <fieldset className="flex min-w-0 flex-col" onBlur={handleBlur}>
      <legend className="mb-2 font-bold">
        {legend}
        {required && (
          <>
            <RequiredMark />
            {type === "checkbox" && <span className="sr-only">(จำเป็น)</span>}
          </>
        )}{" "}
        <span className="font-normal text-muted">{hint}</span>
      </legend>
      <div
        className={`grid gap-x-4 rounded-input border px-4 py-1 ${borderFor(error)} ${
          columns === 2 ? "tab:grid-cols-2" : ""
        }`}
      >
        {options.map((option) => {
          const optionId = `${id}-${option.value}`;
          return (
            <label
              key={option.value}
              htmlFor={optionId}
              className="flex min-h-12 cursor-pointer items-center gap-3 py-1"
            >
              <input
                id={optionId}
                type={type}
                name={name}
                value={option.value}
                checked={selected.includes(option.value)}
                onChange={(event) => onToggle(option.value, event.target.checked)}
                required={type === "radio" ? required : undefined}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? errorId(id) : undefined}
                className="size-5 shrink-0 accent-accent"
              />
              <span>{option.label}</span>
            </label>
          );
        })}
      </div>
      <FieldError id={id} message={error} />
    </fieldset>
  );
}
