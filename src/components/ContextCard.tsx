"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { compressImages } from "@/lib/client/compress-images";

const MAX_PHOTOS = 10;
type Stage = "review" | "diagnostic" | "challenge";

const STAGE_OPTIONS: { key: Stage; label: string; note: string }[] = [
  { key: "diagnostic", label: "Diagnóstico", note: "Reemplaza todas sus preguntas por otras nuevas." },
  { key: "challenge", label: "Desafío", note: "Reemplaza todas sus preguntas por otras nuevas." },
  { key: "review", label: "Repaso", note: "Reemplaza las tarjetas. El alumno deberá repasar otra vez." },
];

interface Props {
  routeId: string;
  title: string;
  syllabusText: string;
  photoPaths: string[];
  /** Se llama tras guardar, para recargar la ruta (y seguir su generación si se pidió). */
  onSaved: () => void;
}

/**
 * Cambia el contexto con que la IA arma la ruta: título, temario y fotos de ejercicios vistos en clase.
 * Lo que se regenera es elección del apoderado; el historial de puntajes del alumno se conserva.
 */
export function ContextCard({ routeId, title, syllabusText, photoPaths, onSaved }: Props) {
  const [newTitle, setNewTitle] = useState(title);
  const [text, setText] = useState(syllabusText);
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [added, setAdded] = useState<File[]>([]);
  const [stages, setStages] = useState<Set<Stage>>(new Set(["diagnostic", "challenge"]));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const kept = photoPaths.length - removed.size;
  const total = kept + added.length;
  const regenerating = stages.size > 0;

  function toggle<T>(set: Set<T>, v: T): Set<T> {
    const next = new Set(set);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    return next;
  }

  function addPhotos(e: ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    setAdded((prev) => [...prev, ...picked].slice(0, Math.max(0, MAX_PHOTOS - kept)));
    e.target.value = "";
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const body = new FormData();
      if (newTitle !== title) body.set("title", newTitle);
      if (text !== syllabusText) body.set("syllabusText", text);
      removed.forEach((p) => body.append("remove", p));
      for (const img of await compressImages(added)) body.append("images", img, img.name);
      stages.forEach((s) => body.append("regenerate", s));

      const res = await fetch(`/api/routes/${routeId}/context`, { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setError(data.error ?? "No se pudo guardar el contexto");
      setRemoved(new Set());
      setAdded([]);
      setMessage(
        regenerating
          ? "Contexto guardado. Estamos regenerando las etapas elegidas con el contexto nuevo."
          : "Contexto guardado. Se usará la próxima vez que se regenere la ruta o se amplíen sus preguntas.",
      );
      onSaved();
    } catch {
      setError("No se pudo enviar. Revisa tu conexión e intenta de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <details className="card">
      <summary><strong>📎 Contexto de la ruta</strong> <span className="small muted">(temario y fotos)</span></summary>
      <form onSubmit={save} className="stack" style={{ marginTop: 12 }}>
        <p className="small muted" style={{ margin: 0 }}>
          Es lo que la IA usa para crear las preguntas. Agrega más temario o más fotos de ejercicios que el alumno ya trabajó en clase y regenera para que las preguntas los consideren.
        </p>

        <label className="field">
          Título
          <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} required maxLength={120} />
        </label>
        <label className="field">
          Temario indicado por el profesor
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={6} required minLength={10} />
        </label>

        <fieldset>
          <legend>Fotos de ejercicios vistos en clase ({total} de {MAX_PHOTOS})</legend>
          {photoPaths.length > 0 && (
            <div className="photo-grid">
              {photoPaths.map((p, i) => (
                <div key={p} className="photo-thumb" data-removed={removed.has(p)}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/routes/${routeId}/photos/${i}`} alt={`Foto ${i + 1} de la ruta`} loading="lazy" />
                  <button type="button" className="btn btn-secondary btn-small" aria-pressed={removed.has(p)} onClick={() => setRemoved(toggle(removed, p))}>
                    {removed.has(p) ? "Se quitará · Deshacer" : "Quitar"}
                  </button>
                </div>
              ))}
            </div>
          )}
          {photoPaths.length === 0 && <p className="small muted" style={{ margin: 0 }}>Esta ruta no tiene fotos.</p>}

          <label className="btn btn-secondary btn-block">
            📷 Tomar foto
            <input className="sr-only" type="file" accept="image/*" capture="environment" onChange={addPhotos} disabled={total >= MAX_PHOTOS} />
          </label>
          <label className="btn btn-secondary btn-block">
            🖼️ Elegir de la galería
            <input className="sr-only" type="file" accept="image/*" multiple onChange={addPhotos} disabled={total >= MAX_PHOTOS} />
          </label>
          {added.length > 0 && (
            <ul className="list-plain photo-list">
              {added.map((f, i) => (
                <li key={`${f.name}-${i}`} className="photo-item">
                  <span>➕ {f.name}</span>
                  <button type="button" className="btn btn-secondary btn-small" onClick={() => setAdded(added.filter((_, j) => j !== i))}>Quitar</button>
                </li>
              ))}
            </ul>
          )}
        </fieldset>

        <fieldset>
          <legend>¿Qué regenerar con este contexto?</legend>
          {STAGE_OPTIONS.map((o) => (
            <label key={o.key} className="stack-sm" style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 10px", alignItems: "start" }}>
              <input type="checkbox" checked={stages.has(o.key)} onChange={() => setStages(toggle(stages, o.key))} style={{ width: 24, minHeight: 24, marginTop: 2 }} />
              <span><strong>{o.label}</strong><br /><span className="small muted">{o.note}</span></span>
            </label>
          ))}
          <p className="small muted" style={{ margin: 0 }}>
            El historial de puntajes y de intentos del alumno se conserva; los intentos a medias de las etapas regeneradas se pierden. Puede tardar de 1 a 3 minutos y usa tu proveedor de IA.
          </p>
        </fieldset>

        {error && <p role="alert" className="alert alert-error" style={{ margin: 0 }}>{error}</p>}
        {message && <p role="status" className="alert alert-success" style={{ margin: 0 }}>{message}</p>}
        <button type="submit" className="btn btn-block" disabled={busy}>
          {busy ? "Guardando…" : regenerating ? `Guardar y regenerar (${stages.size} ${stages.size === 1 ? "etapa" : "etapas"})` : "Guardar solo el contexto"}
        </button>
      </form>
    </details>
  );
}
