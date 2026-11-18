"use client";

import { useEffect, useState } from "react";
import { safeVisual } from "@/lib/visual";

interface Question {
  type?: "choice" | "activity";
  question: string;
  options?: string[];
  correctIndex?: number;
  expected?: string;
  explanation: string;
  hint?: string;
  visual?: string;
}
interface Content {
  review: { title: string; summary: string; flashcards: { front: string; back: string; example?: string; visual?: string }[] }[];
  diagnostic: Question[];
  challenge: Question[];
}

function Questions({ items, showHint }: { items: Question[]; showHint?: boolean }) {
  return (
    <ol className="preview-list">
      {items.map((q, i) => (
        <li key={i} className="preview-q">
          <p style={{ fontWeight: 700 }}>{q.type === "activity" && "📓 Actividad de cuaderno · "}{q.question}</p>
          {safeVisual(q) && <p style={{ fontSize: "1.6rem", margin: "4px 0" }}>{safeVisual(q)}</p>}
          {q.type === "activity" ? (
            <p className="option-correct small">Respuesta esperada (la ve el adulto que valida): {q.expected}</p>
          ) : (
            <ul className="list-plain">
              {(q.options ?? []).map((o, j) => (
                <li key={j} className={j === q.correctIndex ? "option-correct" : undefined}>
                  {String.fromCharCode(65 + j)}) {o} {j === q.correctIndex && <span>✔ correcta</span>}
                </li>
              ))}
            </ul>
          )}
          {showHint && q.hint && <p className="small"><strong>Pista:</strong> {q.hint}</p>}
          <p className="small muted"><strong>Explicación:</strong> {q.explanation}</p>
        </li>
      ))}
    </ol>
  );
}

/** Vista previa de solo lectura del contenido generado, para que el apoderado revise la calidad. */
export function ContentPreview({ routeId, version }: { routeId: string; version: string }) {
  const [content, setContent] = useState<Content | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setError("");
    fetch(`/api/routes/${routeId}/content`)
      .then(async (r) => (r.ok ? setContent(await r.json()) : setError("No se pudo cargar el contenido")))
      .catch(() => setError("No se pudo cargar el contenido"));
  }, [routeId, version]);

  if (error) return <p className="alert alert-error">{error}</p>;
  if (!content) return <p className="muted">Cargando contenido…</p>;

  return (
    <section className="stack-sm" aria-label="Vista previa del contenido">
      <h2 style={{ marginBottom: 0 }}>Vista previa del contenido</h2>
      <p className="small muted" style={{ margin: 0 }}>
        Solo lectura, con las respuestas correctas marcadas. Cada intento del alumno usa preguntas distintas del banco. El alumno no ve esta pantalla.
      </p>

      <details className="card">
        <summary><strong>📚 Repaso</strong> ({content.review.length} {content.review.length === 1 ? "módulo" : "módulos"})</summary>
        {content.review.map((m, i) => (
          <div key={i} className="preview-q">
            <h3 style={{ marginTop: 0 }}>{m.title}</h3>
            <p>{m.summary}</p>
            <ul className="list-plain">
              {m.flashcards.map((f, j) => (
                <li key={j} className="small">
                  {f.visual && <span>{f.visual} </span>}<strong>{f.front}</strong> → {f.back}
                  {f.example && <span className="muted"> (Ej.: {f.example})</span>}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </details>

      <details className="card">
        <summary><strong>📝 Diagnóstico</strong> ({content.diagnostic.length} preguntas en el banco)</summary>
        <Questions items={content.diagnostic} showHint />
      </details>

      <details className="card">
        <summary><strong>🏁 Desafío</strong> ({content.challenge.length} preguntas en el banco)</summary>
        <Questions items={content.challenge} />
      </details>
    </section>
  );
}
