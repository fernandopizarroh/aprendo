"use client";

export function LogoutButton({ className = "btn btn-secondary btn-small" }: { className?: string }) {
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }
  return (
    <button type="button" className={className} onClick={logout}>
      Cerrar sesión
    </button>
  );
}
