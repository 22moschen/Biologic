import { beforeEach, it, expect, vi } from "vitest";
const { findMany, count } = vi.hoisted(() => ({
  findMany: vi.fn(),
  count: vi.fn(),
}));
vi.mock("@/server/db", () => ({ db: { patient: { findMany, count } } }));
import { findPatients } from "@/server/patient-search";
import type { Actor } from "@/lib/domain";
const actor: Actor = {
  id: "staff",
  laboratoryId: "lab-A",
  role: "ATENDENTE",
  sessionVersion: 0,
};
beforeEach(() => {
  vi.clearAllMocks();
  count.mockResolvedValue(1);
  findMany.mockResolvedValue([
    {
      id: "p1",
      name: "Paciente fictício",
      birthDate: new Date("2000-01-01"),
      cpf: "11111111111",
    },
  ]);
});
it("busca filtra o laboratório e retorna somente CPF mascarado", async () => {
  const result = await findPatients(actor, {
    query: "111.111.111-11",
    page: 1,
  });
  expect(findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: expect.objectContaining({ laboratoryId: "lab-A" }),
    }),
  );
  expect(result.rows[0].cpf).toBe("***.***.111-**");
  expect(JSON.stringify(result)).not.toContain("11111111111");
});
it("pagina sem trazer todos os registros", async () => {
  await findPatients(actor, { query: "Paciente", page: 2 });
  expect(findMany).toHaveBeenCalledWith(
    expect.objectContaining({ skip: 20, take: 20 }),
  );
});
it("recusa parâmetros inválidos antes de consultar", async () => {
  await expect(findPatients(actor, { query: "", page: -1 })).rejects.toThrow();
  expect(findMany).not.toHaveBeenCalled();
});
