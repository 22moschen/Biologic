"use server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireActor } from "@/server/auth";
import { DomainError } from "@/lib/domain";
import * as service from "@/server/services";
const operations=["patient","exam","attendance","checklist","resolve","reopen","access","revoke","user","training","attempt"] as const;
export async function perform(operation:typeof operations[number],payload:unknown):Promise<{ok:true;data:unknown}|{ok:false;error:string}>{
 try{
 if(!operations.includes(operation))throw new DomainError("Operação inválida.");
 const a=await requireActor();let data:unknown;
 switch(operation){
 case "patient":{const p=z.object({id:z.string().optional(),data:z.unknown()}).parse(payload);data=await service.savePatient(a,p.data,p.id);break;}
 case "exam":data=await service.saveExam(a,payload);break;
 case "attendance":data=await service.createAttendance(a,payload);break;
 case "checklist":data=await service.saveChecklist(a,payload);break;
 case "resolve":data=await service.resolveIssue(a,payload);break;
 case "reopen":data=await service.reopenAttendance(a,payload);break;
 case "access":data=await service.issuePatientAccess(a,z.string().parse(payload));break;
 case "revoke":data=await service.issuePatientAccess(a,z.string().parse(payload),true);break;
 case "user":data=await service.saveUser(a,payload);break;
 case "training":data=await service.saveTraining(a,payload);break;
 case "attempt":data=await service.submitTraining(a,payload);break;
 }
 revalidatePath("/equipe","layout");revalidatePath("/exames","layout");return {ok:true,data};
 }catch(e){
 if(e instanceof z.ZodError)return {ok:false,error:e.issues[0]?.message??"Dados inválidos."};
 if(e instanceof DomainError)return {ok:false,error:e.message};
 if(e instanceof Prisma.PrismaClientKnownRequestError&&e.code==="P2002")return {ok:false,error:"Já existe um registro com esse CPF, e-mail, código ou solicitação. Atualize a página."};
 return {ok:false,error:"Não foi possível salvar. Verifique a conexão e tente novamente."};
 }
}
