"use client";

import { useState, type FormEvent } from "react";
import { api } from "@/lib/client/api";

type Step = "idle" | "password" | "verdict";

interface Props {
  attemptId: string;
  position: number;
  /** El Desafío no revela el resultado: solo confirma que quedó validada. */
  hideOutcome?: boolean;
  /** Ya validada por el adulto (al retomar un intento). */
  alreadyMarked?: boolean;
  onMarked: (verdict: number, data: Record<string, unknown>) => void;
}

/**
 * Actividad para hacer en el cuaderno. La valida un adulto: debe ingresar la contraseña de apoderado,
 * ver la respuesta esperada y marcar Correcto, Correcto con ayuda o Error (Error cuenta como incorrecta).
 */
export function ActivityPanel({ attemptId, position, hideOutcome, alreadyMarked, onMarked }: Props) {
  const [step, setStep] = useState<Step>("idle");
  const [password, setPassword] = useState("");
  const [expected, setExpected] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [reopened, setReopened] = useState(false);

  if (hideOutcome && alreadyMarked && !reopened) {
    return (
      <div className="alert alert-success stack-sm">
        <strong>✔ Actividad registrada</strong>
        <span className="small">Tu adulto ya la revisó. Verás el resultado al entregar la prueba.</span>
        <button type="button" className="btn btn-secondary btn-small" onClick={() => setReopened(true)}>Corregir la validación</button>
      </div>
    );
  }

  async function unlock(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const r = await api<{ expected: string }>(`/api/student/attempts/${attemptId}/adult`, "POST", { position, password });
    setBusy(false);
    if (!r.ok) return setError(r.data.error ?? "No se pudo validar la contraseña");
    setPassword("");
    setExpected(r.data.expected);
    setStep("verdict");
  }

  async function mark(verdict: number) {
    setBusy(true);
    setError("");
    const r = await api<Record<string, unknown>>(`/api/student/attempts/${attemptId}/activity`, "POST", { position, verdict });
    setBusy(false);
    if (!r.ok) {
      if (r.data.code === "adult_required") setStep("password");
      return setError((r.data.error as string) ?? "No se pudo guardar la validación");
    }
    setReopened(false);
    setStep("idle");
    onMarked(verdict, r.data);
  }

  return (
    <div className="card stack-sm" aria-label="Actividad de cuaderno">
      <p style={{ margin: 0 }}><strong>📓 Actividad de cuaderno</strong></p>

      {step === "idle" && (
        <>
          <p className="small muted" style={{ margin: 0 }}>Hazla en tu cuaderno. Cuando termines, pídele a tu adulto que la revise.</p>
          <button type="button" className="btn btn-block" onClick={() => setStep("password")}>Ya terminé: llamar al adulto</button>
        </>
      )}

      {step === "password" && (
        <form onSubmit={unlock} className="adult-box stack-sm">
          <p style={{ margin: 0 }}><strong>👩‍🏫 Para el adulto</strong></p>
          <p className="small" style={{ margin: 0 }}>Ingresa la contraseña de apoderado para ver la respuesta esperada y validar la actividad.</p>
          <label className="field">
            Contraseña del apoderado
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off" required />
          </label>
          {error && <p role="alert" className="alert alert-error" style={{ margin: 0 }}>{error}</p>}
          <button type="submit" className="btn btn-block" disabled={busy || !password}>{busy ? "Verificando…" : "Ver respuesta esperada"}</button>
          <button type="button" className="btn btn-secondary btn-block" onClick={() => { setStep("idle"); setError(""); setPassword(""); }}>Cancelar</button>
        </form>
      )}

      {step === "verdict" && (
        <div className="adult-box stack-sm">
          <p style={{ margin: 0 }}><strong>👩‍🏫 Para el adulto</strong></p>
          <p className="small" style={{ margin: 0 }}>Respuesta esperada:</p>
          <p className="hint-box" style={{ margin: 0 }}>{expected}</p>
          <p className="small" style={{ margin: 0 }}>¿Cómo la resolvió el alumno?</p>
          {error && <p role="alert" className="alert alert-error" style={{ margin: 0 }}>{error}</p>}
          <button type="button" className="btn btn-block" disabled={busy} onClick={() => mark(0)}>✔ Correcto</button>
          <button type="button" className="btn btn-secondary btn-block" disabled={busy} onClick={() => mark(1)}>🤝 Correcto con ayuda</button>
          <button type="button" className="btn btn-secondary btn-block" disabled={busy} onClick={() => mark(2)}>✖ Error</button>
          <p className="small muted" style={{ margin: 0 }}>«Error» cuenta como respuesta incorrecta. «Con ayuda» cuenta como correcta y queda registrada para el apoderado.</p>
          {hideOutcome && <p className="small muted" style={{ margin: 0 }}>El alumno verá el resultado al entregar la prueba.</p>}
        </div>
      )}
    </div>
  );
}
