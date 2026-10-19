import Link from "next/link";
import { Microscope } from "lucide-react";
export function Brand({ light = false }: { light?: boolean }) {
  return (
    <Link
      href="/"
      className={`inline-flex items-center gap-2 ${light ? "text-white" : "text-foreground"}`}
      aria-label="BioLogic — início"
    >
      <Microscope className="h-9 w-9 text-[#4da78b]" strokeWidth={1.6} />
      <span className="text-2xl font-bold tracking-tight">
        Bio
        <span className={light ? "text-[#A7D7C5]" : "text-primary"}>Logic</span>
      </span>
    </Link>
  );
}
