"use client";

import { useState, type FormEvent } from "react";

export default function LoginPage() {
  const [role, setRole] = useState<"parent" | "student">("parent");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const f = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, identifier: f.get("identifier"), password: f.get("password") }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (res.ok) window.location.href = data.redirect;
    else setError(data.error ?? "No se pudo ingresar");
  }

  return (
    <main className="container" data-theme={role === "student" ? "student" : undefined} style={{ minHeight: "100vh" }}>
      <h1>Ingresar</h1>
      <div className="tabs" role="group" aria-label="Tipo de cuenta" style={{ marginBottom: 16 }}>
        <button type="button" className="btn btn-secondary" aria-pressed={role === "parent"} onClick={() => setRole("parent")}>
          Soy apoderado
        </button>
        <button type="button" className="btn btn-secondary" aria-pressed={role === "student"} onClick={() => setRole("student")}>
          Soy alumno
        </button>
      </div>
      <form onSubmit={onSubmit} className="card stack">
        <label className="field">
          {role === "parent" ? "Correo" : "Usuario"}
          <input name="identifier" type={role === "parent" ? "email" : "text"} required autoComplete="username" />
        </label>
        <label className="field">
          Contraseña
          <input name="password" type="password" required autoComplete="current-password" />
        </label>
        {error && <p role="alert" className="alert alert-error">{error}</p>}
        <button type="submit" className="btn btn-block" disabled={loading}>{loading ? "Ingresando..." : "Ingresar"}</button>
      </form>
      {role === "parent" && <p className="center" style={{ marginTop: 16 }}><a href="/register">Crear cuenta de apoderado</a></p>}
    </main>
  );
}
