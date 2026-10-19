import { notFound } from "next/navigation";
import Link from "next/link";
import { requireActor } from "@/server/auth";
import { db } from "@/server/db";
import {
  examContentSchema,
  displayDate,
  statusLabel,
  birthDisplay,
} from "@/lib/domain";
import {
  ChecklistForm,
  JustificationForm,
  AccessControls,
} from "@/components/forms";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
export default async function AttendanceDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requireActor();
  const { id } = await params;
  const a = await db.attendance.findFirst({
    where: { id, laboratoryId: actor.laboratoryId },
    include: { patient: true, exams: true, answers: true, issues: true },
  });
  if (!a) notFound();
  const history = await db.auditEvent.findMany({
    where: { laboratoryId: actor.laboratoryId, entityId: id },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">Atendimento {a.publicId.slice(0, 8)}</span>
          <h1 className="mt-3">{a.patient.name}</h1>
          <p className="mt-3 text-sm muted">
            Nascimento: {birthDisplay(a.patient.birthDate)} ·{" "}
            {displayDate(a.createdAt)}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/equipe/atendimentos/${id}/protocolo`}>
            Ver protocolo
          </Link>
        </Button>
      </div>
      <span
        className={`badge mb-6 ${a.status === "COM_PENDENCIA" ? "badge-warning" : ""}`}
      >
        {statusLabel[a.status]}
      </span>
      {a.issues.length > 0 && (
        <Card className="mb-6">
          <h2 className="text-xl">Pendências da conferência</h2>
          {a.issues.map((i) => (
            <div key={i.id} className="mt-5 border-t border-border pt-5">
              <p className="font-semibold">{i.question}</p>
              <p className="text-sm muted">
                Resposta original: {i.originalAnswer}
              </p>
              {i.resolvedAt ? (
                <p className="notice mt-3">
                  Resolvida em {displayDate(i.resolvedAt)} · {i.justification}
                </p>
              ) : (
                <>
                  <span className="badge badge-warning mt-3">Aberta</span>
                  {actor.role === "ADMINISTRADOR" ? (
                    <JustificationForm
                      operation="resolve"
                      payload={{ attendanceId: id, issueId: i.id }}
                      label="Resolver pendência"
                    />
                  ) : (
                    <p className="mt-3 text-sm muted">
                      A resolução exige uma administradora e justificativa.
                    </p>
                  )}
                </>
              )}
            </div>
          ))}
        </Card>
      )}
      <ChecklistForm
        key={a.revision}
        id={id}
        revision={a.revision}
        groups={a.exams.map((e) => ({
          id: e.id,
          content: examContentSchema.parse(e.snapshot),
        }))}
        answers={Object.fromEntries(
          a.answers.map((v) => [v.questionKey, v.value]),
        )}
        readonly={a.status === "CONFERENCIA_CONCLUIDA"}
      />
      {a.status === "CONFERENCIA_CONCLUIDA" &&
        actor.role === "ADMINISTRADOR" && (
          <Card className="mt-6">
            <h3>Reabrir conferência</h3>
            <JustificationForm
              operation="reopen"
              payload={{ id }}
              label="Reabrir atendimento"
            />
          </Card>
        )}
      <AccessControls id={id} publicId={a.publicId} />
      <details className="mt-8 rounded-2xl border border-border bg-white p-6">
        <summary className="font-semibold">Histórico das ações</summary>
        <ul className="mt-5 space-y-3">
          {history.map((h) => (
            <li key={h.id} className="text-xs muted">
              {displayDate(h.createdAt)} · {h.action} · Responsável:{" "}
              {h.actorId.slice(-8)}
            </li>
          ))}
        </ul>
      </details>
    </>
  );
}
