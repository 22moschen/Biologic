import { beforeEach, describe, it, expect, vi } from "vitest";
const { lookup } = vi.hoisted(() => ({ lookup: vi.fn() }));
vi.mock("@/server/db", () => ({
  db: { patientAccessToken: { findUnique: lookup } },
}));
import { loadPatientPortal } from "@/server/patient-portal";
import { digest } from "@/server/security";
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("DATABASE_URL", "configured-for-unit-test");
});
describe("portal restrito ao atendimento associado à sessão", () => {
  it("sem sessão não consulta nem retorna dados", async () => {
    expect(await loadPatientPortal(undefined)).toBeNull();
    expect(lookup).not.toHaveBeenCalled();
  });
  it("não consulta por CPF, identificador público ou ID enviado pelo navegador", async () => {
    lookup.mockResolvedValue({
      expiresAt: new Date(Date.now() + 60000),
      revokedAt: null,
      attendance: { publicId: "attendance-A" },
    });
    expect(await loadPatientPortal("session-of-A")).toEqual({
      publicId: "attendance-A",
    });
    expect(lookup).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { sessionHash: digest("session-of-A") },
      }),
    );
  });
  it("sessão de A nunca recebe o atendimento de B", async () => {
    lookup.mockImplementation(({ where }) => ({
      expiresAt: new Date(Date.now() + 60000),
      revokedAt: null,
      attendance: {
        publicId: where.sessionHash === digest("session-of-A") ? "A" : "B",
      },
    }));
    expect(await loadPatientPortal("session-of-A")).toEqual({ publicId: "A" });
    expect(await loadPatientPortal("session-of-B")).toEqual({ publicId: "B" });
  });
  it("projeção não consulta respostas, pendências, CPF ou justificativas", async () => {
    lookup.mockResolvedValue(null);
    await loadPatientPortal("session");
    const projection = lookup.mock.calls[0][0].select.attendance.select;
    expect(Object.keys(projection).sort()).toEqual(
      ["publicId", "updatedAt", "patient", "exams", "laboratory"].sort(),
    );
    expect(projection.patient.select).toEqual({ name: true });
  });
  it.each(["expired", "revoked"])("rejeita sessão %s", async (state) => {
    lookup.mockResolvedValue({
      expiresAt: new Date(state === "expired" ? 0 : Date.now() + 60000),
      revokedAt: state === "revoked" ? new Date() : null,
      attendance: { publicId: "A" },
    });
    expect(await loadPatientPortal("session")).toBeNull();
  });
});
