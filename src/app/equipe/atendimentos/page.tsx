import Link from "next/link";
import { AttendanceStatus } from "@prisma/client";
import { fromZonedTime } from "date-fns-tz";
import { requirePageActor as requireActor } from "@/server/auth";
import { db } from "@/server/db";
import {
  displayDate,
  statusLabel,
  zone,
  examContentSchema,
} from "@/lib/domain";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
export default async function Attendances({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    date?: string;
    page?: string;
  }>;
}) {
  const a = await requireActor();
  const { q = "", status = "", date = "", page = "1" } = await searchParams;
  const n = Math.max(1, Math.min(10000, Number(page) || 1));
  const validDate =
    /^\d{4}-\d{2}-\d{2}$/.test(date) && !isNaN(Date.parse(date));
  const where = {
    laboratoryId: a.laboratoryId,
    ...(q
      ? {
          patient: {
            name: { contains: q.slice(0, 160), mode: "insensitive" as const },
          },
        }
      : {}),
    ...(status in statusLabel ? { status: status as AttendanceStatus } : {}),
    ...(validDate
      ? {
          createdAt: {
            gte: fromZonedTime(`${date}T00:00:00`, zone),
            lte: fromZonedTime(`${date}T23:59:59.999`, zone),
          },
        }
      : {}),
  };
  const [rows, count] = await Promise.all([
    db.attendance.findMany({
      where,
      include: { patient: true, exams: true },
      orderBy: { createdAt: "desc" },
      skip: (n - 1) * 20,
      take: 20,
    }),
    db.attendance.count({ where }),
  ]);
  const query = new URLSearchParams({ q, status, date });
  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">Registro e conferência</span>
          <h1 className="mt-3">Atendimentos</h1>
        </div>
        <Button asChild>
          <Link href="/equipe/atendimentos/novo">Novo atendimento</Link>
        </Button>
      </div>
      <form className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Input
          name="q"
          defaultValue={q}
          placeholder="Nome do paciente"
          aria-label="Paciente"
        />
        <select name="status" defaultValue={status} aria-label="Status">
          <option value="">Todos os status</option>
          {Object.entries(statusLabel).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <Input
          type="date"
          name="date"
          defaultValue={date}
          aria-label="Data do atendimento"
        />
        <Button variant="outline">Filtrar</Button>
      </form>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Identificador / Paciente</th>
              <th>Data</th>
              <th>Exames</th>
              <th>Status</th>
              <th>Ação</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((x) => (
              <tr key={x.id}>
                <td>
                  <small className="muted">{x.publicId.slice(0, 8)}</small>
                  <br />
                  {x.patient.name}
                </td>
                <td>{displayDate(x.createdAt)}</td>
                <td>
                  {x.exams
                    .map((e) => examContentSchema.parse(e.snapshot).name)
                    .join(", ")}
                </td>
                <td>
                  <span
                    className={`badge ${x.status === "COM_PENDENCIA" ? "badge-warning" : ""}`}
                  >
                    {statusLabel[x.status]}
                  </span>
                </td>
                <td>
                  <Link href={`/equipe/atendimentos/${x.id}`}>Abrir →</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && (
          <p className="empty">Nenhum atendimento encontrado.</p>
        )}
      </div>
      <div className="mt-5 flex justify-between">
        <span>
          {count} registros · Página {n}
        </span>
        <div className="flex gap-4">
          {n > 1 && <Link href={`?${query}&page=${n - 1}`}>Anterior</Link>}
          {n * 20 < count && (
            <Link href={`?${query}&page=${n + 1}`}>Próxima</Link>
          )}
        </div>
      </div>
    </>
  );
}
