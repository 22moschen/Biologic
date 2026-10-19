import { z } from "zod";
import { formatInTimeZone } from "date-fns-tz";
export class DomainError extends Error {}
export const zone = "America/Sao_Paulo";
export const displayDate = (date: Date | string, pattern = "dd/MM/yyyy HH:mm") => formatInTimeZone(new Date(date), zone, pattern);
export const birthDisplay = (date: Date | string) => new Date(date).toISOString().slice(0,10).split("-").reverse().join("/");
export function validCpf(value: string) {
 const cpf=value.replace(/\D/g, "");
 if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
 for(let t=9;t<11;t++){let sum=0;for(let i=0;i<t;i++) sum+=Number(cpf[i])*(t+1-i); const digit=(sum*10)%11%10;if(digit!==Number(cpf[t])) return false;}
 return true;
}
export const patientSchema=z.object({
 name:z.string().trim().min(3,"Informe o nome completo.").max(160),
 birthDate:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>{const d=new Date(v+"T00:00:00Z");return !isNaN(+d)&&d.toISOString().slice(0,10)===v&&v<=formatInTimeZone(new Date(),zone,"yyyy-MM-dd")&&v>="1900-01-01"},"Data de nascimento inválida ou futura."),
 cpf:z.string().transform(v=>v.replace(/\D/g,"")).refine(v=>!v||validCpf(v),"CPF inválido."),
 phone:z.string().trim().refine(v=>!v||/^\+?[\d ()-]{8,22}$/.test(v),"Telefone inválido."),
 email:z.union([z.email(),z.literal("")])
});
export const questionSchema=z.object({id:z.string().regex(/^[a-zA-Z0-9_-]{1,60}$/),text:z.string().trim().min(3).max(500),help:z.string().max(500).default(""),required:z.boolean(),type:z.enum(["YES_NO","SINGLE","TEXT"]),options:z.array(z.string().min(1).max(200)).max(20).default([]),pendingValues:z.array(z.string()).default([])}).superRefine((q,c)=>{
 const options=q.type==="YES_NO"?["Sim","Não"]:q.options;
 if(q.type==="SINGLE"&&(options.length<2||new Set(options).size!==options.length))c.addIssue({code:"custom",message:"Escolha única exige opções distintas."});
 if(q.type==="TEXT"&&q.pendingValues.length)c.addIssue({code:"custom",message:"Texto livre não gera pendência automática."});
 if(q.type!=="TEXT"&&q.pendingValues.some(v=>!options.includes(v)))c.addIssue({code:"custom",message:"Pendência deve corresponder a uma opção."});
});
export const examContentSchema=z.object({name:z.string().min(3).max(120),description:z.string().max(3000),preparation:z.string().max(3000),collection:z.string().max(3000),storage:z.string().max(3000),material:z.string().max(500),notes:z.string().max(2000).default(""),color:z.string().regex(/^#[0-9a-fA-F]{6}$/).or(z.literal("")).default(""),state:z.enum(["DEMONSTRATIVO","REVISADO"]),reviewer:z.string().max(120).default(""),reviewedAt:z.string().default(""),questions:z.array(questionSchema).max(30)}).superRefine((v,c)=>{
 if(new Set(v.questions.map(q=>q.id)).size!==v.questions.length)c.addIssue({code:"custom",message:"IDs de perguntas devem ser únicos."});
 if(v.state==="REVISADO"&&(!v.reviewer.trim()||!/^\d{4}-\d{2}-\d{2}$/.test(v.reviewedAt)||isNaN(Date.parse(v.reviewedAt))))c.addIssue({code:"custom",message:"Conteúdo revisado exige revisor e data válida."});
});
export type ExamContent=z.infer<typeof examContentSchema>;
export type Question=z.infer<typeof questionSchema>;
export type Actor={id:string;laboratoryId:string;role:"ADMINISTRADOR"|"ATENDENTE";sessionVersion:number};
export function assertAdmin(actor:Actor){if(actor.role!=="ADMINISTRADOR")throw new DomainError("Acesso restrito à administração.");}
export function assertLaboratory(actor:Actor, laboratoryId:string){if(actor.laboratoryId!==laboratoryId)throw new DomainError("Registro não encontrado.");}
export function evaluate(questions: (Question & {key:string})[], answers:Record<string,string>){
 const missing:string[]=[],divergent:{key:string;value:string;text:string}[]=[];
 for(const q of questions){const v=answers[q.key]?.trim()??"";if(q.required&&!v)missing.push(q.key);
 const opts=q.type==="YES_NO"?["Sim","Não"]:q.options;
 if(v&&q.type!=="TEXT"&&!opts.includes(v))throw new DomainError("Resposta fora das opções disponíveis.");
 if(v.length>2000)throw new DomainError("Resposta muito longa.");
 if(q.type!=="TEXT"&&q.pendingValues.includes(v))divergent.push({key:q.key,value:v,text:q.text});}
 return {missing,divergent};
}
export function assertCompletable(missing:string[],openIssues:number){if(missing.length)throw new DomainError("Responda todas as perguntas obrigatórias.");if(openIssues)throw new DomainError("Resolva as pendências antes de concluir.");}
export const trainingQuestionSchema=z.object({id:z.string().min(1),text:z.string().min(3),options:z.array(z.string().min(1)).min(2).max(6),correctIndex:z.number().int().min(0),explanation:z.string().min(3)}).refine(q=>q.correctIndex<q.options.length,"Gabarito inválido.");
export const trainingSchema=z.object({title:z.string().min(3).max(160),summary:z.string().min(3).max(500),content:z.string().min(10).max(15000),questions:z.array(trainingQuestionSchema).length(3)}).refine(v=>new Set(v.questions.map(q=>q.id)).size===3,"IDs de perguntas devem ser únicos.");
export function grade(questions:z.infer<typeof trainingQuestionSchema>[],answers:number[]){
 if(answers.length!==questions.length||answers.some((v,i)=>!Number.isInteger(v)||v<0||v>=questions[i].options.length))throw new DomainError("Responda todas as perguntas da avaliação.");
 const correct=questions.filter((q,i)=>q.correctIndex===answers[i]).length;
 return {correct,total:questions.length,passed:correct*100>=questions.length*70};
}
export const maskCpf=(v:string|null)=>v?`***.***.${v.slice(6,9)}-**`:"Não informado";
export const statusLabel={EM_PREENCHIMENTO:"Em preenchimento",COM_PENDENCIA:"Com pendência",CONFERENCIA_CONCLUIDA:"Conferência concluída"};
export function tokenValid(t:{expiresAt:Date;revokedAt:Date|null}|null,now=new Date()){return !!t&&!t.revokedAt&&t.expiresAt>now;}
