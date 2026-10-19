import { requireActor } from "@/server/auth";
import { db } from "@/server/db";
import { displayDate } from "@/lib/domain";
import { UserForm } from "@/components/forms";
import { Card } from "@/components/ui/card";
export default async function Admin() {
  const a = await requireActor();
  if (a.role !== "ADMINISTRADOR")
    return (
      <p className="notice error" role="alert">
        Acesso restrito à administração.
      </p>
    );
  const [users, modules, audits] = await Promise.all([
    db.user.findMany({
      where: { laboratoryId: a.laboratoryId },
      select: { id: true, name: true, email: true, role: true, active: true },
      orderBy: { name: "asc" },
    }),
    db.trainingModule.findMany({
      where: { laboratoryId: a.laboratoryId },
      include: {
        versions: {
          orderBy: { version: "desc" },
          take: 1,
          include: {
            progress: { include: { user: { select: { name: true } } } },
          },
        },
      },
    }),
    db.auditEvent.findMany({
      where: { laboratoryId: a.laboratoryId },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
  ]);
  return (
    <>
      <h1 className="mb-7">Administração</h1>
      <h2 className="mb-5 text-xl">Equipe e permissões</h2>
      <div className="space-y-4">
        {users.map((u) => (
          <details
            key={u.id}
            className="rounded-2xl border border-border bg-white p-5"
          >
            <summary className="font-semibold">
              {u.name} · {u.role} · {u.active ? "Ativa" : "Desativada"}
            </summary>
            <div className="mt-5">
              <UserForm user={u} />
            </div>
          </details>
        ))}
      </div>
      <details className="mt-5 rounded-2xl border border-border bg-white p-5">
        <summary className="font-semibold">Criar conta da equipe</summary>
        <div className="mt-5">
          <UserForm />
        </div>
      </details>
      <h2 className="mt-10 mb-5 text-xl">
        Progresso dos treinamentos (versão atual)
      </h2>
      <div className="space-y-4">
        {modules.map((m) => (
          <Card key={m.id}>
            <h3>
              {m.title} · v{m.currentVersion}
            </h3>
            <ul className="mt-4 space-y-2">
              {users.map((u) => {
                const p = m.versions[0]?.progress.find(
                  (p) => p.userId === u.id,
                );
                return (
                  <li className="flex justify-between gap-3 text-sm" key={u.id}>
                    <span>{u.name}</span>
                    <span className="badge">
                      {p?.completedAt
                        ? "Concluído"
                        : p
                          ? "Em andamento"
                          : "Não iniciado"}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Card>
        ))}
      </div>
      <h2 className="mt-10 mb-5 text-xl">Histórico recente</h2>
      <Card>
        <ul className="space-y-3">
          {audits.map((x) => (
            <li key={x.id} className="border-b border-border pb-3 text-xs">
              {displayDate(x.createdAt)} · {x.action}
              <br />
              <span className="muted">
                Responsável:{" "}
                {users.find((u) => u.id === x.actorId)?.name ?? "Sistema"} ·
                Registro {x.entityId.slice(-8)}
              </span>
            </li>
          ))}
        </ul>
        {!audits.length && <p>Nenhuma ação registrada.</p>}
      </Card>
    </>
  );
}
