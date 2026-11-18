"use client";

import { useState, type FormEvent } from "react";

export default function RegisterPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const f = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: f.get("email"), password: f.get("password") }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (res.ok) window.location.href = "/parent/students";
    else setError(data.error ?? "No se pudo crear la cuenta");
  }

  return (
    <main className="container">
      <h1>Crear cuenta de apoderado</h1>
      <form onSubmit={onSubmit} className="card stack">
        <label className="field">
          Correo
          <input name="email" type="email" required autoComplete="email" />
        </label>
        <label className="field">
          Contraseña
          <input name="password" type="password" required minLength={8} autoComplete="new-password" />
          <span className="hint">Mínimo 8 caracteres</span>
        </label>
        {error && <p role="alert" className="alert alert-error">{error}</p>}
        <button type="submit" className="btn btn-block" disabled={loading}>{loading ? "Creando..." : "Crear cuenta"}</button>
      </form>
      <p className="center" style={{ marginTop: 16 }}><a href="/login">Ya tengo cuenta</a></p>
    </main>
  );
}
