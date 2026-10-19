import Link from "next/link";
import { BookOpen, ArrowRight } from "lucide-react";
import { requirePageActor as requireActor } from "@/server/auth";
import { db } from "@/server/db";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
export default async function Trainings() {
  const a = await requireActor();
  const modules = await db.trainingModule.findMany({
    where: {
      laboratoryId: a.laboratoryId,
      ...(a.role !== "ADMINISTRADOR" ? { published: true } : {}),
    },
    include: {
      versions: {
        orderBy: { version: "desc" },
        take: 1,
        include: { progress: { where: { userId: a.id } } },
      },
    },
    orderBy: { title: "asc" },
  });
  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">Aprender para acolher</span>
          <h1 className="mt-3">Central de treinamentos</h1>
          <p className="mt-3 muted">
            Conteúdos curtos para um atendimento mais cuidadoso.
          </p>
        </div>
        {a.role === "ADMINISTRADOR" && (
          <Button asChild>
            <Link href="/equipe/treinamentos/editar/novo">Criar módulo</Link>
          </Button>
        )}
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        {modules.map((m, i) => {
          const v = m.versions[0];
          const p = v?.progress[0];
          return (
            <Card key={m.id}>
              <div className="mb-5 flex items-center justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted">
                  <BookOpen size={22} />
                </span>
                <span className="badge">
                  {!m.published
                    ? "Rascunho"
                    : p?.completedAt
                      ? "Concluído"
                      : p
                        ? "Em andamento"
                        : "Não iniciado"}
                </span>
              </div>
              <p className="eyebrow mb-2">
                Módulo {i + 1} · Versão {m.currentVersion}
              </p>
              <h2 className="text-xl">{m.title}</h2>
              <p className="mt-3 text-sm muted">{v?.summary}</p>
              <div className="mt-6 flex flex-wrap items-center gap-5">
                {m.published && (
                  <Link
                    href={`/equipe/treinamentos/${m.id}`}
                    className="flex items-center gap-2 text-sm font-semibold text-primary"
                  >
                    Acessar módulo
                    <ArrowRight size={16} />
                  </Link>
                )}
                {a.role === "ADMINISTRADOR" && (
                  <Link
                    href={`/equipe/treinamentos/editar/${m.id}`}
                    className="text-sm underline"
                  >
                    Editar conteúdo
                  </Link>
                )}
              </div>
            </Card>
          );
        })}
      </div>
      {!modules.length && (
        <p className="notice">Nenhum treinamento publicado.</p>
      )}
    </>
  );
}
