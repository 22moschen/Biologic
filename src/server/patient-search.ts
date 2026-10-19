import "server-only";
import { z } from "zod";
import { db } from "./db";
import { maskCpf, type Actor } from "@/lib/domain";
export async function findPatients(actor: Actor, input: unknown) {
  const { query, page } = z
    .object({
      query: z.string().trim().max(160),
      page: z.number().int().min(1).max(10000),
    })
    .parse(input);
  const digits = query.replace(/\D/g, "");
  const where = {
    laboratoryId: actor.laboratoryId,
    ...(query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" as const } },
            ...(digits ? [{ cpf: { contains: digits } }] : []),
          ],
        }
      : {}),
  };
  const [rows, count] = await Promise.all([
    db.patient.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * 20,
      take: 20,
      select: { id: true, name: true, birthDate: true, cpf: true },
    }),
    db.patient.count({ where }),
  ]);
  return {
    rows: rows.map((p) => ({
      id: p.id,
      name: p.name,
      birthDate: p.birthDate.toISOString(),
      cpf: maskCpf(p.cpf),
    })),
    count,
    page,
  };
}
