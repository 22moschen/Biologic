import Link from "next/link";
import { Brand } from "./brand";
import { Button } from "./ui/button";
import { ArrowUpRight, Heart } from "lucide-react";
export function PublicHeader(){return <header className="border-b border-border bg-white"><div className="container flex flex-wrap items-center justify-between gap-4 py-5"><Brand/><nav className="flex items-center gap-5 text-sm" aria-label="Menu principal"><Link href="/exames">Exames e orientações</Link><Link href="/#duvidas" className="hidden sm:block">Dúvidas frequentes</Link><Button asChild variant="outline"><Link href="/entrar">Área da equipe <ArrowUpRight size={16}/></Link></Button></nav></div></header>;}
export function PublicFooter(){return <footer className="mt-16 bg-foreground py-9 text-white"><div className="container flex flex-wrap items-center justify-between gap-6"><Brand light/><p className="max-w-sm text-xs leading-6 text-white/75">Projeto acadêmico · Experiência Aplicada<br/>Conteúdos demonstrativos, pendentes de revisão profissional.</p><span className="flex items-center gap-2 text-sm"><Heart size={18}/> Mais informação. Mais cuidado.</span></div></footer>;}
