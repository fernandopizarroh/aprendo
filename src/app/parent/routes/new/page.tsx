"use client";

import { Suspense, useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { compressImages } from "@/lib/client/compress-images";
import { api } from "@/lib/client/api";
import { gradeNotice, type GradeNotice } from "@/lib/grade";

const MAX_PHOTOS = 10;

function NewRouteForm() {
  const subjectId = useSearchParams().get("subjectId") ?? "";
  const [photos, setPhotos] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [needsAi, setNeedsAi] = useState(false);
  const [saving, setSaving] = useState(false);
  const [student, setStudent] = useState<{ displayName: string; notice: GradeNotice } | null>(null);

  useEffect(() => {
    fetch("/api/ai/status")
      .then((r) => r.json())
      .then((s) => setNeedsAi(!s.configured))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!subjectId) return;
    api<{ student: { displayName: string; gradeLevel: string } }>(`/api/subjects/${subjectId}`).then((r) => {
      if (r.ok) setStudent({ displayName: r.data.student.displayName, notice: gradeNotice(r.data.student.gradeLevel) });
    });
  }, [subjectId]);

  function addPhotos(e: ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    setPhotos((prev) => [...prev, ...picked].slice(0, MAX_PHOTOS));
    e.target.value = ""; // permite volver a elegir la misma foto
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const f = new FormData(e.currentTarget);
      const body = new FormData();
      body.set("subjectId", subjectId);
      for (const k of ["title", "syllabusText", "diagQuestions", "challengeQuestions", "unlockThreshold", "challengeThreshold"]) {
        body.set(k, String(f.get(k) ?? ""));
      }
      for (const img of await compressImages(photos)) body.append("images", img, img.name);

      const res = await fetch("/api/routes", { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (res.ok) window.location.href = `/parent/routes/${data.id}`;
      else {
        setNeedsAi(data.code === "ai_not_configured");
        setError(data.error ?? "No se pudo crear la ruta");
      }
    } catch {
      setError("No se pudo enviar. Revisa tu conexión e intenta de nuevo.");
    }
    setSaving(false);
  }

  if (!subjectId) {
    return (
      <>
        <p className="alert alert-info">Elige una asignatura primero.</p>
        <a className="btn btn-block" href="/parent/subjects">Ir a Asignaturas</a>
      </>
    );
  }

  return (
    <>
      <h1>Nueva ruta de aprendizaje</h1>
      {needsAi && (
        <p role="alert" className="alert alert-warning">
          Antes de crear una ruta debes <a href="/parent/ai-setup">conectar la inteligencia artificial</a>.
        </p>
      )}
      {student && (
        <div className={`alert ${student.notice.tone === "warning" ? "alert-warning" : "alert-info"} stack-sm`} role="note">
          <strong>Alumno: {student.displayName} · {student.notice.title}</strong>
          <span className="small">{student.notice.text}</span>
          <a href="/parent/students">Revisar o cambiar el curso</a>
        </div>
      )}
      <form onSubmit={onSubmit} className="stack">
        <div className="card stack">
          <label className="field">
            Título de la evaluación
            <input name="title" required placeholder="Ej. Prueba de fracciones" />
          </label>
          <label className="field">
            Temario indicado por el profesor
            <textarea name="syllabusText" required minLength={10} rows={6} placeholder="Pega o escribe el temario aquí" />
          </label>
        </div>

        <fieldset>
          <legend>Fotos de ejercicios vistos en clase (opcional, hasta {MAX_PHOTOS})</legend>
          <p className="alert alert-info small" style={{ margin: 0 }}>
            Sirven de apoyo para que la IA conozca el tipo de ejercicios que el alumno ya trabajó. No son obligatorias. Si las subes, asegúrate de tener buena luz y que el texto se vea nítido.
          </p>
          <label className="btn btn-secondary btn-block">
            📷 Tomar foto
            <input className="sr-only" type="file" accept="image/*" capture="environment" onChange={addPhotos} />
          </label>
          <label className="btn btn-secondary btn-block">
            🖼️ Elegir de la galería
            <input className="sr-only" type="file" accept="image/*" multiple onChange={addPhotos} />
          </label>
          {photos.length > 0 && (
            <ul className="list-plain photo-list">
              {photos.map((p, i) => (
                <li key={`${p.name}-${i}`} className="photo-item">
                  <span>{p.name}</span>
                  <button type="button" className="btn btn-secondary btn-small" onClick={() => setPhotos(photos.filter((_, j) => j !== i))}>
                    Quitar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </fieldset>

        <fieldset>
          <legend>Reglas de evaluación</legend>
          <label className="field">
            Preguntas del Diagnóstico (5 a 15)
            <input name="diagQuestions" type="number" inputMode="numeric" min={5} max={15} defaultValue={10} />
          </label>
          <label className="field">
            Preguntas del Desafío (10 a 30)
            <input name="challengeQuestions" type="number" inputMode="numeric" min={10} max={30} defaultValue={15} />
          </label>
          <label className="field">
            % mínimo en el Diagnóstico para abrir el Desafío
            <input name="unlockThreshold" type="number" inputMode="numeric" min={1} max={100} defaultValue={90} />
          </label>
          <label className="field">
            % mínimo para aprobar el Desafío
            <input name="challengeThreshold" type="number" inputMode="numeric" min={1} max={100} defaultValue={90} />
            <span className="hint">El alumno tiene 2 intentos. Si no lo logra, repasa y practica de nuevo.</span>
          </label>
        </fieldset>

        {error && <p role="alert" className="alert alert-error">{error}</p>}
        <button type="submit" className="btn btn-block" disabled={saving}>
          {saving ? "Enviando…" : "Crear ruta"}
        </button>
      </form>
    </>
  );
}

export default function NewRoutePage() {
  return (
    <Suspense fallback={null}>
      <NewRouteForm />
    </Suspense>
  );
}
