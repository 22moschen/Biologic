export const dynamic = "force-dynamic";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCheck,
  ClipboardList,
  ShieldCheck,
  FlaskConical,
  HeartHandshake,
  CircleHelp,
  Leaf,
  Users,
} from "lucide-react";
import { PublicHeader, PublicFooter } from "@/components/public-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
export default function Home() {
  return (
    <>
      <PublicHeader />
      <main id="conteudo">
        <section className="hero-shape border-b border-border">
          <div className="container grid items-center gap-12 py-16 md:grid-cols-[1.1fr_1fr] md:py-24">
            <div>
              <span className="eyebrow flex items-center gap-2">
                <Leaf size={15} /> Informação que acolhe
              </span>
              <h1 className="mt-5 max-w-xl text-[clamp(2.5rem,4.7vw,4rem)]">
                Mais informação,
                <br />
                mais cuidado.
                <br />
                <span className="text-primary">Em cada etapa.</span>
              </h1>
              <p className="mt-6 max-w-lg text-base leading-8 muted">
                Orientações para pacientes, capacitação para a equipe e mais
                organização antes da coleta. Conheça o BioLogic.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild>
                  <Link href="/exames">
                    Sou paciente <ArrowRight size={17} />
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/entrar">Sou atendente</Link>
                </Button>
              </div>
              <p className="mt-6 flex items-center gap-2 text-xs muted">
                <ShieldCheck size={16} /> Informação, cuidado e qualidade
                laboratorial.
              </p>
            </div>
            <div className="relative">
              <div className="rounded-[2rem] border border-white bg-white/70 p-7 pb-16 shadow-sm md:p-9 md:pb-16">
                <div className="mb-7 flex items-center justify-between">
                  <span className="badge">Juntos, antes da coleta</span>
                  <FlaskConical className="text-primary" size={27} />
                </div>
                <div className="mb-8 flex h-28 items-center justify-center rounded-2xl bg-[#d8ede3]">
                  <HeartHandshake
                    size={76}
                    strokeWidth={1.1}
                    className="text-primary"
                  />
                </div>
                <h2>
                  O cuidado começa
                  <br />
                  com uma boa orientação.
                </h2>
                <p className="mt-4 muted">
                  Um caminho simples para conectar o laboratório ao paciente.
                </p>
                <div className="mt-7 space-y-3">
                  {[
                    "Entenda as orientações dos seus exames",
                    "Saiba quando procurar a equipe",
                    "Tenha as informações sempre à mão",
                  ].map((x) => (
                    <div key={x} className="flex items-center gap-3 text-sm">
                      <CheckCheck size={18} className="text-primary" />
                      {x}
                    </div>
                  ))}
                </div>
              </div>
              <div className="absolute -bottom-5 right-5 flex items-center gap-3 rounded-xl border border-border bg-white px-5 py-4 shadow-sm">
                <span className="rounded-full bg-muted p-2">
                  <HeartHandshake size={20} />
                </span>
                <span className="text-xs">
                  Informação clara.
                  <br />
                  <strong>Atendimento mais acolhedor.</strong>
                </span>
              </div>
            </div>
          </div>
        </section>
        <section className="container py-16">
          <div className="mb-8">
            <span className="eyebrow">Uma conexão, três cuidados</span>
            <h2 className="mt-3">Tudo começa antes da coleta.</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {[
              {
                icon: Users,
                title: "Para o paciente",
                text: "Consulte orientações gerais e acesse as informações do seu atendimento.",
                href: "/exames",
                cta: "Consultar orientações",
              },
              {
                icon: BookOpen,
                title: "Para quem atende",
                text: "Aprenda com conteúdos curtos, avaliações e materiais de apoio.",
                href: "/equipe/treinamentos",
                cta: "Acessar treinamentos",
              },
              {
                icon: ClipboardList,
                title: "Para o laboratório",
                text: "Organize atendimentos, confira informações e acompanhe pendências.",
                href: "/equipe",
                cta: "Acessar área da equipe",
              },
            ].map((x) => (
              <Card key={x.title}>
                <x.icon size={25} className="mb-5 text-primary" />
                <h3>{x.title}</h3>
                <p className="mt-3 text-sm muted">{x.text}</p>
                <Link
                  className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary"
                  href={x.href}
                >
                  {x.cta}
                  <ArrowRight size={16} />
                </Link>
              </Card>
            ))}
          </div>
        </section>
        <section
          id="duvidas"
          className="container grid gap-10 pb-10 md:grid-cols-2"
        >
          <div>
            <span className="eyebrow">Conte com a informação</span>
            <h2 className="mt-3 mb-6">Dúvidas frequentes</h2>
            {[
              [
                "Preciso de jejum para todos os exames?",
                "O preparo depende do exame. Confirme as orientações específicas com seu laboratório; não altere sua rotina sem orientação.",
              ],
              [
                "Posso parar meus medicamentos?",
                "Não interrompa medicamentos por conta própria. Encaminhe a dúvida à equipe responsável.",
              ],
              [
                "O que significa conferência concluída?",
                "Significa que o registro no sistema foi conferido. Não representa autorização clínica automática.",
              ],
              [
                "Como acesso meu atendimento?",
                "A equipe fornece um link individual com validade limitada. Caso expire, solicite um novo acesso.",
              ],
            ].map(([q, a]) => (
              <details key={q} className="border-b border-border py-4">
                <summary className="flex items-center justify-between gap-3 font-medium">
                  {q}
                  <CircleHelp size={16} />
                </summary>
                <p className="pt-3 text-sm muted">{a}</p>
              </details>
            ))}
          </div>
          <Card className="self-start bg-muted p-8">
            <HeartHandshake size={30} className="mb-5 text-primary" />
            <h2>Ainda tem alguma dúvida?</h2>
            <p className="mt-4 muted">
              Fale com a equipe do laboratório antes da coleta. Informação clara
              também é uma forma de cuidar.
            </p>
            {process.env.PUBLIC_CONTACT_EMAIL ||
            process.env.PUBLIC_CONTACT_PHONE ? (
              <div className="mt-5 space-y-2">
                {process.env.PUBLIC_CONTACT_EMAIL && (
                  <p>{process.env.PUBLIC_CONTACT_EMAIL}</p>
                )}
                {process.env.PUBLIC_CONTACT_PHONE && (
                  <p>{process.env.PUBLIC_CONTACT_PHONE}</p>
                )}
              </div>
            ) : (
              <p className="mt-5 rounded-xl bg-white p-4 text-sm">
                Os canais de contato do laboratório ainda não foram
                configurados.
              </p>
            )}
            <p className="mt-5 text-xs muted">
              Projeto acadêmico. As informações demonstrativas não substituem
              orientações profissionais.
            </p>
          </Card>
        </section>
      </main>
      <PublicFooter />
    </>
  );
}
