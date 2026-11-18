"use client";

import type { ReactNode } from "react";

/** Aviso flotante. Se queda hasta que el usuario lo cierra, porque contiene indicaciones importantes. */
export function Toast({ title, children, tone = "info", onClose }: { title: string; children: ReactNode; tone?: "success" | "info" | "warning"; onClose: () => void }) {
  return (
    <div className={`toast toast-${tone}`} role="status" aria-live="polite">
      <div className="toast-body">
        <strong>{title}</strong>
        <span className="small">{children}</span>
      </div>
      <button type="button" className="toast-close" aria-label="Cerrar aviso" onClick={onClose}>✕</button>
    </div>
  );
}
