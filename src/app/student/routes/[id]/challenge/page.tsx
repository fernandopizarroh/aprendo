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
}
interface Start {
  attemptId: string;
  total: number;
  attemptsLeft: number;
  questions: Question[];
  marked: number[];
}
interface Info {
  threshold: number;
  challengeThreshold: number;
  challenge: { done: boolean; attemptsLeft: number; maxAttempts: number; lockMessage: string | null };
}

export default function ChallengePage({ params }: { params: { id: string } }) {
  const [info, setInfo] = useState<Info | null>(null);
  const [phase, setPhase] = useState<"intro" | "quiz" | "result">("intro");
  const [data, setData] = useState<Start | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [marked, setMarked] = useState<Set<number>>(new Set());
  const [index, setIndex] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [error, setError] = useState("");
  const [waiting, setWaiting] = useState(false);
  const [tick, setTick] = useState(0);

  const loadInfo = useCallback(async () => {
    const r = await api<Info>(`/api/student/routes/${params.id}`);
    if (r.ok) setInfo(r.data);
    else setError(r.data.error ?? "Ruta no disponible");
  }, [params.id]);

  useEffect(() => {
    loadInfo();
  }, [loadInfo]);

  const start = useCallback(async () => {
    setBusy(true);
    setError("");
    const r = await api<Start & { code?: string }>(`/api/student/routes/${params.id}/challenge`, "POST");
    setBusy(false);
    if (r.status === 409 && r.data.code === "preparing") {
      setWaiting(true); // se están creando preguntas nuevas: se vuelve a intentar solo
      return setTick((t) => t + 1);
    }
    setWaiting(false);
    if (!r.ok) return setError(r.data.error ?? "No se pudo iniciar el Desafío");
    setData(r.data);
    setAnswers({});
    setMarked(new Set(r.data.marked));
    setIndex(0);
    setConfirming(false);
    setPhase("quiz");
  }, [params.id]);

  useEffect(() => {
    if (tick === 0) return;
    const id = setTimeout(start, 6000);
    return () => clearTimeout(id);
  }, [tick, start]);

  async function submit() {
    if (!data) return;
    setBusy(true);
    setError("");
    const r = await api<{ result: QuizResult }>(`/api/student/attempts/${data.attemptId}/submit`, "POST", { answers });
    setBusy(false);
    if (!r.ok) return setError(r.data.error ?? "No se pudo entregar. Intenta de nuevo: tus respuestas siguen aquí.");
    setResult(r.data.result);
    setPhase("result");
    loadInfo();
  }

  if (phase === "result" && result) {
    const o = result.outcome;
    return (
      <ResultView
        result={result}
        actions={
          <>
            {o && !o.passed && !o.roundReset && o.attemptsLeft > 0 && (
              <button type="button" className="btn btn-block" onClick={() => { setResult(null); setPhase("intro"); }}>
                Intentar de nuevo (te queda {o.attemptsLeft} intento)
              </button>
            )}
            {o?.roundReset && <a className="btn btn-block" href={`/student/routes/${params.id}/review`}>Ir al Repaso 📚</a>}
            <a className={`btn btn-block ${o?.passed ? "" : "btn-secondary"}`} href={`/student/routes/${params.id}`}>Volver a la ruta</a>
          </>
        }
      />
    );
  }

  if (waiting) return <WaitingCard title="Estamos preparando un Desafío nuevo para ti" backHref={`/student/routes/${params.id}`} />;

  if (phase === "intro" || !data) {
    const c = info?.challenge;
    const blocked = Boolean(c?.lockMessage) || Boolean(c?.done);
    return (
      <>
        <p className="small muted" style={{ margin: 0 }}>🏁 Desafío</p>
        <h1>Prueba formal</h1>
        <div className="card stack-sm">
          <p style={{ margin: 0 }}>Esto simula tu evaluación real:</p>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            <li>No hay pistas ni ayuda.</li>
            <li>No sabrás si acertaste hasta que entregues la prueba.</li>
            <li>Puedes volver a cualquier pregunta antes de entregar.</li>
            {info && <li>Apruebas con {info.challengeThreshold}%. Tienes {c?.maxAttempts ?? 2} intentos: si no lo logras, repasarás y practicarás de nuevo para abrir un Desafío nuevo.</li>}
          </ul>
        </div>
        {c?.done && <p className="alert alert-success" style={{ marginTop: 16 }}>🏆 ¡Ya aprobaste el Desafío!</p>}
        {c?.lockMessage && <p role="alert" className="alert alert-warning" style={{ marginTop: 16 }}>🔒 {c.lockMessage}</p>}
        {error && <p role="alert" className="alert alert-warning" style={{ marginTop: 16 }}>{error}</p>}
        <div className="stack-sm" style={{ marginTop: 16 }}>
          {!blocked && (
            <button type="button" className="btn btn-block" onClick={start} disabled={busy || !info}>
              {busy ? "Preparando…" : c && c.attemptsLeft < (c.maxAttempts ?? 2) ? `Comenzar el Desafío (te queda ${c.attemptsLeft} intento)` : "Comenzar el Desafío"}
            </button>
          )}
          <a className="btn btn-secondary btn-block" href={`/student/routes/${params.id}`}>Volver a la ruta</a>
        </div>
      </>
    );
  }

  const q = data.questions[index];
  const isAnswered = (x: Question) => (x.type === "activity" ? marked.has(x.position) : answers[x.position] !== undefined);
  const answered = data.questions.filter(isAnswered).length;
  const missing = data.total - answered;

  return (
    <>
      <p className="small muted" style={{ margin: 0 }}>🏁 Desafío · sin ayudas</p>
      <ProgressBar value={(answered / data.total) * 100} label="Preguntas respondidas" />
      <p className="small muted">Pregunta {index + 1} de {data.total} · {answered} respondidas</p>

      <div className="stack">
        <h1 style={{ fontSize: "1.3rem", margin: 0 }}>{q.question}</h1>
        <Visual text={q.visual} />

        {q.type === "choice" && q.options && (
          <QuestionOptions options={q.options} selectedKey={answers[q.position]} onSelect={(key) => setAnswers((a) => ({ ...a, [q.position]: key }))} />
        )}
        {q.type === "activity" && (
          <ActivityPanel
            key={`${q.position}-${marked.has(q.position)}`}
            attemptId={data.attemptId}
            position={q.position}
            hideOutcome
            alreadyMarked={marked.has(q.position)}
            onMarked={() => setMarked((m) => new Set(m).add(q.position))}
          />
        )}

        <div className="row" style={{ justifyContent: "space-between" }}>
          <button type="button" className="btn btn-secondary" onClick={() => setIndex(index - 1)} disabled={index === 0}>← Anterior</button>
          <button type="button" className="btn btn-secondary" onClick={() => setIndex(index + 1)} disabled={index === data.total - 1}>Siguiente →</button>
        </div>

        <nav aria-label="Ir a una pregunta" className="row">
          {data.questions.map((x, i) => (
            <button key={x.position} type="button" className="btn btn-small" style={{ minWidth: 44, opacity: i === index ? 1 : isAnswered(x) ? 0.85 : 0.45 }} aria-label={`Pregunta ${i + 1}${isAnswered(x) ? ", respondida" : ", sin responder"}`} aria-current={i === index ? "step" : undefined} onClick={() => setIndex(i)}>
              {i + 1}
            </button>
          ))}
        </nav>

        {error && <p role="alert" className="alert alert-error">{error}</p>}

        {!confirming ? (
          <button type="button" className="btn btn-block" onClick={() => setConfirming(true)}>Entregar prueba</button>
        ) : (
          <div className="card stack-sm" role="alertdialog" aria-label="Confirmar entrega">
            <p style={{ margin: 0 }}>
              {missing > 0 ? <>Te faltan <strong>{missing}</strong> pregunta(s) sin responder y contarán como incorrectas. </> : "Respondiste todas las preguntas. "}
              ¿Entregar ahora?
            </p>
            <button type="button" className="btn btn-block" onClick={submit} disabled={busy}>{busy ? "Entregando…" : "Sí, entregar"}</button>
            <button type="button" className="btn btn-secondary btn-block" onClick={() => setConfirming(false)} disabled={busy}>Seguir revisando</button>
          </div>
        )}
      </div>
    </>
  );
}
