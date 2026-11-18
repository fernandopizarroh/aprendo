"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "./LogoutButton";

const LINKS = [
  { href: "/parent/dashboard", label: "Panel" },
  { href: "/parent/students", label: "Alumnos" },
  { href: "/parent/subjects", label: "Asignaturas" },
  { href: "/parent/ai-setup", label: "Conectar IA" },
];

export function ParentNav() {
  const pathname = usePathname();
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link href="/parent/dashboard" className="brand">Aprendo</Link>
        <LogoutButton />
        <nav className="nav" aria-label="Principal" style={{ flexBasis: "100%" }}>
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} aria-current={pathname.startsWith(l.href) ? "page" : undefined}>
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
