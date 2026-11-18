"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { api } from "@/lib/client/api";
import { ProgressBar } from "@/components/student/ProgressBar";

interface RouteItem {
  id: string;
  title: string;
  progressPercent: number;
  unlocked: string[];
  bestDiagnostic: number | null;
  challengeDone: boolean;
  needsRepeat: boolean;
}
interface SubjectItem {
  id: string;
  name: string;
  colorTag: string;
  routes: RouteItem[];
}

function stageChips(r: RouteItem) {
  const has = (s: string) => r.unlocked.includes(s);
  return [
    { label: "Repaso", icon: "📚", on: true },
    { label: "Diagnóstico", icon: has("diagnostic") ? "📝" : "🔒", on: has("diagnostic") },
    { label: "Desafío", icon: has("challenge") ? "🏁" : "🔒", on: has("challenge") },
  ];
}

export default function StudentHome() {
  const [name, setName] = useState("");
  const [subjects, setSubjects] = useState<SubjectItem[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ displayName: string; subjects: SubjectItem[] }>("/api/student/routes").then((r) => {
      if (r.ok) {
        setName(r.data.displayName);
        setSubjects(r.data.subjects);
      } else setError(r.data.error ?? "No se pudieron cargar tus rutas");
    });
  }, []);

  if (error) return <p role="alert" className="alert alert-error">{error}</p>;
  if (!subjects) return <p className="muted">Cargando…</p>;

  return (
    <>
      <h1>¡Hola{name ? `, ${name}` : ""}! 👋</h1>
      {subjects.length === 0 ? (
        <div className="card stack-sm">
          <p style={{ margin: 0 }}><strong>Todavía no tienes rutas de estudio.</strong></p>
          <p className="muted" style={{ margin: 0 }}>Pídele a tu apoderado que cree una con el temario de tu próxima prueba.</p>
        </div>
      ) : (
        <div className="stack">
          {subjects.map((s) => (
            <section key={s.id} className="stack-sm">
              <h2 style={{ margin: 0, borderLeft: `8px solid ${s.colorTag}`, paddingLeft: 10 }}>{s.name}</h2>
              {s.routes.map((r) => (
                <a key={r.id} href={`/student/routes/${r.id}`} className="card stack-sm" style={{ textDecoration: "none", color: "inherit", "--accent": s.colorTag } as CSSProperties}>
                  <strong style={{ fontSize: "1.1rem" }}>{r.title}</strong>
                  <ProgressBar value={r.progressPercent} label={`Avance de ${r.title}`} />
                  <span className="small muted">{r.progressPercent}% completado</span>
                  <span className="row">
                    {stageChips(r).map((c) => (
                      <span key={c.label} className={`badge ${c.on ? "badge-ready" : ""}`}>{c.icon} {c.label}</span>
                    ))}
                    {r.needsRepeat && <span className="badge badge-warn">🔁 Repasar de nuevo</span>}
                    {r.challengeDone && <span className="badge badge-ready">🏆 Aprobado</span>}
                  </span>
                </a>
              ))}
            </section>
          ))}
        </div>
      )}
    </>
  );
}
