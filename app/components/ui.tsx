import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" };

export function Button({ className = "", variant = "primary", ...props }: ButtonProps) {
  return <button className={`button ${variant === "secondary" ? "button-secondary" : ""} ${className}`.trim()} {...props} />;
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: string };

export function Input({ id, label, error, hint, className = "", ...props }: InputProps) {
  const inputId = id ?? props.name;
  return (
    <div className="field">
      <label htmlFor={inputId}>{label}</label>
      <input id={inputId} className={`input ${error ? "input-error" : ""} ${className}`.trim()} aria-invalid={Boolean(error)} aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined} {...props} />
      {hint && !error && <span className="field-hint" id={`${inputId}-hint`}>{hint}</span>}
      {error && <ErrorField id={`${inputId}-error`}>{error}</ErrorField>}
    </div>
  );
}

export function ErrorField({ children, id }: { children: ReactNode; id?: string }) {
  return <p className="error-field" id={id} role="alert">{children}</p>;
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`card ${className}`.trim()}>{children}</section>;
}

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="page-header">
      <div>
        {eyebrow && <p className="eyebrow page-eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="page-description">{description}</p>}
      </div>
      {action && <div className="page-header-action">{action}</div>}
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="empty-state">
      <span className="empty-orbit" aria-hidden="true"><span /></span>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
