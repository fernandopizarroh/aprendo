"use client";

import { useState } from "react";
import { api } from "@/lib/client/api";

/**
 * Habilita otro Desafío para el alumno (2 intentos, preguntas nuevas). Pide confirmación antes de hacerlo.
 */
export function ExtraChallengeButton({ routeId, studentName, onDone }: { routeId: string; studentName: string; onDone: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function grant() {
    setBusy(true);
    setError("");
    const r = await api<{ studentName: string; attempts: number }>(`/api/routes/${routeId}/extra-challenge`, "POST");
    setBusy(false);
    if (!r.ok) {
      setConfirming(false);
      return setError(r.data.error ?? "No se pudo habilitar el Desafío");
    }
    setConfirming(false);
    setMessage(`Listo. ${r.data.studentName} puede rendir otro Desafío (${r.data.attempts} intentos) con preguntas nuevas.`);
    onDone();
  }

  if (message) return <p role="status" className="alert alert-success" style={{ margin: 0 }}>✔ {message}</p>;

  return (
    <div className="stack-sm">
      {!confirming ? (
        <button type="button" className="btn btn-secondary btn-block" onClick={() => setConfirming(true)}>➕ Habilitar otro Desafío</button>
      ) : (
        <div className="card stack-sm" role="alertdialog" aria-label="Confirmar otro Desafío">
          <p style={{ margin: 0 }}><strong>¿Habilitar otro Desafío para {studentName}?</strong></p>
          <p className="small muted" style={{ margin: 0 }}>
            Tendrá 2 intentos con preguntas nuevas. Sus resultados anteriores se conservan. Si no lo aprueba, su aprobación anterior sigue vigente y no tendrá que volver a repasar.
          </p>
          <button type="button" className="btn btn-block" onClick={grant} disabled={busy}>{busy ? "Habilitando…" : "Sí, habilitar"}</button>
          <button type="button" className="btn btn-secondary btn-block" onClick={() => setConfirming(false)} disabled={busy}>Cancelar</button>
        </div>
      )}
      {error && <p role="alert" className="alert alert-error" style={{ margin: 0 }}>{error}</p>}
    </div>
  );
}
