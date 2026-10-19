import {notFound} from "next/navigation";
import Link from "next/link";
import {PublicHeader,PublicFooter} from "@/components/public-shell";
import {Orientations} from "@/components/orientations";
import {db,databaseConfigured} from "@/server/db";
import {examContentSchema} from "@/lib/domain";
export const dynamic="force-dynamic";
export default async function Exam({params}:{params:Promise<{id:string}>}){const {id}=await params;if(!databaseConfigured())notFound();const e=await db.exam.findFirst({where:{id,active:true,laboratory:{slug:"biologic-academico"}},include:{versions:{orderBy:{version:"desc"},take:1}}});if(!e)notFound();return <><PublicHeader/><main id="conteudo" className="container max-w-3xl py-12"><Link href="/exames" className="text-sm text-primary">← Todos os exames</Link><h1 className="mt-6 mb-5">{e.name}</h1><div className="rounded-2xl border border-border bg-white p-7"><Orientations content={examContentSchema.parse(e.versions[0].content)}/><p className="mt-8 text-xs muted">Versão {e.currentVersion}. As orientações específicas do seu atendimento podem corresponder a uma versão anterior.</p></div></main><PublicFooter/></>;}
