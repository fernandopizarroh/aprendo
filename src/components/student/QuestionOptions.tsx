interface Props {
  options: { key: number; text: string }[];
  selectedKey?: number | null;
  /** Solo en Diagnóstico tras responder: marca la correcta y la elegida. */
  correctKey?: number | null;
  disabled?: boolean;
  onSelect: (key: number) => void;
}

export function QuestionOptions({ options, selectedKey, correctKey, disabled, onSelect }: Props) {
  return (
    <div className="stack-sm" role="group" aria-label="Alternativas">
      {options.map((o, i) => {
        const isCorrect = correctKey != null && o.key === correctKey;
        const isWrongPick = correctKey != null && o.key === selectedKey && o.key !== correctKey;
        const state = isCorrect ? "correct" : isWrongPick ? "wrong" : undefined;
        return (
          <button
            key={o.key}
            type="button"
            className="choice"
            data-state={state}
            aria-pressed={selectedKey === o.key}
            disabled={disabled}
            onClick={() => onSelect(o.key)}
          >
            <span className="choice-title">
              {String.fromCharCode(65 + i)}) {o.text}
              {isCorrect && " ✔"}
              {isWrongPick && " ✖"}
            </span>
          </button>
        );
      })}
    </div>
  );
}
