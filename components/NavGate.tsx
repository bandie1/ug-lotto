"use client";

import { usePathname } from "next/navigation";
import FloatingNav from "./FloatingNav";

export default function NavGate() {
  const pathname = usePathname();
  const hideOn = pathname.startsWith("/login") || pathname.startsWith("/admin");
  if (hideOn) return null;
  return <FloatingNav />;
}
