import {requireActor} from "@/server/auth";
import {PatientForm} from "@/components/forms";
import {Card} from "@/components/ui/card";
export default async function NewPatient(){await requireActor();return <><h1 className="mb-7">Cadastrar paciente</h1><Card><PatientForm/></Card></>;}
