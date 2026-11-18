import type { ReactNode } from "react";
import { Visual } from "./Visual";

export interface BreakdownItem {
  position: number;
  type: "choice" | "activity";
  question: string;
  visual?: string;
  options: { key: number; text: string }[];
  chosenKey: number | null;
  correctKey: number | null;
  verdict: 0 | 1 | 2 | null;
  expected?: string;
  correct: boolean;
  explanation: string;
}

export interface QuizResult {
  stage: "diagnostic" | "challenge";
  percentage: number;
  correct: number;
  total: number;
  helped: number;
  threshold: number;
  passed: boolean;
  challengeUnlocked: boolean;
  outcome?: { passed: boolean; extra?: boolean; roundReset: boolean; attemptsLeft: number; threshold: number };
  breakdown: BreakdownItem[];
}

const textOf = (b: BreakdownItem, key: number | null) => (key === null ? "Sin responder" : b.options.find((o) => o.key === key)?.text ?? "");
const VERDICT_TEXT = { 0: "✔ Correcto", 1: "🤝 Correcto con ayuda", 2: "✖ Error" } as const;

function Item({ b }: { b: BreakdownItem }) {
  const help = b.verdict === 1; // cuenta como correcta, pero hay que reforzar
  return (
    <li className={`card ${help ? "item-help" : ""}`} data-ok={b.correct} data-help={help}>
      <p style={{ fontWeight: 700 }}>
        {help ? "🤝" : b.correct ? "✔" : "✖"} {b.type === "activity" && "📓 "}{b.question}
      </p>
      <Visual text={b.visual} />
      {b.type === "activity" ? (
        <>
          <p className={`small ${help ? "help-text" : ""}`}>Validación del adulto: <strong>{b.verdict === null ? "Sin validar" : VERDICT_TEXT[b.verdict]}</strong>{help && " · ¡a reforzar!"}</p>
          <p className="small">Respuesta esperada: <strong>{b.expected}</strong></p>
        </>
      ) : (
        <>
          {!b.correct && <p className="small">Tu respuesta: <strong>{textOf(b, b.chosenKey)}</strong></p>}
          <p className="small">Respuesta correcta: <strong>{textOf(b, b.correctKey)}</strong></p>
        </>
      )}
      <p className="small muted" style={{ margin: 0 }}>{b.explanation}</p>
    </li>
  );
}

function headline(r: QuizResult): { emoji: string; title: string; text: string } {
  if (r.stage === "diagnostic") {
    return r.passed
      ? { emoji: "🎉", title: "¡Excelente trabajo!", text: `Llegaste al ${r.threshold}% que se pedía. ¡Desbloqueaste el Desafío!` }
      : { emoji: "💪", title: "¡Vas muy bien!", text: `Necesitas ${r.threshold}% para abrir el Desafío. Lee las explicaciones e inténtalo de nuevo: cada intento te acerca.` };
  }
  const o = r.outcome;
  if (r.passed && o?.extra) return { emoji: "🏆", title: "¡Aprobaste otro Desafío!", text: "Sigues dominando el tema. ¡Felicitaciones!" };
  if (!r.passed && o?.extra) {
    return o.attemptsLeft > 0
      ? { emoji: "👏", title: "¡Buen intento!", text: `Necesitas ${r.threshold}% para aprobar. Te queda ${o.attemptsLeft} intento y tu aprobación anterior sigue vigente.` }
      : { emoji: "💪", title: "Este Desafío adicional no salió", text: `No llegaste al ${r.threshold}%, pero tu aprobación anterior sigue vigente. Si quieres otro intento, pídele a tu apoderado que habilite otro Desafío.` };
  }
  if (r.passed) return { emoji: "🏆", title: "¡Aprobaste el Desafío!", text: "Estás muy bien preparado para tu prueba. ¡Felicitaciones!" };
  if (o?.roundReset) {
    return { emoji: "🌱", title: "Vamos a practicar un poco más", text: `No llegaste al ${r.threshold}% en tus 2 intentos. Para abrir un Desafío nuevo, repasa otra vez y aprueba un Diagnóstico. ¡Tú puedes!` };
  }
  return { emoji: "👏", title: "¡Buen intento!", text: `Necesitas ${r.threshold}% para aprobar. Lee las explicaciones: te queda ${o?.attemptsLeft ?? 1} intento.` };
}

export function ResultView({ result, actions }: { result: QuizResult; actions: ReactNode }) {
  const h = headline(result);
  const wrong = result.breakdown.filter((b) => !b.correct);
  const helpedItems = result.breakdown.filter((b) => b.verdict === 1);
  const right = result.breakdown.filter((b) => b.correct && b.verdict !== 1);
  return (
    <div className="stack">
      <section className="card center stack-sm" aria-live="polite">
        <div style={{ fontSize: "2.5rem" }} aria-hidden>{h.emoji}</div>
        <h1 style={{ margin: 0 }}>{h.title}</h1>
        <p className="score" data-testid="score">{result.percentage}%</p>
        <p style={{ margin: 0 }}>{result.correct} de {result.total} correctas</p>
        {result.helped > 0 && (
          <p className="small help-text" style={{ margin: 0 }}><strong>🤝 {result.helped} actividad(es) resuelta(s) con ayuda del adulto: ¡a reforzar!</strong></p>
        )}
        <p className="muted" style={{ margin: 0 }}>{h.text}</p>
      </section>

      <div className="stack-sm">{actions}</div>

      {wrong.length > 0 && (
        <section>
          <h2>Para revisar ({wrong.length})</h2>
          <ul className="list-plain">{wrong.map((b) => <Item key={b.position} b={b} />)}</ul>
        </section>
      )}
      {helpedItems.length > 0 && (
        <section>
          <h2 className="help-text">🤝 Para reforzar ({helpedItems.length})</h2>
          <p className="small muted">Las resolviste con ayuda. Cuentan como correctas, pero practícalas otra vez para poder hacerlas tú solo.</p>
          <ul className="list-plain">{helpedItems.map((b) => <Item key={b.position} b={b} />)}</ul>
        </section>
      )}
      {right.length > 0 && (
        <details>
          <summary><strong>Respuestas correctas ({right.length})</strong></summary>
          <ul className="list-plain" style={{ marginTop: 12 }}>{right.map((b) => <Item key={b.position} b={b} />)}</ul>
        </details>
      )}
    </div>
  );
}
