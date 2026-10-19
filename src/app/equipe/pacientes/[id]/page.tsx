import { notFound } from "next/navigation";
import Link from "next/link";
import { requirePageActor as requireActor } from "@/server/auth";
import { db } from "@/server/db";
import { PatientForm } from "@/components/forms";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { displayDate, statusLabel } from "@/lib/domain";
export default async function PatientDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const a = await requireActor();
  const { id } = await params;
  const p = await db.patient.findFirst({
    where: { id, laboratoryId: a.laboratoryId },
    include: { attendances: { orderBy: { createdAt: "desc" }, take: 30 } },
  });
  if (!p) notFound();
  const duplicates = !p.cpf
    ? await db.patient.count({
        where: {
          laboratoryId: a.laboratoryId,
          id: { not: id },
          name: { equals: p.name, mode: "insensitive" },
          birthDate: p.birthDate,
        },
      })
    : 0;
  return (
    <>
      <div className="page-head">
        <h1>{p.name}</h1>
        <Button asChild>
          <Link href={`/equipe/atendimentos/novo?paciente=${id}`}>
            Novo atendimento
          </Link>
        </Button>
      </div>
      {duplicates > 0 && (
        <p className="notice mb-5">
          Possível duplicidade: {duplicates} outro(s) cadastro(s) com o mesmo
          nome e nascimento. Confira os registros; eles não foram unificados.
        </p>
      )}
      <Card>
        <PatientForm
          id={p.id}
          initial={{
            name: p.name,
            birthDate: p.birthDate.toISOString().slice(0, 10),
            cpf: p.cpf ?? "",
            phone: p.phone ?? "",
            email: p.email ?? "",
          }}
        />
      </Card>
      <h2 className="mt-8 mb-5">Histórico de atendimentos</h2>
      {p.attendances.length ? (
        <div className="space-y-3">
          {p.attendances.map((x) => (
            <Link
              key={x.id}
              href={`/equipe/atendimentos/${x.id}`}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-white p-4"
            >
              <span>{displayDate(x.createdAt)}</span>
              <span className="badge">{statusLabel[x.status]}</span>
            </Link>
          ))}
        </div>
      ) : (
        <p className="notice">Este paciente ainda não possui atendimentos.</p>
      )}
    </>
  );
}
