import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "BioLogic · Informação e cuidado",
    template: "%s | BioLogic",
  },
  description:
    "Apoio à fase pré-analítica: capacitação, registro guiado e orientação. Projeto acadêmico.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <a href="#conteudo" className="skip-link">
          Pular para o conteúdo
        </a>
        {children}
      </body>
    </html>
  );
}
