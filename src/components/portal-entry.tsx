"use client";
import {useState,useTransition} from "react";
import {useRouter} from "next/navigation";
import {exchangeToken} from "@/app/portal/actions";
import {Button} from "./ui/button";
export function PortalEntry(){const router=useRouter();const [message,setMessage]=useState("");const [pending,start]=useTransition();return <><p className="my-5 muted">Seu link é pessoal e permite consultar apenas as orientações do atendimento informado pela equipe.</p>{message&&<p role="alert" className="notice error mb-5">{message}</p>}<Button disabled={pending} className="w-full" onClick={()=>{const token=window.location.hash.slice(1);window.history.replaceState(null,"","/portal/acesso");start(async()=>{const r=await exchangeToken(token);if(r.ok)router.replace("/portal/meu-atendimento");else setMessage(r.error??"Acesso indisponível.");});}}>{pending?"Validando acesso…":"Acessar minhas orientações"}</Button><p className="mt-5 text-xs muted">Se o link expirou ou já foi revogado, solicite outro à equipe. Nenhum CPF é necessário.</p></>;}
