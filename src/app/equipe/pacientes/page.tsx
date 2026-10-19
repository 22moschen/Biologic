import Link from "next/link";
import { Plus } from "lucide-react";
import { requirePageActor } from "@/server/auth";
import { findPatients } from "@/server/patient-search";
import { Button } from "@/components/ui/button";
import { PatientDirectory } from "@/components/patient-directory";
export default async function Patients() {
  const a = await requirePageActor();
  const initial = await findPatients(a, { query: "", page: 1 });
  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">Cuidado desde a identificação</span>
          <h1 className="mt-3">Pacientes</h1>
        </div>
        <Button asChild>
          <Link href="/equipe/pacientes/novo">
            <Plus size={17} />
            Cadastrar paciente
          </Link>
        </Button>
      </div>
      <PatientDirectory initial={initial} />
    </>
  );
}
