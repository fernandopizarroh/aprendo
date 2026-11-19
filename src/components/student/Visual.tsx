/** Dibujo de apoyo hecho con emojis (nivel inicial): un grupo de datos por fila. Se muestra como texto, nunca como HTML. */
const segmenter = new Intl.Segmenter("es", { granularity: "grapheme" });

/** Parte un grupo de emojis en bloques de 5 para que sea fácil contarlos. */
function chunks(token: string): string[] {
  const gs = Array.from(segmenter.segment(token), (s) => s.segment);
  const out: string[] = [];
  for (let i = 0; i < gs.length; i += 5) out.push(gs.slice(i, i + 5).join(""));
  return out;
}

export function Visual({ text }: { text?: string }) {
  if (!text?.trim()) return null;
  const tokens = text.trim().split(/\s+/);
  return (
    <div className="visual" role="img" aria-label="Dibujo de apoyo">
      {tokens
        .filter((t) => !/^[+−\-=❓?]+$/.test(t)) // dibujos antiguos: sin signos ni resultado
        .map((t, i) => (
          <span key={i} className="visual-group">
            {chunks(t).map((c, j) => <span key={j}>{c}</span>)}
          </span>
        ))}
    </div>
  );
}
