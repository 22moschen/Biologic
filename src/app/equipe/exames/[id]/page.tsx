import { notFound } from "next/navigation";
import { requirePageActor as requireActor } from "@/server/auth";
import { db } from "@/server/db";
import { examContentSchema } from "@/lib/domain";
import { ExamEditor } from "@/components/forms";
import { Card } from "@/components/ui/card";
export default async function Editor({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const a = await requireActor();
  if (a.role !== "ADMINISTRADOR")
    return (
      <p role="alert" className="notice error">
        Acesso restrito à administração.
      </p>
    );
  const { id } = await params;
  const e =
    id === "novo"
      ? null
      : await db.exam.findFirst({
          where: { id, laboratoryId: a.laboratoryId },
          include: { versions: { orderBy: { version: "desc" }, take: 1 } },
        });
  if (id !== "novo" && !e) notFound();
  return (
    <>
      <h1 className="mb-7">{e ? "Editar exame" : "Cadastrar exame"}</h1>
      <Card>
        <ExamEditor
          initial={
            e
              ? {
                  id: e.id,
                  code: e.code,
                  category: e.category,
                  active: e.active,
                  content: examContentSchema.parse(e.versions[0].content),
                }
              : undefined
          }
        />
      </Card>
    </>
  );
}
