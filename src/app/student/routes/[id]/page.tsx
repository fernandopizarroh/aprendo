"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client/api";
import { ProgressBar } from "@/components/student/ProgressBar";

interface Hub {
  id: string;
  title: string;
  subject: { name: string };
  threshold: number;
  challengeThreshold: number;
  needsRepeat: boolean;
  unlocked: string[];
  progressPercent: number;
  review: { viewed: number; total: number; completed: boolean };
  diagnostic: { questions: number; attempts: number; best: number | null; bestThisRound: number | null; passed: boolean };
  challenge: { questions: number; attempts: number; best: number | null; last: number | null; done: boolean; passedEver: boolean; extra: boolean; extraExhausted: boolean; attemptsLeft: number; maxAttempts: number; lockMessage: string | null };
}

export default function RouteHubPage({ params }: { params: { id: string } }) {
  const [hub, setHub] = useState<Hub | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Hub>(`/api/student/routes/${params.id}`).then((r) => (r.ok ? setHub(r.data) : setError(r.data.error ?? "Ruta no disponible")));
  }, [params.id]);

  if (error) return (<><p role="alert" className="alert alert-error">{error}</p><a href="/student">← Volver</a></>);
  if (!hub) return <p className="muted">Cargando…</p>;

  const has = (s: string) => hub.unlocked.includes(s);
  const reviewPct = hub.review.total ? (hub.review.viewed / hub.review.total) * 100 : 0;
  const c = hub.challenge;

  return (
    <>
      <p className="small muted" style={{ margin: 0 }}>{hub.subject.name}</p>
      <h1>{hub.title}</h1>
      <ProgressBar value={hub.progressPercent} label="Avance total" />
      <p className="small muted">{hub.progressPercent}% de la ruta completado</p>

      {hub.needsRepeat && (
        <p className="alert alert-info" role="status">
          🌱 No llegaste al {hub.challengeThreshold}% en tus 2 intentos del Desafío. Para abrir un Desafío nuevo: repasa otra vez y aprueba un Diagnóstico. ¡Tú puedes!
        </p>
      )}

      <div className="stack">
        <section className="card stage-card">
          <h2 className="stage-head">📚 1. Repaso {hub.review.completed && <span className="badge badge-ready">✔ Completo</span>}</h2>
          <p className="muted" style={{ margin: 0 }}>Aprende los conceptos con tarjetas. Debes ver todas para abrir el Diagnóstico.</p>
          <ProgressBar value={reviewPct} label="Tarjetas vistas" />
          <p className="small" style={{ margin: 0 }}>{hub.review.viewed} de {hub.review.total} tarjetas vistas</p>
          <a className="btn btn-block" href={`/student/routes/${hub.id}/review`}>
            {hub.review.completed ? "Repasar de nuevo" : hub.review.viewed > 0 ? "Continuar" : "Empezar"}
          </a>
        </section>

        <section className="card stage-card" data-locked={!has("diagnostic")}>
          <h2 className="stage-head">
            {has("diagnostic") ? "📝" : "🔒"} 2. Diagnóstico {hub.diagnostic.passed && <span className="badge badge-ready">✔ Aprobado</span>}
          </h2>
          <p className="muted" style={{ margin: 0 }}>
            {hub.diagnostic.questions} preguntas de práctica con pistas y respuesta al instante. Necesitas {hub.threshold}% para abrir el Desafío. Cada práctica trae preguntas nuevas.
          </p>
          {has("diagnostic") ? (
            <>
              <p className="small" style={{ margin: 0 }}>
                {hub.diagnostic.attempts === 0 ? "Aún no lo has intentado." : `Intentos: ${hub.diagnostic.attempts} · Mejor puntaje: ${hub.diagnostic.best}%`}
                {hub.needsRepeat && hub.diagnostic.bestThisRound !== null && ` · En esta vuelta: ${hub.diagnostic.bestThisRound}%`}
              </p>
              <a className="btn btn-block" href={`/student/routes/${hub.id}/diagnostic`}>
                {hub.diagnostic.attempts === 0 ? "Empezar" : "Practicar de nuevo"}
              </a>
            </>
          ) : (
            <p className="small" style={{ margin: 0 }}>🔒 {hub.needsRepeat ? "Repasa de nuevo para volver a practicar." : "Termina el Repaso para abrirlo."}</p>
          )}
        </section>

        <section className="card stage-card" data-locked={!has("challenge") && !c.passedEver}>
          <h2 className="stage-head">
            {c.done || (c.passedEver && !has("challenge")) ? "🏆" : has("challenge") ? "🏁" : "🔒"} 3. Desafío {c.passedEver && <span className="badge badge-ready">✔ Aprobado{c.done ? "" : " antes"}</span>}
          </h2>
          <p className="muted" style={{ margin: 0 }}>
            {c.questions} preguntas como en la prueba real: sin pistas ni ayuda. Verás tu resultado al entregar. Tienes {c.maxAttempts} intentos para aprobar con {hub.challengeThreshold}%.
          </p>
          {c.done ? (
            <p className="small" style={{ margin: 0 }}>¡Aprobado con {c.best}%! Estás listo para tu prueba. Si quieres rendir otro Desafío, pídele a tu apoderado que lo habilite.</p>
          ) : c.extraExhausted ? (
            <p className="small" style={{ margin: 0 }}>Ya usaste los intentos del Desafío adicional. ¡Tu aprobación anterior sigue vigente! Si quieres otro, pídele a tu apoderado que lo habilite.</p>
          ) : has("challenge") ? (
            <>
              {c.extra && <p className="alert alert-info small" style={{ margin: 0 }}>🔓 Tu apoderado habilitó otro Desafío. Si no lo apruebas, tu aprobación anterior sigue vigente.</p>}
              <p className="small" style={{ margin: 0 }}>
                {c.attempts === 0 ? "Aún no lo has rendido." : `Último: ${c.last}% · Mejor: ${c.best}%`} · Intentos disponibles: {c.attemptsLeft} de {c.maxAttempts}
              </p>
              <a className="btn btn-block" href={`/student/routes/${hub.id}/challenge`}>
                {c.attemptsLeft < c.maxAttempts ? "Intentar de nuevo" : "Empezar"}
              </a>
            </>
          ) : (
            <p className="small" style={{ margin: 0 }}>🔒 {c.lockMessage}</p>
          )}
        </section>
      </div>
      <p style={{ marginTop: 24 }}><a href="/student">← Mis asignaturas</a></p>
    </>
  );
}
