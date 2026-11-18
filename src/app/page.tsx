import Link from "next/link";

export default function Home() {
  return (
    <main className="container" style={{ paddingTop: 48 }}>
      <div className="stack">
        <h1 style={{ fontSize: "2.2rem", marginBottom: 0 }}>Aprendo</h1>
        <p className="muted" style={{ fontSize: "1.1rem" }}>
          Convierte los cuadernos y el temario de la próxima prueba en una ruta de estudio guiada: repasa, practica con
          pistas y rinde un desafío final.
        </p>
        <Link href="/login" className="btn btn-block">Ingresar</Link>
        <Link href="/register" className="btn btn-secondary btn-block">Soy apoderado: crear cuenta</Link>
      </div>
    </main>
  );
}
