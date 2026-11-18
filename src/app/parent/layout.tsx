import type { ReactNode } from "react";
import { ParentNav } from "@/components/ParentNav";

export default function ParentLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <ParentNav />
      <main className="container">{children}</main>
    </>
  );
}
