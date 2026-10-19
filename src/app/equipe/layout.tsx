import {redirect} from "next/navigation";
import {requireActor} from "@/server/auth";
import {db} from "@/server/db";
import {TeamNav} from "@/components/team-nav";
export const dynamic="force-dynamic";
export const metadata={robots:{index:false,follow:false}};
export default async function TeamLayout({children}:{children:React.ReactNode}){let actor;try{actor=await requireActor();}catch{redirect("/entrar");}const user=await db.user.findUniqueOrThrow({where:{id:actor.id},include:{laboratory:true}});return <><TeamNav admin={actor.role==="ADMINISTRADOR"} name={user.name}/><div className="lg:ml-64"><header className="no-print border-b border-border bg-white px-6 py-4 text-xs muted md:px-10">{user.laboratory.name}<span className="ml-3 badge">Projeto acadêmico</span></header><main id="conteudo" className="mx-auto max-w-6xl px-5 py-8 md:px-10">{children}</main></div></>;}
