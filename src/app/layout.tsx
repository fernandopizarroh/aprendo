import type { ReactNode } from "react";
import "./globals.css";

export const metadata = { title: "Aprendo", description: "Rutas de aprendizaje con IA a partir de tus apuntes" };
export const viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
