import { cookies } from "next/headers";
import { loadPatientPortal } from "@/server/patient-portal";
import { examContentSchema, displayDate } from "@/lib/domain";
import { Orientations } from "@/components/orientations";
import { Card } from "@/components/ui/card";
export default async function PatientPortal() {
  const session = (await cookies()).get("biologic-patient")?.value;
  const a = await loadPatientPortal(session);
  if (!a)
    return (
      <Card>
        <h1 className="text-2xl">Acesso indisponível</h1>
        <p className="mt-5 muted">
          Este acesso é inválido, expirou ou foi revogado. Solicite um novo link
          à equipe do laboratório.
        </p>
      </Card>
    );
  return (
    <>
      <span className="eyebrow">{a.laboratory.name}</span>
      <h1 className="mt-4">Olá, {a.patient.name.split(" ")[0]}.</h1>
      <p className="mt-4 muted">
        Aqui estão as orientações dos exames do seu atendimento. Em caso de
        dúvida, procure a equipe antes da coleta.
      </p>
      <p className="my-5 text-xs muted">
        Atendimento {a.publicId.slice(0, 8)} · Atualizado em{" "}
        {displayDate(a.updatedAt)} · Horário de Brasília
      </p>
      <div className="space-y-6">
        {a.exams.map((e) => {
          const content = examContentSchema.parse(e.snapshot);
          return (
            <Card key={e.id}>
              <h2 className="mb-5">{content.name}</h2>
              <Orientations content={content} />
            </Card>
          );
        })}
      </div>
      <div className="notice mt-6">
        Não interrompa medicamentos ou modifique seu preparo por conta própria.
        Confirme as informações com o laboratório.
      </div>
    </>
  );
}
