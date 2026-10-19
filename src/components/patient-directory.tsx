"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { searchPatients } from "@/app/equipe/pacientes/actions";
import { birthDisplay } from "@/lib/domain";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
type Results = {
  rows: { id: string; name: string; birthDate: string; cpf: string }[];
  count: number;
  page: number;
};
export function PatientDirectory({ initial }: { initial: Results }) {
  const [results, setResults] = useState(initial),
    [query, setQuery] = useState(""),
    [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  const search = (page: number) =>
    start(async () => {
      const r = await searchPatients({ query, page });
      if (r.ok) {
        setResults(r.data);
        setMessage("");
      } else setMessage(r.error);
    });
  return (
    <>
      <form
        className="mb-6 flex gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          search(1);
        }}
      >
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          maxLength={160}
          placeholder="Buscar por nome ou CPF"
          aria-label="Buscar paciente"
        />
        <Button disabled={pending} variant="outline">
          {pending ? "Buscando…" : "Buscar"}
        </Button>
      </form>
      {message && (
        <p role="alert" className="notice error mb-5">
          {message}
        </p>
      )}
      <div className="table-wrap" aria-busy={pending}>
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Nascimento</th>
              <th>CPF</th>
              <th>Cadastro</th>
            </tr>
          </thead>
          <tbody>
            {results.rows.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{birthDisplay(p.birthDate)}</td>
                <td>{p.cpf}</td>
                <td>
                  <Link href={`/equipe/pacientes/${p.id}`}>Abrir →</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!results.rows.length && (
          <p className="empty">Nenhum paciente encontrado.</p>
        )}
      </div>
      <div className="mt-5 flex items-center justify-between gap-3 text-sm">
        <span>
          {results.count} pacientes · Página {results.page}
        </span>
        <div className="flex gap-2">
          {results.page > 1 && (
            <Button
              variant="ghost"
              disabled={pending}
              onClick={() => search(results.page - 1)}
            >
              Anterior
            </Button>
          )}
          {results.page * 20 < results.count && (
            <Button
              variant="ghost"
              disabled={pending}
              onClick={() => search(results.page + 1)}
            >
              Próxima
            </Button>
          )}
        </div>
      </div>
      <p className="mt-4 text-xs muted">
        A busca é enviada de forma privada ao servidor; o CPF não é incluído na
        URL.
      </p>
    </>
  );
}
