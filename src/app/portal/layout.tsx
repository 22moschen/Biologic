import { Brand } from "@/components/brand";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Orientações do paciente",
  robots: { index: false, follow: false },
};
export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="border-b border-border bg-white">
        <div className="container py-5">
          <Brand />
        </div>
      </header>
      <main id="conteudo" className="container max-w-3xl py-10">
        {children}
      </main>
      <footer className="container max-w-3xl py-6 text-xs muted">
        BioLogic · Projeto acadêmico. Conteúdos demonstrativos não substituem
        orientação profissional.
      </footer>
    </>
  );
}
