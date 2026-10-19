"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="conteudo" className="container py-20">
      <h1>Não foi possível carregar.</h1>
      <p className="my-5 muted">
        Tente novamente. Se o problema continuar, verifique a configuração do
        banco e procure a administração.
      </p>
      <Button onClick={reset}>Tentar novamente</Button>
    </main>
  );
}
