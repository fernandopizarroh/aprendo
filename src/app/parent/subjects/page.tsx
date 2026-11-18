"use client";

import { useCallback, useEffect, useState, type CSSProperties, type FormEvent } from "react";

interface Student {
  id: string;
  displayName: string;
}
interface Subject {
  id: string;
  name: string;
  colorTag: string;
  routes: { id: string; title: string; status: string }[];
}

const STATUS: Record<string, { label: string; cls: string }> = {
  generating: { label: "Generando…", cls: "badge-generating" },
  ready: { label: "Lista", cls: "badge-ready" },
  error: { label: "Con error", cls: "badge-error" },
};

export default function SubjectsPage() {
  const [students, setStudents] = useState<Student[] | null>(null);
  const [studentId, setStudentId] = useState("");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/students");
      const list: Student[] = res.ok ? (await res.json()).students : [];
      setStudents(list);
      if (list[0]) setStudentId(list[0].id);
    })();
  }, []);

  const loadSubjects = useCallback(async () => {
    if (!studentId) return setSubjects([]);
    const res = await fetch(`/api/subjects?studentId=${encodeURIComponent(studentId)}`);
    if (res.ok) setSubjects((await res.json()).subjects);
  }, [studentId]);

  useEffect(() => {
    loadSubjects();
  }, [loadSubjects]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const form = e.currentTarget;
    const f = Object.fromEntries(new FormData(form));
    const res = await fetch("/api/subjects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...f, studentId }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      form.reset();
      loadSubjects();
    } else setError(data.error ?? "No se pudo crear la asignatura");
  }

  if (students === null) return <p className="muted">Cargando…</p>;

  if (students.length === 0) {
    return (
      <>
        <h1>Asignaturas</h1>
        <p className="alert alert-info">Primero crea un alumno para poder agregarle asignaturas.</p>
        <a className="btn btn-block" href="/parent/students">Ir a Alumnos</a>
      </>
    );
  }

  return (
    <>
      <h1>Asignaturas</h1>
      <label className="field">
        Alumno
        <select value={studentId} onChange={(e) => setStudentId(e.target.value)}>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.displayName}
            </option>
          ))}
        </select>
      </label>

      <div className="stack" style={{ marginTop: 16 }}>
        {subjects.map((s) => (
          <section key={s.id} className="card subject-card" style={{ "--accent": s.colorTag } as CSSProperties}>
            <h2>{s.name}</h2>
            <ul className="list-plain" style={{ marginBottom: 12 }}>
              {s.routes.map((r) => {
                const st = STATUS[r.status] ?? { label: r.status, cls: "" };
                return (
                  <li key={r.id} className="row" style={{ justifyContent: "space-between" }}>
                    <a href={`/parent/routes/${r.id}`}>{r.title}</a>
                    <span className={`badge ${st.cls}`}>{st.label}</span>
                  </li>
                );
              })}
              {s.routes.length === 0 && <li className="muted">Sin rutas todavía.</li>}
            </ul>
            <a className="btn btn-secondary btn-block" href={`/parent/routes/new?subjectId=${s.id}`}>
              + Nueva ruta de aprendizaje
            </a>
          </section>
        ))}
        {subjects.length === 0 && <p className="muted">Este alumno aún no tiene asignaturas.</p>}
      </div>

      <h2>Agregar asignatura</h2>
      <form onSubmit={onSubmit} className="card stack">
        <label className="field">
          Nombre
          <input name="name" placeholder="Ej. Matemáticas" required />
        </label>
        <label className="field">
          Color
          <input name="colorTag" type="color" defaultValue="#4f46e5" />
        </label>
        {error && <p role="alert" className="alert alert-error">{error}</p>}
        <button type="submit" className="btn btn-block">Crear asignatura</button>
      </form>
    </>
  );
}
