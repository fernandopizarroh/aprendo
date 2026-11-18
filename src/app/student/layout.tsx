import type { ReactNode } from "react";
import Link from "next/link";
import { LogoutButton } from "@/components/LogoutButton";

// Tema del alumno (colores más vivos). La experiencia de estudio se construye en el spec 04.
export default function StudentLayout({ children }: { children: ReactNode }) {
  return (
    <div data-theme="student" style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <header className="topbar">
        <div className="topbar-inner">
          <Link href="/student" className="brand">Aprendo</Link>
          <LogoutButton />
        </div>
      </header>
      <main className="container">{children}</main>
    </div>
  );
}
