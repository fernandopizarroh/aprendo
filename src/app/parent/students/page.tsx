"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api } from "@/lib/client/api";
import { Toast } from "@/components/Toast";
import { gradeNotice, type GradeLevelKind } from "@/lib/grade";

interface Student {
  id: string;
  username: string;
  displayName: string;
  gradeLevel: string;
  levelKind: GradeLevelKind;
}

const GRADES = [
  "Kínder", "1° básico", "2° básico", "3° básico", "4° básico", "5° básico", "6° básico", "7° básico", "8° básico",
  "1° medio", "2° medio", "3° medio", "4° medio",
];

const KIND_BADGE: Record<GradeLevelKind, { label: string; cls: string }> = {
  inicial: { label: "Nivel inicial", cls: "badge-info" },
  general: { label: "4° básico o superior", cls: "" },
  desconocido: { label: "Curso no reconocido", cls: "badge-warn" },
};

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<ReturnType<typeof gradeNotice> | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editError, setEditError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/students");
    if (res.ok) setStudents((await res.json()).students);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const form = e.currentTarget;
    const f = Object.fromEntries(new FormData(form));
    const res = await fetch("/api/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(f),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      form.reset();
      setToast(gradeNotice(data.student.gradeLevel)); // qué entendió el sistema del curso
      load();
    } else setError(data.error ?? "No se pudo crear el alumno");
  }

  async function saveGrade(e: FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault();
    setEditError("");
    const gradeLevel = String(new FormData(e.currentTarget).get("gradeLevel") ?? "");
    const r = await api<{ student: Student }>(`/api/students/${id}`, "PATCH", { gradeLevel });
    if (!r.ok) return setEditError(r.data.error ?? "No se pudo cambiar el curso");
    setEditing(null);
    setToast(gradeNotice(r.data.student.gradeLevel));
    load();
  }

  return (
    <>
      <h1>Alumnos</h1>
      <ul className="list-plain">
        {students.map((s) => {
          const kind = KIND_BADGE[s.levelKind];
          return (
            <li key={s.id} className="card stack-sm">
              <div className="row" style={{ justifyContent: "space-between" }}>
                <strong>{s.displayName}</strong>
                <span className={`badge ${kind.cls}`}>{kind.label}</span>
              </div>
              <div>
                <span className="small muted">Curso: </span>{s.gradeLevel}
                <br />
                <span className="small muted">Usuario para ingresar: </span>
                <code>{s.username}</code>
              </div>

              {editing === s.id ? (
                <form onSubmit={(e) => saveGrade(e, s.id)} className="stack-sm">
                  <label className="field">
                    Curso
                    <input name="gradeLevel" list="grades" defaultValue={s.gradeLevel} required maxLength={40} />
                    <span className="hint">Si cambias el curso, las rutas ya creadas no cambian: regénéralas para aplicar el nuevo nivel.</span>
                  </label>
                  {editError && <p role="alert" className="alert alert-error" style={{ margin: 0 }}>{editError}</p>}
                  <div className="row">
                    <button type="submit" className="btn btn-small">Guardar curso</button>
                    <button type="button" className="btn btn-secondary btn-small" onClick={() => { setEditing(null); setEditError(""); }}>Cancelar</button>
                  </div>
                </form>
              ) : (
                <button type="button" className="btn btn-secondary btn-small" onClick={() => { setEditing(s.id); setEditError(""); }}>Cambiar curso</button>
              )}
            </li>
          );
        })}
        {students.length === 0 && <li className="card muted">Aún no hay alumnos. Crea el primero abajo.</li>}
      </ul>

      <h2>Agregar alumno</h2>
      <form onSubmit={onSubmit} className="card stack">
        <label className="field">
          Nombre
          <input name="displayName" required />
        </label>
        <label className="field">
          Curso
          <input name="gradeLevel" list="grades" placeholder="Ej. 2° básico" required maxLength={40} />
          <span className="hint">Importante: hasta 3° básico las evaluaciones llevan dibujos y actividades de cuaderno.</span>
        </label>
        <datalist id="grades">
          {GRADES.map((g) => <option key={g} value={g} />)}
        </datalist>
        <label className="field">
          Usuario
          <input name="username" required autoCapitalize="none" />
          <span className="hint">3 a 30 caracteres: letras, números, _ . -</span>
        </label>
        <label className="field">
          Contraseña
          <input name="password" type="password" required minLength={4} />
          <span className="hint">Mínimo 4 caracteres. Algo fácil de recordar para el alumno.</span>
        </label>
        {error && <p role="alert" className="alert alert-error">{error}</p>}
        <button type="submit" className="btn btn-block">Crear alumno</button>
      </form>

      {toast && (
        <Toast title={toast.title} tone={toast.tone} onClose={() => setToast(null)}>
          {toast.text}
        </Toast>
      )}
    </>
  );
}
