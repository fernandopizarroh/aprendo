"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/client/api";
import { ProgressBar } from "@/components/student/ProgressBar";
import { Visual } from "@/components/student/Visual";

interface Module {
  title: string;
  summary: string;
  flashcards: { front: string; back: string; example?: string; visual?: string }[];
}
interface Card {
  key: string;
  front: string;
  back: string;
  example?: string;
  visual?: string;
  moduleIndex: number;
  moduleTitle: string;
  moduleSummary: string;
  first: boolean;
}

export default function ReviewPage({ params }: { params: { id: string } }) {
  const [modules, setModules] = useState<Module[] | null>(null);
  const [viewed, setViewed] = useState<Set<string>>(new Set());
  const [completed, setCompleted] = useState(false);
  const [repeating, setRepeating] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ modules: Module[]; viewed: string[]; completed: boolean; repeating: boolean }>(`/api/student/routes/${params.id}/review`).then((r) => {
      if (!r.ok) return setError(r.data.error ?? "No se pudo cargar el repaso");
      setModules(r.data.modules);
      setViewed(new Set(r.data.viewed));
      setCompleted(r.data.completed);
      setRepeating(r.data.repeating);
    });
  }, [params.id]);

  const cards: Card[] = useMemo(
    () =>
      (modules ?? []).flatMap((m, mi) =>
        m.flashcards.map((f, ci) => ({ ...f, key: `${mi}:${ci}`, moduleIndex: mi, moduleTitle: m.title, moduleSummary: m.summary, first: ci === 0 })),
      ),
    [modules],
  );

  // Retoma en la primera tarjeta no vista
  useEffect(() => {
    if (!modules) return;
    const firstPending = cards.findIndex((c) => !viewed.has(c.key));
    setIndex(firstPending === -1 ? 0 : firstPending);
    // solo al cargar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modules]);

  if (error) return (<><p role="alert" className="alert alert-error">{error}</p><a href={`/student/routes/${params.id}`}>← Volver</a></>);
  if (!modules) return <p className="muted">Cargando…</p>;
  if (cards.length === 0) return <p className="alert alert-info">Este repaso no tiene tarjetas.</p>;

  const card = cards[index];
  const last = index === cards.length - 1;

  async function flip() {
    const showingBack = !flipped;
    setFlipped(showingBack);
    if (showingBack && !viewed.has(card.key)) {
      setViewed((v) => new Set(v).add(card.key)); // optimista
      const r = await api<{ completed: boolean; justCompleted: boolean }>(`/api/student/routes/${params.id}/review`, "POST", { card: card.key });
      if (r.ok) {
        setCompleted(r.data.completed);
        if (r.data.justCompleted) setCelebrate(true);
      }
    }
  }

  function go(delta: number) {
    setIndex((i) => Math.max(0, Math.min(cards.length - 1, i + delta)));
    setFlipped(false);
  }

  return (
    <>
      <p className="small muted" style={{ margin: 0 }}>📚 Repaso</p>
      <h1 style={{ fontSize: "1.3rem" }}>{card.moduleTitle}</h1>
      {repeating && !completed && (
        <p className="alert alert-info small" role="status">🔁 Vamos a repasar otra vez para abrir un Desafío nuevo. ¡Ahora lo vas a dominar!</p>
      )}
      <ProgressBar value={(viewed.size / cards.length) * 100} label="Tarjetas vistas" />
      <p className="small muted">Tarjeta {index + 1} de {cards.length} · {viewed.size} {viewed.size === 1 ? "vista" : "vistas"}</p>

      {celebrate && (
        <div role="status" className="alert alert-success stack-sm">
          <strong>🎉 ¡Repaso completo!</strong>
          <span>Desbloqueaste el Diagnóstico. Puedes seguir repasando o pasar a practicar.</span>
          <a className="btn" href={`/student/routes/${params.id}/diagnostic`}>Ir al Diagnóstico</a>
        </div>
      )}

      <div className="stack">
        <details key={card.moduleIndex} open={card.first} className="card">
          <summary><strong>📖 Resumen del tema</strong></summary>
          <p style={{ marginTop: 8 }}>{card.moduleSummary}</p>
        </details>

        <button type="button" className="flashcard" data-side={flipped ? "back" : "front"} onClick={flip} aria-label={flipped ? "Ver el frente de la tarjeta" : "Dar vuelta la tarjeta"}>
          <span>
            <span className="flashcard-label">{flipped ? "Respuesta" : "Pregunta"}</span>
            {!flipped && card.visual?.trim() && <span style={{ display: "block", fontSize: "2.2rem", margin: "4px 0 8px" }}>{card.visual}</span>}
            {flipped ? card.back : card.front}
            {flipped && card.example && <span className="small muted" style={{ display: "block", marginTop: 12 }}>Ejemplo: {card.example}</span>}
          </span>
        </button>
        {!flipped && <p className="small muted center" style={{ margin: 0 }}>Toca la tarjeta para ver la respuesta</p>}

        <div className="row" style={{ justifyContent: "space-between" }}>
          <button type="button" className="btn btn-secondary" onClick={() => go(-1)} disabled={index === 0}>← Anterior</button>
          {last ? (
            <a className="btn" href={`/student/routes/${params.id}`}>{completed ? "Terminar ✔" : "Volver a la ruta"}</a>
          ) : (
            <button type="button" className="btn" onClick={() => go(1)}>Siguiente →</button>
          )}
        </div>
        {last && !completed && <p className="small muted center">Da vuelta todas las tarjetas para completar el repaso.</p>}
      </div>
    </>
  );
}
