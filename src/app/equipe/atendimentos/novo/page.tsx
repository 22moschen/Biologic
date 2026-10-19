import {requireActor} from "@/server/auth";
import {db} from "@/server/db";
import {AttendanceForm} from "@/components/forms";
import {Card} from "@/components/ui/card";
export default async function NewAttendance({searchParams}:{searchParams:Promise<{paciente?:string}>}){const a=await requireActor();const {paciente}=await searchParams;const [patients,exams]=await Promise.all([db.patient.findMany({where:{laboratoryId:a.laboratoryId},select:{id:true,name:true},orderBy:{name:"asc"}}),db.exam.findMany({where:{laboratoryId:a.laboratoryId,active:true},select:{id:true,name:true},orderBy:{name:"asc"}})]);return <><span className="eyebrow">Registro guiado</span><h1 className="mt-3 mb-7">Novo atendimento</h1><Card><AttendanceForm patients={patients} exams={exams} patientId={paciente}/></Card></>;}
