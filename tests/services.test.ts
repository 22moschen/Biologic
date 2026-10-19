import { beforeEach, describe, it, expect, vi } from "vitest";
const { tx, mockDb } = vi.hoisted(() => {
  const table = () => ({
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
    count: vi.fn(),
    deleteMany: vi.fn(),
    updateMany: vi.fn(),
  });
  const tx = {
    user: table(),
    patient: table(),
    exam: table(),
    examVersion: table(),
    attendance: table(),
    auditEvent: table(),
    checklistAnswer: table(),
    pendingIssue: table(),
    patientAccessToken: table(),
    trainingVersion: table(),
    trainingAttempt: table(),
    trainingProgress: table(),
  };
  return {
    tx,
    mockDb: {
      $transaction: vi.fn(async (fn: (t: unknown) => unknown) => fn(tx)),
    },
  };
});
vi.mock("@/server/db", () => ({ db: mockDb }));
import {
  savePatient,
  saveExam,
  createAttendance,
  saveChecklist,
  resolveIssue,
  reopenAttendance,
  issuePatientAccess,
  submitTraining,
  saveUser,
} from "@/server/services";
import { demoExam, demoModules } from "../prisma/demo-data";
import type { Actor } from "@/lib/domain";
const actor: Actor = {
  id: "staff",
  laboratoryId: "lab-a",
  role: "ATENDENTE",
  sessionVersion: 2,
};
const admin: Actor = { ...actor, role: "ADMINISTRADOR" };
const base = () => ({
  id: "a1",
  laboratoryId: "lab-a",
  revision: 0,
  status: "EM_PREENCHIMENTO",
  exams: [{ id: "ae1", snapshot: demoExam("Exame antigo") }],
  answers: [],
  issues: [],
});
beforeEach(() => {
  vi.clearAllMocks();
  tx.user.findUnique.mockResolvedValue({ ...actor, active: true });
  tx.pendingIssue.count.mockResolvedValue(0);
});
describe("serviços protegidos", () => {
  it("conta desativada perde acesso em sessão existente", async () => {
    tx.user.findUnique.mockResolvedValue({ ...actor, active: false });
    await expect(
      savePatient(actor, {
        name: "Paciente fictício",
        birthDate: "2000-01-01",
        cpf: "",
        phone: "",
        email: "",
      }),
    ).rejects.toThrow(/Sessão inválida/);
    expect(tx.patient.create).not.toHaveBeenCalled();
  });
  it("sessão anterior a troca de permissões é rejeitada", async () => {
    tx.user.findUnique.mockResolvedValue({
      ...actor,
      active: true,
      sessionVersion: 3,
    });
    await expect(issuePatientAccess(actor, "a1")).rejects.toThrow(
      /Sessão inválida/,
    );
  });
  it("atendente não resolve pendências nem gerencia usuários", async () => {
    await expect(resolveIssue(actor, {})).rejects.toThrow(/administração/);
    await expect(saveUser(actor, {})).rejects.toThrow(/administração/);
    expect(mockDb.$transaction).not.toHaveBeenCalled();
  });
  it("consulta de atendimento é filtrada pelo laboratório da sessão", async () => {
    tx.attendance.findFirst.mockResolvedValue(null);
    await expect(
      issuePatientAccess(actor, "de-outro-laboratorio"),
    ).rejects.toThrow(/não encontrado/);
    expect(tx.attendance.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "de-outro-laboratorio", laboratoryId: "lab-a" },
      }),
    );
    expect(tx.patientAccessToken.create).not.toHaveBeenCalled();
  });
  it("atendimento precisa de pelo menos um exame", async () => {
    await expect(
      createAttendance(actor, {
        patientId: "p1",
        examIds: [],
        requestKey: crypto.randomUUID(),
      }),
    ).rejects.toThrow();
    expect(tx.attendance.create).not.toHaveBeenCalled();
  });
  it("cópia de orientações é salva na criação", async () => {
    tx.attendance.findUnique.mockResolvedValue(null);
    tx.patient.findFirst.mockResolvedValue({ id: "p1" });
    const content = demoExam("Exame antigo");
    tx.exam.findMany.mockResolvedValue([
      { id: "e1", currentVersion: 1, versions: [{ content }] },
    ]);
    tx.attendance.create.mockResolvedValue({ id: "a1" });
    await createAttendance(actor, {
      patientId: "p1",
      examIds: ["e1"],
      requestKey: crypto.randomUUID(),
    });
    const saved =
      tx.attendance.create.mock.calls[0][0].data.exams.create[0].snapshot;
    content.name = "Exame novo";
    expect(saved.name).toBe("Exame antigo");
    expect(tx.exam.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ["e1"] }, laboratoryId: "lab-a", active: true },
      }),
    );
  });
  it("atendimento concluído não aceita alterações", async () => {
    tx.attendance.findFirst.mockResolvedValue({
      ...base(),
      status: "CONFERENCIA_CONCLUIDA",
    });
    await expect(
      saveChecklist(actor, {
        id: "a1",
        revision: 0,
        answers: {},
        complete: false,
      }),
    ).rejects.toThrow(/somente para leitura/);
    expect(tx.checklistAnswer.upsert).not.toHaveBeenCalled();
  });
  it("revisão antiga impede sobrescrita concorrente", async () => {
    tx.attendance.findFirst.mockResolvedValue({ ...base(), revision: 1 });
    await expect(
      saveChecklist(actor, {
        id: "a1",
        revision: 0,
        answers: {},
        complete: false,
      }),
    ).rejects.toThrow(/Atualize a página/);
  });
  it("conclusão sem obrigatórias é recusada", async () => {
    tx.attendance.findFirst.mockResolvedValue(base());
    await expect(
      saveChecklist(actor, {
        id: "a1",
        revision: 0,
        answers: {},
        complete: true,
      }),
    ).rejects.toThrow(/obrigatórias/);
    expect(tx.attendance.update).not.toHaveBeenCalled();
  });
  it("salvar divergência repetida usa chave única, não duplica", async () => {
    const a = base();
    tx.attendance.findFirst.mockResolvedValue(a);
    tx.pendingIssue.count.mockResolvedValue(1);
    await saveChecklist(actor, {
      id: "a1",
      revision: 0,
      answers: { "ae1:identificacao": "Não" },
      complete: false,
    });
    expect(tx.pendingIssue.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          attendanceId_questionKey: {
            attendanceId: "a1",
            questionKey: "ae1:identificacao",
          },
        },
      }),
    );
    expect(tx.attendance.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "COM_PENDENCIA" }),
      }),
    );
  });
  it("mudança da resposta invalida resolução anterior", async () => {
    const a = {
      ...base(),
      issues: [
        {
          id: "i1",
          questionKey: "ae1:identificacao",
          originalAnswer: "Outra resposta",
          resolvedAt: new Date(),
        },
      ],
    };
    tx.attendance.findFirst.mockResolvedValue(a);
    await saveChecklist(actor, {
      id: "a1",
      revision: 0,
      answers: { "ae1:identificacao": "Não" },
      complete: false,
    });
    expect(tx.pendingIssue.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: {
          originalAnswer: "Não",
          resolvedAt: null,
          resolvedBy: null,
          justification: null,
        },
      }),
    );
  });
  it("administrador precisa justificar resolução e reabertura", async () => {
    await expect(
      resolveIssue(admin, {
        attendanceId: "a1",
        issueId: "i1",
        justification: "",
      }),
    ).rejects.toThrow();
    await expect(
      reopenAttendance(admin, { id: "a1", justification: "" }),
    ).rejects.toThrow();
  });
  it("resolver não altera a resposta original", async () => {
    tx.user.findUnique.mockResolvedValue({ ...admin, active: true });
    tx.attendance.findFirst.mockResolvedValue({
      ...base(),
      issues: [
        {
          id: "i1",
          originalAnswer: "Não",
          questionKey: "ae1:identificacao",
          resolvedAt: null,
        },
      ],
    });
    await resolveIssue(admin, {
      attendanceId: "a1",
      issueId: "i1",
      justification: "Identificação conferida novamente pela equipe.",
    });
    expect(tx.checklistAnswer.update).not.toHaveBeenCalled();
    expect(tx.checklistAnswer.upsert).not.toHaveBeenCalled();
    expect(tx.auditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          detail: expect.objectContaining({ originalAnswer: "Não" }),
        }),
      }),
    );
  });
  it("nova versão de exame não escreve nos atendimentos", async () => {
    tx.user.findUnique.mockResolvedValue({ ...admin, active: true });
    tx.exam.findFirst.mockResolvedValue({ id: "e1", currentVersion: 1 });
    tx.exam.update.mockResolvedValue({ id: "e1" });
    await saveExam(admin, {
      id: "e1",
      code: "EX",
      category: "SANGUE",
      active: true,
      content: demoExam("Exame editado"),
    });
    expect(tx.examVersion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ version: 2 }),
      }),
    );
    expect(tx.attendance.update).not.toHaveBeenCalled();
  });
  it("corrige a avaliação pelo gabarito do banco e não por pontuação enviada", async () => {
    tx.trainingVersion.findFirst.mockResolvedValue({
      id: "v1",
      version: 1,
      module: { currentVersion: 1 },
      questions: demoModules[0].questions,
    });
    tx.trainingAttempt.findUnique.mockResolvedValue(null);
    const r = await submitTraining(actor, {
      versionId: "v1",
      read: true,
      answers: [1, 2, 2],
      requestKey: crypto.randomUUID(),
      passed: true,
      correct: 3,
    });
    expect(r.passed).toBe(false);
    expect(r.correct).toBe(2);
    expect(tx.trainingAttempt.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ passed: false, correct: 2 }),
      }),
    );
  });
  it("revogação elimina a sessão e o novo segredo só aparece no retorno", async () => {
    tx.attendance.findFirst.mockResolvedValue(base());
    const raw = await issuePatientAccess(actor, "a1");
    expect(raw).toMatch(/^[\w-]{43}$/);
    expect(tx.patientAccessToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ sessionHash: null }),
      }),
    );
    expect(
      JSON.stringify(tx.patientAccessToken.create.mock.calls),
    ).not.toContain(raw);
  });
});
