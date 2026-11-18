"use client";

import { useEffect, useState } from "react";

const SLOW_AFTER_SECONDS = 150;

/** Espera mientras se preparan preguntas nuevas. Si tarda más de lo normal, lo dice y deja volver. */
export function WaitingCard({ title, backHref }: { title: string; backHref: string }) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const slow = seconds >= SLOW_AFTER_SECONDS;

  return (
    <div className="card stack-sm center" aria-live="polite">
      <div style={{ fontSize: "2rem" }} aria-hidden>✨</div>
      <p style={{ margin: 0 }}><strong>{title}</strong></p>
      <p className="small muted" style={{ margin: 0 }}>
        Cada intento tiene preguntas distintas. Normalmente tarda menos de un minuto; no cierres esta página.
      </p>
      <span className="spinner" aria-hidden style={{ margin: "0 auto" }} />
      <p className="small muted" style={{ margin: 0 }}>Esperando hace {seconds} s</p>
      {slow && (
        <div className="alert alert-warning stack-sm" role="alert">
          <span>Está tardando más de lo normal. Puedes volver más tarde: seguiremos intentándolo.</span>
          <a className="btn btn-secondary btn-block" href={backHref}>Volver a la ruta</a>
        </div>
      )}
    </div>
  );
}
