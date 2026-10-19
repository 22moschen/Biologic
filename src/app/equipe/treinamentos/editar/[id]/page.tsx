import {notFound} from "next/navigation";
import {requireActor} from "@/server/auth";
import {db} from "@/server/db";
import {trainingSchema} from "@/lib/domain";
import {TrainingEditor} from "@/components/training";
import {Card} from "@/components/ui/card";
export default async function Edit({params}:{params:Promise<{id:string}>}){const a=await requireActor();if(a.role!=="ADMINISTRADOR")return <p role="alert" className="notice error">Acesso restrito à administração.</p>;const {id}=await params;const m=id==="novo"?null:await db.trainingModule.findFirst({where:{id,laboratoryId:a.laboratoryId},include:{versions:{orderBy:{version:"desc"},take:1}}});if(id!=="novo"&&!m)notFound();const v=m?.versions[0];return <><h1 className="mb-7">{m?"Editar treinamento":"Novo treinamento"}</h1><Card><TrainingEditor initial={m&&v?{id:m.id,published:m.published,data:trainingSchema.parse({title:m.title,summary:v.summary,content:v.content,questions:v.questions})}:undefined}/></Card></>;}
