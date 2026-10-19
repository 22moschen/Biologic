import { describe, it, expect } from "vitest";
import {
  assertAdmin,
  assertLaboratory,
  assertCompletable,
  evaluate,
  grade,
  validCpf,
  patientSchema,
  examContentSchema,
  trainingSchema,
  tokenValid,
  type Actor,
} from "@/lib/domain";
import { demoExam, demoModules } from "../prisma/demo-data";
import { digest, randomToken } from "@/server/security";
const attendant: Actor = {
  id: "staff",
  laboratoryId: "lab-a",
  role: "ATENDENTE",
  sessionVersion: 0,
};
describe("autorização", () => {
  it("atendente não executa administração", () =>
    expect(() => assertAdmin(attendant)).toThrow(/administração/));
  it("administrador autorizado", () =>
    expect(() =>
      assertAdmin({ ...attendant, role: "ADMINISTRADOR" }),
    ).not.toThrow());
  it("rejeita outro laboratório inclusive para admin", () =>
    expect(() =>
      assertLaboratory({ ...attendant, role: "ADMINISTRADOR" }, "lab-b"),
    ).toThrow());
  it("permite o laboratório da sessão", () =>
    expect(() => assertLaboratory(attendant, "lab-a")).not.toThrow());
});
describe("checklist", () => {
  const qs = demoExam("Exame de teste").questions.map((q) => ({
    ...q,
    key: q.id,
  }));
  it("rascunho pode estar incompleto, conclusão não", () => {
    const r = evaluate(qs, {});
    expect(r.missing).toHaveLength(3);
    expect(() => assertCompletable(r.missing, 0)).toThrow(/obrigatórias/);
  });
  it("divergência configurada gera pendência", () =>
    expect(evaluate(qs, { identificacao: "Não" }).divergent).toEqual([
      { key: "identificacao", value: "Não", text: qs[0].text },
    ]));
  it("não não é automaticamente divergente", () =>
    expect(evaluate(qs, { duvidas: "Não" }).divergent).toHaveLength(0));
  it("sim pode gerar pendência", () =>
    expect(evaluate(qs, { duvidas: "Sim" }).divergent).toHaveLength(1));
  it("texto livre não é interpretado", () =>
    expect(
      evaluate(qs, { observacoes: "Não, incorreto, divergente" }).divergent,
    ).toHaveLength(0));
  it("opção inventada é rejeitada", () =>
    expect(() => evaluate(qs, { identificacao: "talvez" })).toThrow(/opções/));
  it("pendência aberta bloqueia conclusão", () =>
    expect(() => assertCompletable([], 1)).toThrow(/pendências/));
  it("respostas completas sem pendência permitem concluir", () => {
    const r = evaluate(qs, {
      identificacao: "Sim",
      orientacoes: "Sim",
      duvidas: "Não",
    });
    expect(() =>
      assertCompletable(r.missing, r.divergent.length),
    ).not.toThrow();
  });
  it("não permite regras automáticas em texto", () => {
    const c = demoExam("Teste");
    c.questions[3].pendingValues = ["erro"];
    expect(examContentSchema.safeParse(c).success).toBe(false);
  });
  it("perguntas precisam de IDs únicos", () => {
    const c = demoExam("Teste");
    c.questions[1].id = c.questions[0].id;
    expect(examContentSchema.safeParse(c).success).toBe(false);
  });
  it("conteúdo revisado exige revisor e data", () =>
    expect(
      examContentSchema.safeParse({ ...demoExam("Teste"), state: "REVISADO" })
        .success,
    ).toBe(false));
});
describe("cadastro", () => {
  const p = {
    name: "Paciente Fictício",
    birthDate: "2000-01-01",
    cpf: "",
    phone: "",
    email: "",
  };
  it("aceita vários cadastros sem CPF", () =>
    expect(patientSchema.parse(p).cpf).toBe(""));
  it("recusa nascimento futuro", () =>
    expect(
      patientSchema.safeParse({ ...p, birthDate: "2999-01-01" }).success,
    ).toBe(false));
  it("recusa dia inexistente", () =>
    expect(
      patientSchema.safeParse({ ...p, birthDate: "2001-02-29" }).success,
    ).toBe(false));
  it("recusa CPF com dígitos repetidos", () =>
    expect(validCpf("11111111111")).toBe(false));
  it("recusa CPF com verificador errado", () =>
    expect(validCpf("12345678900")).toBe(false));
  it("recusa telefone ou e-mail inválido", () => {
    expect(patientSchema.safeParse({ ...p, email: "incorreto" }).success).toBe(
      false,
    );
    expect(patientSchema.safeParse({ ...p, phone: "abc" }).success).toBe(false);
  });
});
describe("avaliação no servidor", () => {
  const qs = demoModules[0].questions;
  it("2/3 não alcança 70%", () =>
    expect(grade(qs, [1, 2, 2])).toEqual({
      correct: 2,
      total: 3,
      passed: false,
    }));
  it("3/3 aprova", () => expect(grade(qs, [1, 2, 0]).passed).toBe(true));
  it("não aceita alternativas fora das opções", () =>
    expect(() => grade(qs, [9, 2, 0])).toThrow());
  it("não aceita perguntas sem resposta", () =>
    expect(() => grade(qs, [1])).toThrow());
  it("módulos demonstrativos possuem três perguntas válidas", () =>
    demoModules.forEach((m) =>
      expect(trainingSchema.safeParse(m).success).toBe(true),
    ));
});
describe("tokens", () => {
  it("gera 256 bits e armazena hash diferente do segredo", () => {
    const a = randomToken(),
      b = randomToken();
    expect(a).toMatch(/^[\w-]{43}$/);
    expect(a).not.toBe(b);
    expect(digest(a)).toHaveLength(64);
    expect(digest(a)).not.toContain(a);
  });
  it("token inexistente rejeitado", () => expect(tokenValid(null)).toBe(false));
  it("token expirado rejeitado", () =>
    expect(tokenValid({ expiresAt: new Date(0), revokedAt: null })).toBe(
      false,
    ));
  it("token revogado rejeitado mesmo dentro do prazo", () =>
    expect(
      tokenValid({
        expiresAt: new Date(Date.now() + 60000),
        revokedAt: new Date(),
      }),
    ).toBe(false));
  it("token válido aceito", () =>
    expect(
      tokenValid({ expiresAt: new Date(Date.now() + 60000), revokedAt: null }),
    ).toBe(true));
});
