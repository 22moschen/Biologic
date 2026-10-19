export const dynamic = "force-dynamic";
import Link from "next/link";
import { Brand } from "@/components/brand";
import { Card } from "@/components/ui/card";
import { LoginForm } from "@/components/login-form";
import { ShieldCheck, ArrowLeft } from "lucide-react";
export default function Login() {
  return (
    <main
      id="conteudo"
      className="container grid min-h-screen items-center gap-12 py-12 md:grid-cols-2"
    >
      <div className="max-w-lg">
        <Brand />
        <span className="eyebrow mt-14 block">Central da equipe</span>
        <h1 className="mt-4">
          Conhecimento para orientar.
          <br />
          <span className="text-primary">Cuidado para acolher.</span>
        </h1>
        <p className="mt-6 text-base muted">
          Treinamentos, pacientes e conferência pré-analítica em um só lugar.
        </p>
        <p className="mt-8 flex items-center gap-2 text-sm">
          <ShieldCheck size={20} /> Ambiente de acesso restrito à equipe.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex items-center gap-2 text-sm text-primary"
        >
          <ArrowLeft size={16} /> Voltar ao início
        </Link>
      </div>
      <Card className="w-full max-w-md justify-self-center p-8">
        <span className="eyebrow">Bem-vinda à BioLogic</span>
        <h2 className="mt-3">Acesse sua conta</h2>
        <p className="mt-3 text-sm muted">
          Use as credenciais fornecidas pela administração.
        </p>
        <LoginForm
          configured={
            !!process.env.DATABASE_URL && !!process.env.NEXTAUTH_SECRET
          }
        />
        <p className="mt-6 text-xs muted">
          Não há cadastro público. Para recuperar o acesso, procure a
          administração do laboratório.
        </p>
      </Card>
    </main>
  );
}
