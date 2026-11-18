"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client/api";
import { ProgressBar } from "@/components/student/ProgressBar";
import { QuestionOptions } from "@/components/student/QuestionOptions";
import { ResultView, type QuizResult } from "@/components/student/ResultView";
import { ActivityPanel } from "@/components/student/ActivityPanel";
import { Visual } from "@/components/student/Visual";
import { WaitingCard } from "@/components/student/WaitingCard";

interface Question {
  position: number;
  type: "choice" | "activity";
  question: string;
  visual?: string;
  options?: { key: number; text: string }[];
  hint?: string;
}
type Feedback =
  | { kind: "choice"; key: number; correct: boolean; correctKey: number; explanation: string }
  | { kind: "activity"; verdict: number; correct: boolean; helped: boolean; explanation: string; expected?: string };

interface Start {
  attemptId: string;
  total: number;
  questions: Question[];
  answered: Record<string, Record<string, unknown>>;
}

const toFeedback = (v: Record<string, unknown>): Feedback =>
  "verdict" in v
    ? { kind: "activity", verdict: v.verdict as number, correct: v.correct as boolean, helped: v.helped as boolean, explanation: v.explanation as string, expected: v.expected as string | undefined }
    : { kind: "choice", key: v.key as number, correct: v.correct as boolean, correctKey: v.correctKey as number, explanation: v.explanation as string };

export default function DiagnosticPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<Start | null>(null);
  const [feedback, setFeedback] = useState<Record<number, Feedback>>({});
  const [index, setIndex] = useState(0);
  const [hints, setHints] = useState<Set<number>>(new Set());
  const [pending, setPending] = useState<QuizResult | null>(null);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [waiting, setWaiting] = useState(false);
  const [tick, setTick] = useState(0);

  const start = useCallback(async () => {
    setError("");
    setData(null);
    setResult(null);
    setPending(null);
    setHints(new Set());
    const r = await api<Start & { code?: string }>(`/api/student/routes/${params.id}/diagnostic`, "POST");
    if (r.status === 409 && r.data.code === "preparing") {
      setWaiting(true); // se están creando preguntas nuevas: se vuelve a intentar solo
      return setTick((t) => t + 1);
    }
    setWaiting(false);
    if (!r.ok) return setError(r.data.error ?? "No se pudo iniciar el Diagnóstico");
    const fb: Record<number, Feedback> = {};
    for (const [pos, f] of Object.entries(r.data.answered)) fb[Number(pos)] = toFeedback(f);
    setFeedback(fb);
    setData(r.data);
    const firstPending = r.data.questions.findIndex((q) => !fb[q.position]);
    setIndex(firstPending === -1 ? 0 : firstPending);
  }, [params.id]);

  useEffect(() => {
    start();
  }, [start]);

  useEffect(() => {
    if (tick === 0) return;
    const id = setTimeout(start, 6000);
    return () => clearTimeout(id);
  }, [tick, start]);

  if (error) {
    return (
      <>
        <p role="alert" className="alert alert-warning">🔒 {error}</p>
        <a className="btn btn-block" href={`/student/routes/${params.id}`}>Volver a la ruta</a>
      </>
    );
  }
  if (waiting) return <WaitingCard title="Estamos preparando preguntas nuevas para ti" backHref={`/student/routes/${params.id}`} />;
  if (!data) return <p className="muted">Preparando tu práctica…</p>;

  if (result) {
    return (
      <ResultView
        result={result}
        actions={
          <>
            {result.challengeUnlocked && <a className="btn btn-block" href={`/student/routes/${params.id}/challenge`}>Ir al Desafío 🏁</a>}
            <button type="button" className={`btn btn-block ${result.challengeUnlocked ? "btn-secondary" : ""}`} onClick={start}>Practicar de nuevo</button>
            <a className="btn btn-secondary btn-block" href={`/student/routes/${params.id}`}>Volver a la ruta</a>
          </>
        }
      />
    );
  }

  const q = data.questions[index];
  const fb = feedback[q.position];
  const answeredCount = Object.keys(feedback).length;
  const isLast = answeredCount === data.total; // ya respondió todas

  async function choose(key: number) {
    if (fb || saving) return;
    setSaving(true);
    const r = await api<{ correct: boolean; correctKey: number; explanation: string; finished: boolean; result?: QuizResult }>(
      `/api/student/attempts/${data!.attemptId}/answer`, "POST", { position: q.position, key },
    );
    setSaving(false);
    if (!r.ok) return setError(r.data.error ?? "No se pudo guardar tu respuesta");
    setFeedback((f) => ({ ...f, [q.position]: { kind: "choice", key, correct: r.data.correct, correctKey: r.data.correctKey, explanation: r.data.explanation } }));
    if (r.data.finished && r.data.result) setPending(r.data.result);
  }

  function activityMarked(_verdict: number, d: Record<string, unknown>) {
    setFeedback((f) => ({ ...f, [q.position]: toFeedback(d) }));
    if (d.finished && d.result) setPending(d.result as QuizResult);
  }

  function next() {
    if (pending && answeredCount === data!.total) return setResult(pending);
    const nextPending = data!.questions.findIndex((x, i) => i > index && !feedback[x.position]);
    setIndex(nextPending === -1 ? Math.min(index + 1, data!.questions.length - 1) : nextPending);
  }

  return (
    <>
      <p className="small muted" style={{ margin: 0 }}>📝 Diagnóstico · práctica con pistas</p>
      <ProgressBar value={(answeredCount / data.total) * 100} label="Preguntas respondidas" />
      <p className="small muted">Pregunta {index + 1} de {data.total}</p>

      <div className="stack">
        <h1 style={{ fontSize: "1.3rem", margin: 0 }}>{q.question}</h1>
        <Visual text={q.visual} />

        {!fb && q.hint && (
          hints.has(q.position) ? (
            <p className="hint-box" role="note"><strong>💡 Pista:</strong> {q.hint}</p>
          ) : (
            <button type="button" className="btn btn-secondary" onClick={() => setHints((h) => new Set(h).add(q.position))}>💡 Ver Pista</button>
          )
        )}

        {q.type === "choice" && q.options && (
          <QuestionOptions
            options={q.options}
            selectedKey={fb?.kind === "choice" ? fb.key : undefined}
            correctKey={fb?.kind === "choice" ? fb.correctKey : null}
            disabled={Boolean(fb) || saving}
            onSelect={choose}
          />
        )}
        {q.type === "activity" && !fb && <ActivityPanel key={q.position} attemptId={data.attemptId} position={q.position} onMarked={activityMarked} />}

        {fb && (
          <div role="status" className={`alert ${fb.correct ? "alert-success" : "alert-error"} stack-sm`}>
            <strong>
              {fb.kind === "activity"
                ? fb.helped ? "🤝 ¡Bien! Lo lograste con ayuda." : fb.correct ? "✔ ¡Excelente! Actividad lograda 🎉" : "✖ Esta vez no salió. Mira la explicación y vuelve a intentarlo."
                : fb.correct ? "✔ ¡Correcto! Sigue así 🎉" : "✖ Casi. Mira la explicación y aprende de esta."}
            </strong>
            {fb.kind === "activity" && fb.expected && <span className="small">Respuesta esperada: {fb.expected}</span>}
            <span>{fb.explanation}</span>
          </div>
        )}

        {fb && (
          <button type="button" className="btn btn-block" onClick={next}>
            {isLast ? "Ver mi resultado" : "Siguiente pregunta →"}
          </button>
        )}
      </div>
    </>
  );
}
