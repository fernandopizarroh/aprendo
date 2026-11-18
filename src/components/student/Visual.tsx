/** Dibujo de apoyo hecho con emojis (nivel inicial). Se muestra como texto, nunca como HTML. */
export function Visual({ text }: { text?: string }) {
  if (!text?.trim()) return null;
  return (
    <div className="visual" role="img" aria-label="Dibujo de apoyo">
      {text}
    </div>
  );
}
