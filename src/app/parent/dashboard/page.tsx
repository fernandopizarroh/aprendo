"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { api } from "@/lib/client/api";
import { ProgressBar } from "@/components/student/ProgressBar";

type StatusLabel = "En Repaso" | "En Diagnóstico" | "En Desafío" | "Completado";

interface Progress {
  status: StatusLabel;
  round: number;
  needsRepeat: boolean;
  diagnosticAttempts: number;
  bestDiagnostic: number | null;
  challengeAttempts: number;
  challengeAttemptsLeft: number;
  challengeScore: number | null;
  bestChallenge: number | null;
  ready: boolean;
  progressPercent: number;
  lastActivity: string | null;
  activities: { ok: number; help: number; error: number };
  helped: { question: string; at: string }[];
}
interface RouteRow {
  id: string;
  title: string;
  subject: { name: string; colorTag: string };
  generation: "generating" | "ready" | "error";
  errorMessage: string | null;
  threshold: number;
  challengeThreshold: number;
  progress: Progress | null;
}
interface StudentRow {
  id: string;
  displayName: string;
  gradeLevel: string;
  routes: RouteRow[];
}

const BADGE: Record<StatusLabel, string> = {
  "En Repaso": "badge-info",
  "En Diagnóstico": "badge-info",
  "En Desafío": "badge-warn",
  Completado: "badge-ready",
};

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("es-CL", { dateStyle: "medium", timeStyle: "short" }) : "Sin actividad";
const pct = (n: number | null) => (n === null ? "—" : `${n}%`);

function RouteCard({ r }: { r: RouteRow }) {
  const p = r.progress;
  return (
    <article className="card stack-sm subject-card" style={{ "--accent": r.subject.colorTag } as CSSProperties}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <strong style={{ fontSize: "1.05rem" }}>{r.title}</strong>
          <div className="small muted">{r.subject.name}</div>
        </div>
        {p && <span className={`badge ${BADGE[p.status]}`}>{p.status}</span>}
        {r.generation === "generating" && <span className="badge badge-generating">Generando…</span>}
        {r.generation === "error" && <span className="badge badge-error">Con error</span>}
      </div>

      {r.generation !== "ready" && (
        <p className="small" style={{ margin: 0 }}>
          {r.generation === "generating" ? "La ruta se está preparando." : r.errorMessage}{" "}
          <a href={`/parent/routes/${r.id}`}>Ver ruta</a>
        </p>
      )}

      {p && (
        <>
          <ProgressBar value={p.progressPercent} label={`Avance de ${r.title}`} />
          {p.ready && <p className="alert alert-success small" style={{ margin: 0 }}>🏆 Aprobó el Desafío: listo para su prueba.</p>}
          {p.needsRepeat && (
            <p className="alert alert-warning small" style={{ margin: 0 }}>
              🔁 No alcanzó el {r.challengeThreshold}% en sus 2 intentos del Desafío. Debe repasar y aprobar un Diagnóstico para abrir uno nuevo.
            </p>
          )}
          <dl className="detail-list">
            <div><dt>Intentos de Diagnóstico</dt><dd>{p.diagnosticAttempts}</dd></div>
            <div><dt>Mejor Diagnóstico</dt><dd>{pct(p.bestDiagnostic)}</dd></div>
            <div><dt>Desafío (último · mejor)</dt><dd>{p.challengeAttempts === 0 ? "Sin rendir" : `${pct(p.challengeScore)} · ${pct(p.bestChallenge)}`}</dd></div>
            {!p.ready && <div><dt>Intentos de Desafío disponibles</dt><dd>{p.challengeAttemptsLeft} de 2</dd></div>}
            {p.round > 1 && <div><dt>Veces que repasó de nuevo</dt><dd>{p.round - 1}</dd></div>}
            {p.activities.ok + p.activities.help + p.activities.error > 0 && (
              <div><dt>Actividades de cuaderno</dt><dd>✔ {p.activities.ok} · <span className="help-text">🤝 {p.activities.help}</span> · ✖ {p.activities.error}</dd></div>
            )}
            <div><dt>Última actividad</dt><dd>{fmtDate(p.lastActivity)}</dd></div>
          </dl>
          {p.helped.length > 0 && (
            <div className="alert alert-warning small stack-sm" style={{ margin: 0 }}>
              <strong>🤝 Resolvió con ayuda: conviene reforzar</strong>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {p.helped.map((h) => (
                  <li key={h.question}>{h.question} <span className="muted">({new Date(h.at).toLocaleDateString("es-CL", { dateStyle: "medium" })})</span></li>
                ))}
              </ul>
              <span>Cuentan como correctas, pero practícalas otra vez con el alumno.</span>
            </div>
          )}
        </>
      )}
    </article>
  );
}

export default function DashboardPage() {
  const [students, setStudents] = useState<StudentRow[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ students: StudentRow[] }>("/api/dashboard").then((r) => (r.ok ? setStudents(r.data.students) : setError(r.data.error ?? "No se pudo cargar el panel")));
  }, []);

  if (error) return <p role="alert" className="alert alert-error">{error}</p>;
  if (!students) return <p className="muted">Cargando…</p>;

  if (students.length === 0) {
    return (
      <>
        <h1>Panel de seguimiento</h1>
        <p className="alert alert-info">Aún no tienes alumnos. Crea el primero para ver su avance.</p>
        <a className="btn btn-block" href="/parent/students">Crear alumno</a>
      </>
    );
  }

  return (
    <>
      <h1>Panel de seguimiento</h1>
      <p className="muted">Avance de cada ruta: ¿está listo para su prueba?</p>
      <div className="stack">
        {students.map((s) => {
          const done = s.routes.filter((r) => r.progress?.ready).length;
          return (
            <section key={s.id} className="stack-sm">
              <h2 style={{ marginBottom: 0 }}>{s.displayName} <span className="muted small" style={{ fontWeight: 400 }}>· {s.gradeLevel}</span></h2>
              {s.routes.length > 0 && <p className="small muted" style={{ margin: 0 }}>{s.routes.length} ruta(s) · {done} completada(s)</p>}
              {s.routes.length === 0 ? (
                <div className="card stack-sm">
                  <p className="muted" style={{ margin: 0 }}>Todavía no tiene rutas de estudio.</p>
                  <a className="btn btn-secondary btn-block" href="/parent/subjects">Crear una ruta</a>
                </div>
              ) : (
                s.routes.map((r) => <RouteCard key={r.id} r={r} />)
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}
