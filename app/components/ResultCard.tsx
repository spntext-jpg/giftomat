import type { ReactNode } from "react";

interface ResultCardProps {
  title: string;
  meta?: ReactNode;
  warning?: ReactNode;
  children?: ReactNode;
  actionLabel?: string;
  actionIcon?: ReactNode;
  onAction?: () => void;
  className?: string;
}

export default function ResultCard({
  title,
  meta,
  warning,
  children,
  actionLabel,
  actionIcon,
  onAction,
  className = "",
}: ResultCardProps) {
  return (
    <div className={`result-card ${className}`.trim()} aria-live="polite">
      <div className="result-check" aria-hidden="true">✓</div>
      <div>
        <strong>{title}</strong>
        {meta ? <div className="result-meta">{meta}</div> : null}
        {warning ? <div className="result-warning">{warning}</div> : null}
        {children}
      </div>
      {actionLabel && onAction ? (
        <button type="button" className="download-button" onClick={onAction}>
          {actionIcon}
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
