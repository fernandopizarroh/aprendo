"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api } from "@/lib/client/api";
import { ContentPreview } from "@/components/ContentPreview";
import { ContextCard } from "@/components/ContextCard";
import { ExtraChallengeButton } from "@/components/ExtraChallengeButton";

interface RouteState {
  id: string;
  title: string;
  syllabusText: string;
  photoPaths: string[];
  status: "generating" | "ready" | "error";
  errorMessage: string | null;
  step: "review" | "diagnostic" | "challenge" | null;
  updatedAt: string;
  photos: number;
  diagQuestions: number;
  challengeQuestions: number;
  unlockThreshold: number;
  challengeThreshold: number;
  refill: Partial<Record<"diagnostic" | "challenge", { running: boolean; error?: string }>>;
  challenge: null | {
    studentName: string;
    approved: boolean;
    passedEver: boolean;
    passes: number;
    extraPending: boolean;
    extraExhausted: boolean;
    canGrantExtra: boolean;
    attemptsLeft: number;
  };
}

/** Porcentajes de aprobación de la ruta. Se pueden cambiar cuando el apoderado quiera. */
function SettingsCard({ routeId, unlock, challenge, onSaved }: { routeId: string; unlock: number; challenge: number; onSaved: () => void }) {
  const [u, setU] = useState(String(unlock));
  const [c, setC] = useState(String(challenge));
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    setErr("");
    const r = await api(`/api/routes/${routeId}`, "PATCH", { unlockThreshold: Number(u), challengeThreshold: Number(c) });
    setBusy(false);
    if (!r.ok) return setErr(r.data.error ?? "No se pudo guardar");
    setMsg("Guardado. El avance de los alumnos se recalculó con estas reglas.");
    onSaved();
  }

  return (
    <form onSubmit={save} className="card stack-sm">
      <h2 style={{ margin: 0 }}>Reglas de aprobación</h2>
      <p className="small muted" style={{ margin: 0 }}>Puedes cambiarlas cuando quieras. El avance de los alumnos se recalcula con las reglas nuevas.</p>
      <label className="field">
        % mínimo en el Diagnóstico para abrir el Desafío
        <input type="number" inputMode="numeric" min={1} max={100} value={u} onChange={(e) => setU(e.target.value)} required />
      </label>
      <label className="field">
        % mínimo para aprobar el Desafío
        <input type="number" inputMode="numeric" min={1} max={100} value={c} onChange={(e) => setC(e.target.value)} required />
      </label>
      {err && <p role="alert" className="alert alert-error" style={{ margin: 0 }}>{err}</p>}
      {msg && <p role="status" className="alert alert-success" style={{ margin: 0 }}>{msg}</p>}
      <button type="submit" className="btn btn-secondary btn-block" disabled={busy}>{busy ? "Guardando…" : "Guardar reglas"}</button>
    </form>
  );
}

// Cada etapa se genera en una llamada propia: el paso activo es real y viene del servidor.
const STEPS: { key: "review" | "diagnostic" | "challenge"; label: string }[] = [
  { key: "review", label: "Leyendo apuntes y creando tarjetas de repaso..." },
  { key: "diagnostic", label: "Diseñando el Diagnóstico..." },
  { key: "challenge", label: "Diseñando el Desafío..." },
];

export default function RouteDetailPage({ params }: { params: { id: string } }) {
  const [route, setRoute] = useState<RouteState | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/routes/${params.id}`);
    if (res.status === 404) return setNotFound(true);
    if (res.ok) setRoute(await res.json());
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  const generating = route?.status === "generating";

  useEffect(() => {
    if (!generating) return;
    const poll = setInterval(load, 2000);
    return () => clearInterval(poll);
  }, [generating, load]);

  async function regenerate(stage?: string) {
    setBusy(true);
    setActionError("");
    const res = await fetch(`/api/routes/${params.id}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(stage ? { stage } : {}),
    });
    if (!res.ok) setActionError((await res.json().catch(() => ({}))).error ?? "No se pudo iniciar");
    await load();
    setBusy(false);
  }

  if (notFound) return <p className="alert alert-error">Ruta no encontrada.</p>;
  if (!route) return <p className="muted">Cargando…</p>;

  const step = Math.max(0, STEPS.findIndex((s) => s.key === route.step));

  return (
    <>
      <h1>{route.title}</h1>

      {route.status === "generating" && (
        <section className="card stack" aria-live="polite">
          <h2 style={{ margin: 0 }}>Preparando tu ruta</h2>
          <ol className="steps">
            {STEPS.map((s, i) => (
              <li key={s.key} className={`step ${i < step ? "step-done" : i === step ? "step-active" : ""}`}>
                <span className="step-icon">{i < step ? "✔" : i === step ? <span className="spinner" aria-hidden /> : i + 1}</span>
                {s.label}
              </li>
            ))}
          </ol>
          <p className="small muted" style={{ margin: 0 }}>Esto puede tardar un minuto. Puedes dejar esta página abierta.</p>
        </section>
      )}

      {route.status === "error" && (
        <section className="stack" role="alert">
          <div className="alert alert-error">
            <h2 style={{ margin: "0 0 6px" }}>No se pudo generar la ruta</h2>
            <p style={{ margin: 0 }}>{route.errorMessage}</p>
          </div>
          <p className="small muted" style={{ margin: 0 }}>
            Tus {route.photos} foto(s) y el temario siguen guardados. No necesitas subirlos otra vez.
          </p>
          <button type="button" className="btn btn-block" onClick={() => regenerate()} disabled={busy}>Reintentar</button>
          <ContextCard routeId={route.id} title={route.title} syllabusText={route.syllabusText} photoPaths={route.photoPaths} onSaved={load} />
          {route.errorMessage?.includes("conectar la inteligencia") && (
            <a className="btn btn-secondary btn-block" href="/parent/ai-setup">Conectar IA</a>
          )}
        </section>
      )}

      {route.status === "ready" && (
        <section className="stack">
          <p className="alert alert-success" style={{ margin: 0 }}>✔ Ruta lista para el alumno.</p>
          <div className="card">
            <ul className="list-plain">
              <li>📚 Repaso con tarjetas</li>
              <li>📝 Diagnóstico: {route.diagQuestions} preguntas con pistas (abre el Desafío con {route.unlockThreshold}%)</li>
              <li>🏁 Desafío: {route.challengeQuestions} preguntas (se aprueba con {route.challengeThreshold}%)</li>
            </ul>
          </div>
          {route.errorMessage && (
            <p role="alert" className="alert alert-warning" style={{ margin: 0 }}>
              La última regeneración falló y se conservó el contenido anterior. {route.errorMessage}
            </p>
          )}
          {(["diagnostic", "challenge"] as const).map((stage) => {
            const st = route.refill?.[stage];
            if (!st) return null;
            const label = stage === "diagnostic" ? "Diagnóstico" : "Desafío";
            return st.running ? (
              <p key={stage} role="status" className="alert alert-info" style={{ margin: 0 }}>⏳ Preparando preguntas nuevas de {label} para el alumno…</p>
            ) : (
              <p key={stage} role="alert" className="alert alert-warning" style={{ margin: 0 }}>
                <strong>No se pudieron preparar preguntas nuevas de {label}.</strong> {st.error} El alumno puede reintentar en un minuto. Si persiste, usa «Solo {label}» más abajo para regenerar.
              </p>
            );
          })}
          {route.challenge && (
            <section className="card stack-sm">
              <h2 style={{ margin: 0 }}>Desafío del alumno</h2>
              <p style={{ margin: 0 }}>
                {route.challenge.approved && <>🏆 {route.challenge.studentName} aprobó el Desafío ({route.challenge.passes} {route.challenge.passes === 1 ? "vez" : "veces"}). Por ahora no puede rendirlo de nuevo.</>}
                {route.challenge.extraPending && <>🔓 Hay un Desafío adicional habilitado para {route.challenge.studentName}: le quedan {route.challenge.attemptsLeft} intento(s). Si no lo aprueba, su aprobación anterior sigue vigente.</>}
                {route.challenge.extraExhausted && <>{route.challenge.studentName} usó los intentos del Desafío adicional. Su aprobación anterior sigue vigente.</>}
                {!route.challenge.approved && !route.challenge.extraPending && !route.challenge.extraExhausted && <>{route.challenge.studentName} todavía no aprueba el Desafío: lo puede rendir cuando termine el Repaso y apruebe el Diagnóstico.</>}
              </p>
              {route.challenge.canGrantExtra && <ExtraChallengeButton routeId={route.id} studentName={route.challenge.studentName} onDone={load} />}
              <p className="small muted" style={{ margin: 0 }}>«Solo Desafío» (más abajo) cambia las preguntas, pero no vuelve a abrir el Desafío; para eso usa «Habilitar otro Desafío».</p>
            </section>
          )}
          <ContextCard routeId={route.id} title={route.title} syllabusText={route.syllabusText} photoPaths={route.photoPaths} onSaved={load} />
          <SettingsCard routeId={route.id} unlock={route.unlockThreshold} challenge={route.challengeThreshold} onSaved={load} />
          <ContentPreview routeId={route.id} version={route.updatedAt} />
          <h2 style={{ margin: "8px 0 0" }}>¿Algo salió mal?</h2>
          <p className="small muted" style={{ margin: 0 }}>Regenerar reemplaza el contenido de la etapa elegida. Si regeneras el Repaso, el alumno deberá repasar otra vez. Para regenerar con temario o fotos nuevos usa «Contexto de la ruta», arriba.</p>
          <div className="stack-sm">
            <button type="button" className="btn btn-secondary btn-block" disabled={busy} onClick={() => regenerate("all")}>Toda la ruta</button>
            <button type="button" className="btn btn-secondary btn-block" disabled={busy} onClick={() => regenerate("review")}>Solo Repaso</button>
            <button type="button" className="btn btn-secondary btn-block" disabled={busy} onClick={() => regenerate("diagnostic")}>Solo Diagnóstico</button>
            <button type="button" className="btn btn-secondary btn-block" disabled={busy} onClick={() => regenerate("challenge")}>Solo Desafío</button>
          </div>
        </section>
      )}
      {actionError && <p role="alert" className="alert alert-error">{actionError}</p>}
      <p style={{ marginTop: 24 }}><a href="/parent/subjects">← Volver a asignaturas</a></p>
    </>
  );
}
