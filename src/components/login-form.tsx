"use client";
import {useState} from "react";
import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {z} from "zod";
import {signIn} from "next-auth/react";
import {Button} from "./ui/button";
import {Input} from "./ui/input";
const schema=z.object({email:z.email("Informe um e-mail válido."),password:z.string().min(1,"Informe a senha.")});
export function LoginForm({configured}:{configured:boolean}){const [error,setError]=useState("");const {register,handleSubmit,formState:{errors,isSubmitting}}=useForm<z.infer<typeof schema>>({resolver:zodResolver(schema)});
 return <form onSubmit={handleSubmit(async data=>{setError("");try{const r=await signIn("credentials",{...data,redirect:false});if(r?.ok)window.location.assign("/equipe");else setError("Acesso não autorizado. Confira os dados ou aguarde antes de tentar novamente.");}catch{setError("Não foi possível conectar. Tente novamente.");}})} className="mt-7"><div className="field"><label htmlFor="email">E-mail da equipe</label><Input id="email" type="email" autoComplete="username" {...register("email")}/>{errors.email&&<p className="text-xs text-red-700">{errors.email.message}</p>}</div><div className="field"><label htmlFor="password">Senha</label><Input id="password" type="password" autoComplete="current-password" {...register("password")}/>{errors.password&&<p className="text-xs text-red-700">{errors.password.message}</p>}</div>{error&&<p role="alert" className="notice error mb-4">{error}</p>}{!configured&&<p className="notice mb-4">A conexão Neon e o segredo da sessão ainda precisam ser configurados. O acesso ficará disponível após a configuração e a criação das contas.</p>}<Button className="w-full" disabled={!configured||isSubmitting}>{isSubmitting?"Verificando…":"Entrar na plataforma"}</Button></form>;
}
