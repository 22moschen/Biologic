import Link from "next/link";
import {requireActor} from "@/server/auth";
import {assertAdmin} from "@/lib/domain";
import {db} from "@/server/db";
import {Button} from "@/components/ui/button";
export default async function Exams(){const a=await requireActor();if(a.role!=="ADMINISTRADOR")return <div className="notice error" role="alert">Acesso restrito à administração.</div>;assertAdmin(a);const exams=await db.exam.findMany({where:{laboratoryId:a.laboratoryId},orderBy:{name:"asc"}});return <><div className="page-head"><h1>Exames e checklists</h1><Button asChild><Link href="/equipe/exames/novo">Cadastrar exame</Link></Button></div><p className="notice mb-6">Edições criam versões. As orientações e regras dos atendimentos anteriores são preservadas.</p><div className="table-wrap"><table><thead><tr><th>Exame</th><th>Código</th><th>Versão</th><th>Estado</th><th>Ação</th></tr></thead><tbody>{exams.map(e=><tr key={e.id}><td>{e.name}</td><td>{e.code}</td><td>{e.currentVersion}</td><td>{e.active?"Ativo":"Inativo"}</td><td><Link href={`/equipe/exames/${e.id}`}>Editar</Link></td></tr>)}</tbody></table>{!exams.length&&<p className="empty">Nenhum exame cadastrado.</p>}</div></>;}
