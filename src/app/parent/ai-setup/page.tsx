"use client";

import { useEffect, useState } from "react";
import { PROVIDERS, type ProviderId } from "@/lib/ai/providers-info";

interface Status {
  configured: boolean;
  provider: ProviderId | null;
  last4: string | null;
}

export default function AiSetupPage() {
  const [provider, setProvider] = useState<ProviderId>("gemini");
  const [apiKey, setApiKey] = useState("");
  const [status, setStatus] = useState<Status | null>(null);
  const [result, setResult] = useState<{ ok: boolean; message: string; providerDetail?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const info = PROVIDERS.find((p) => p.id === provider)!;

  async function loadStatus() {
    const res = await fetch("/api/ai/status");
    if (res.ok) setStatus(await res.json());
  }
  useEffect(() => {
    loadStatus();
  }, []);

  async function test() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/ai/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey }),
      });
      const data = await res.json().catch(() => ({ ok: false, message: "Respuesta inesperada del servidor" }));
      setResult(data);
      if (data.ok) {
        setApiKey("");
        loadStatus();
      }
    } catch {
      setResult({ ok: false, message: "No se pudo contactar al servidor." });
    }
    setLoading(false);
  }

  return (
    <>
      <h1>Conecta la inteligencia artificial</h1>

      {status?.configured && (
        <p className="alert alert-success">
          Conectado con <strong>{PROVIDERS.find((p) => p.id === status.provider)?.name}</strong>. Llave terminada en{" "}
          <code>…{status.last4}</code>. Puedes reemplazarla abajo.
        </p>
      )}

      <h2>1. Elige un proveedor</h2>
      <div className="stack-sm" role="group" aria-label="Proveedor de IA">
        {PROVIDERS.map((p) => (
          <button key={p.id} type="button" className="choice choice-check" aria-pressed={provider === p.id} onClick={() => setProvider(p.id)}>
            <span className="choice-title">
              {p.name} {p.recommended && <span className="badge badge-ready">Recomendado</span>}
            </span>
            <span className="choice-note">{p.note}</span>
          </button>
        ))}
      </div>

      <h2>2. Obtén tu llave</h2>
      <div className="card stack-sm">
        <ol style={{ margin: 0, paddingLeft: 20 }}>
          {info.steps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
        <a className="btn btn-secondary btn-block" href={info.keyUrl} target="_blank" rel="noopener noreferrer">
          Abrir el sitio de {info.name} ↗
        </a>
      </div>

      <h2>3. Pégala aquí</h2>
      <div className="card stack">
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Pega tu llave"
          autoComplete="off"
          aria-label="Llave de API"
        />
        <button type="button" className="btn btn-block" onClick={test} disabled={loading || apiKey.trim().length < 8}>
          {loading ? "Probando..." : "Probar Conexión"}
        </button>
        {result && (
          <div role="alert" className={`alert ${result.ok ? "alert-success" : "alert-error"}`}>
            <p style={{ margin: 0 }}>
              {result.ok ? "✔ " : "✖ "}
              {result.message}
            </p>
            {result.providerDetail && <p className="small" style={{ margin: "6px 0 0" }}>Detalle del proveedor: {result.providerDetail}</p>}
          </div>
        )}
        <p className="small muted" style={{ margin: 0 }}>Tu llave se guarda cifrada en el servidor y no vuelve a mostrarse completa.</p>
      </div>
    </>
  );
}
