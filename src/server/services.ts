import "server-only";
import { Prisma } from "@prisma/client";
import { hash } from "bcryptjs";
import { z } from "zod";
import { db } from "./db";
import { digest, randomToken } from "./security";
import {
  assertAdmin,
  assertCompletable,
  assertLaboratory,
  DomainError,
  evaluate,
  examContentSchema,
  grade,
  patientSchema,
  trainingSchema,
  trainingQuestionSchema,
  type Actor,
} from "@/lib/domain";
type Tx = Prisma.TransactionClient;
const json = (value: unknown) =>
  JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
export async function transaction<T>(
  actor: Actor,
  fn: (tx: Tx) => Promise<T>,
): Promise<T> {
  for (let attempt = 0; ; attempt++)
    try {
      return await db.$transaction(
        async (tx) => {
          const user = await tx.user.findUnique({ where: { id: actor.id } });
          if (
            !user?.active ||
            user.sessionVersion !== actor.sessionVersion ||
            user.role !== actor.role ||
            user.laboratoryId !== actor.laboratoryId
          )
            throw new DomainError("Sessão inválida. Entre novamente.");
          return fn(tx);
        },
        { isolationLevel: "Serializable", maxWait: 10000, timeout: 20000 },
      );
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2034" &&
        attempt < 2
      )
        continue;
      throw e;
    }
}
async function audit(
  tx: Tx,
  a: Actor,
  action: string,
  entityId: string,
  detail: unknown = {},
) {
  await tx.auditEvent.create({
    data: {
      laboratoryId: a.laboratoryId,
      actorId: a.id,
      action,
      entityId,
      detail: json(detail),
    },
  });
}
export async function savePatient(actor: Actor, input: unknown, id?: string) {
  const data = patientSchema.parse(input);
  return transaction(actor, async (tx) => {
    if (id) {
      const old = await tx.patient.findFirst({
        where: { id, laboratoryId: actor.laboratoryId },
      });
      if (!old) throw new DomainError("Paciente não encontrado.");
    }
    const value = {
      ...data,
      birthDate: new Date(data.birthDate + "T00:00:00Z"),
      cpf: data.cpf || null,
      phone: data.phone || null,
      email: data.email || null,
    };
    const patient = id
      ? await tx.patient.update({ where: { id }, data: value })
      : await tx.patient.create({
          data: { ...value, laboratoryId: actor.laboratoryId },
        });
    await audit(
      tx,
      actor,
      id ? "PATIENT_UPDATED" : "PATIENT_CREATED",
      patient.id,
      { fields: ["name", "birthDate", "cpf", "phone", "email"] },
    );
    return patient.id;
  });
}
export async function saveExam(actor: Actor, input: unknown) {
  assertAdmin(actor);
  const data = z
    .object({
      id: z.string().optional(),
      code: z.string().trim().min(1).max(40),
      category: z.enum(["SANGUE", "URINA", "FEZES", "OUTROS"]),
      active: z.boolean(),
      content: examContentSchema,
    })
    .parse(input);
  return transaction(actor, async (tx) => {
    const previous = data.id
      ? await tx.exam.findFirst({
          where: { id: data.id, laboratoryId: actor.laboratoryId },
        })
      : null;
    if (data.id && !previous) throw new DomainError("Exame não encontrado.");
    const version = (previous?.currentVersion ?? 0) + 1;
    const exam = previous
      ? await tx.exam.update({
          where: { id: previous.id },
          data: {
            code: data.code,
            name: data.content.name,
            category: data.category,
            active: data.active,
            currentVersion: version,
          },
        })
      : await tx.exam.create({
          data: {
            laboratoryId: actor.laboratoryId,
            code: data.code,
            name: data.content.name,
            category: data.category,
            active: data.active,
          },
        });
    await tx.examVersion.create({
      data: { examId: exam.id, version, content: json(data.content) },
    });
    await audit(tx, actor, "EXAM_VERSION_SAVED", exam.id, { version });
    return exam.id;
  });
}
export async function createAttendance(actor: Actor, input: unknown) {
  const data = z
    .object({
      patientId: z.string().min(1),
      examIds: z.array(z.string()).min(1).max(30),
      requestKey: z.uuid(),
    })
    .parse(input);
  return transaction(actor, async (tx) => {
    const existing = await tx.attendance.findUnique({
      where: { requestKey: data.requestKey },
    });
    if (existing) {
      assertLaboratory(actor, existing.laboratoryId);
      if (existing.createdBy !== actor.id)
        throw new DomainError("Solicitação inválida.");
      return existing.id;
    }
    const patient = await tx.patient.findFirst({
      where: { id: data.patientId, laboratoryId: actor.laboratoryId },
    });
    if (!patient) throw new DomainError("Paciente não encontrado.");
    const ids = [...new Set(data.examIds)];
    const exams = await tx.exam.findMany({
      where: {
        id: { in: ids },
        laboratoryId: actor.laboratoryId,
        active: true,
      },
      include: { versions: { orderBy: { version: "desc" }, take: 1 } },
    });
    if (exams.length !== ids.length)
      throw new DomainError("Selecione exames ativos do laboratório.");
    const a = await tx.attendance.create({
      data: {
        laboratoryId: actor.laboratoryId,
        patientId: patient.id,
        createdBy: actor.id,
        requestKey: data.requestKey,
        exams: {
          create: exams.map((e) => ({
            sourceExamId: e.id,
            version: e.currentVersion,
            snapshot: json(examContentSchema.parse(e.versions[0].content)),
          })),
        },
      },
    });
    await audit(tx, actor, "ATTENDANCE_CREATED", a.id);
    return a.id;
  });
}
async function attendance(tx: Tx, actor: Actor, id: string) {
  const a = await tx.attendance.findFirst({
    where: { id, laboratoryId: actor.laboratoryId },
    include: { exams: true, answers: true, issues: true },
  });
  if (!a) throw new DomainError("Atendimento não encontrado.");
  return a;
}
export async function saveChecklist(actor: Actor, input: unknown) {
  const data = z
    .object({
      id: z.string(),
      revision: z.number().int().nonnegative(),
      answers: z.record(z.string(), z.string().max(2000)),
      complete: z.boolean(),
    })
    .parse(input);
  return transaction(actor, async (tx) => {
    const a = await attendance(tx, actor, data.id);
    if (a.status === "CONFERENCIA_CONCLUIDA")
      throw new DomainError("Atendimento concluído é somente para leitura.");
    if (a.revision !== data.revision)
      throw new DomainError(
        "Este atendimento foi alterado. Atualize a página antes de salvar.",
      );
    const questions = a.exams.flatMap((e) =>
      examContentSchema
        .parse(e.snapshot)
        .questions.map((q) => ({ ...q, key: `${e.id}:${q.id}` })),
    );
    if (
      Object.keys(data.answers).some((k) => !questions.some((q) => q.key === k))
    )
      throw new DomainError("Pergunta inválida.");
    const result = evaluate(questions, data.answers);
    for (const q of questions)
      await tx.checklistAnswer.upsert({
        where: {
          attendanceId_questionKey: { attendanceId: a.id, questionKey: q.key },
        },
        create: {
          attendanceId: a.id,
          questionKey: q.key,
          value: data.answers[q.key]?.trim() ?? "",
        },
        update: { value: data.answers[q.key]?.trim() ?? "" },
      });
    const divergentKeys = result.divergent.map((d) => d.key);
    // Keep changes in the audit, while only current divergent answers remain active issues.
    await tx.pendingIssue.deleteMany({
      where: { attendanceId: a.id, questionKey: { notIn: divergentKeys } },
    });
    for (const issue of result.divergent) {
      const old = a.issues.find((i) => i.questionKey === issue.key);
      await tx.pendingIssue.upsert({
        where: {
          attendanceId_questionKey: {
            attendanceId: a.id,
            questionKey: issue.key,
          },
        },
        create: {
          attendanceId: a.id,
          questionKey: issue.key,
          question: issue.text,
          originalAnswer: issue.value,
        },
        update:
          old?.originalAnswer === issue.value
            ? {}
            : {
                originalAnswer: issue.value,
                resolvedAt: null,
                resolvedBy: null,
                justification: null,
              },
      });
    }
    const open = await tx.pendingIssue.count({
      where: { attendanceId: a.id, resolvedAt: null },
    });
    if (data.complete) assertCompletable(result.missing, open);
    const status = data.complete
      ? "CONFERENCIA_CONCLUIDA"
      : open
        ? "COM_PENDENCIA"
        : "EM_PREENCHIMENTO";
    await tx.attendance.update({
      where: { id: a.id },
      data: {
        status,
        revision: { increment: 1 },
        completedAt: data.complete ? new Date() : null,
      },
    });
    // Answers are only in the protected DB audit, never in application logs.
    await audit(
      tx,
      actor,
      data.complete ? "ATTENDANCE_COMPLETED" : "CHECKLIST_SAVED",
      a.id,
      { answers: data.answers, status },
    );
    return a.id;
  });
}
export async function resolveIssue(actor: Actor, input: unknown) {
  assertAdmin(actor);
  const data = z
    .object({
      attendanceId: z.string(),
      issueId: z.string(),
      justification: z.string().trim().min(5).max(2000),
    })
    .parse(input);
  return transaction(actor, async (tx) => {
    const a = await attendance(tx, actor, data.attendanceId);
    if (a.status === "CONFERENCIA_CONCLUIDA")
      throw new DomainError("Reabra o atendimento primeiro.");
    const issue = a.issues.find((i) => i.id === data.issueId);
    if (!issue || issue.resolvedAt)
      throw new DomainError("Pendência não está aberta.");
    await tx.pendingIssue.update({
      where: { id: issue.id },
      data: {
        resolvedAt: new Date(),
        resolvedBy: actor.id,
        justification: data.justification,
      },
    });
    const open = await tx.pendingIssue.count({
      where: { attendanceId: a.id, resolvedAt: null },
    });
    await tx.attendance.update({
      where: { id: a.id },
      data: {
        revision: { increment: 1 },
        status: open ? "COM_PENDENCIA" : "EM_PREENCHIMENTO",
      },
    });
    await audit(tx, actor, "ISSUE_RESOLVED", a.id, {
      issueId: issue.id,
      originalAnswer: issue.originalAnswer,
      justification: data.justification,
    });
  });
}
export async function reopenAttendance(actor: Actor, input: unknown) {
  assertAdmin(actor);
  const data = z
    .object({
      id: z.string(),
      justification: z.string().trim().min(5).max(2000),
    })
    .parse(input);
  return transaction(actor, async (tx) => {
    const a = await attendance(tx, actor, data.id);
    if (a.status !== "CONFERENCIA_CONCLUIDA")
      throw new DomainError("Atendimento não está concluído.");
    await tx.attendance.update({
      where: { id: a.id },
      data: {
        status: "EM_PREENCHIMENTO",
        completedAt: null,
        revision: { increment: 1 },
      },
    });
    await audit(tx, actor, "ATTENDANCE_REOPENED", a.id, {
      justification: data.justification,
    });
  });
}
export async function issuePatientAccess(
  actor: Actor,
  id: string,
  revokeOnly = false,
) {
  return transaction(actor, async (tx) => {
    const a = await attendance(tx, actor, id);
    await tx.patientAccessToken.updateMany({
      where: { attendanceId: a.id, revokedAt: null },
      data: { revokedAt: new Date(), sessionHash: null },
    });
    await audit(
      tx,
      actor,
      revokeOnly ? "PATIENT_ACCESS_REVOKED" : "PATIENT_ACCESS_ROTATED",
      a.id,
    );
    if (revokeOnly) return null;
    const raw = randomToken();
    const days = z.coerce
      .number()
      .int()
      .min(1)
      .max(30)
      .catch(7)
      .parse(process.env.PATIENT_ACCESS_DAYS);
    await tx.patientAccessToken.create({
      data: {
        attendanceId: a.id,
        hash: digest(raw),
        expiresAt: new Date(Date.now() + days * 86400000),
      },
    });
    return raw;
  });
}
export async function saveUser(actor: Actor, input: unknown) {
  assertAdmin(actor);
  const data = z
    .object({
      id: z.string().optional(),
      name: z.string().trim().min(3).max(120),
      email: z.email().transform((v) => v.toLowerCase()),
      role: z.enum(["ADMINISTRADOR", "ATENDENTE"]),
      active: z.boolean(),
      password: z
        .string()
        .max(72)
        .refine(
          (v) => Buffer.byteLength(v) <= 72,
          "Senha deve ter até 72 bytes.",
        )
        .refine((v) => !v || v.length >= 12, "Use pelo menos 12 caracteres."),
    })
    .parse(input);
  const passwordHash = data.password
    ? await hash(data.password, 12)
    : undefined;
  return transaction(actor, async (tx) => {
    if (data.id === actor.id && (!data.active || data.role !== "ADMINISTRADOR"))
      throw new DomainError(
        "Você não pode remover seu próprio acesso administrativo.",
      );
    const previous = data.id
      ? await tx.user.findFirst({
          where: { id: data.id, laboratoryId: actor.laboratoryId },
        })
      : null;
    if (data.id && !previous) throw new DomainError("Usuário não encontrado.");
    if (!previous && !passwordHash)
      throw new DomainError("Defina uma senha para a nova conta.");
    const values = {
      name: data.name,
      email: data.email,
      role: data.role,
      active: data.active,
      ...(passwordHash ? { passwordHash } : {}),
    };
    const user = previous
      ? await tx.user.update({
          where: { id: previous.id },
          data: { ...values, sessionVersion: { increment: 1 } },
        })
      : await tx.user.create({
          data: {
            ...values,
            passwordHash: passwordHash!,
            laboratoryId: actor.laboratoryId,
          },
        });
    await audit(tx, actor, "USER_SAVED", user.id, {
      active: data.active,
      role: data.role,
    });
    return user.id;
  });
}
export async function saveTraining(actor: Actor, input: unknown) {
  assertAdmin(actor);
  const d = z
    .object({
      id: z.string().optional(),
      published: z.boolean(),
      data: trainingSchema,
    })
    .parse(input);
  return transaction(actor, async (tx) => {
    const previous = d.id
      ? await tx.trainingModule.findFirst({
          where: { id: d.id, laboratoryId: actor.laboratoryId },
        })
      : null;
    if (d.id && !previous) throw new DomainError("Módulo não encontrado.");
    const version = (previous?.currentVersion ?? 0) + 1;
    const savedModule = previous
      ? await tx.trainingModule.update({
          where: { id: previous.id },
          data: {
            title: d.data.title,
            published: d.published,
            currentVersion: version,
          },
        })
      : await tx.trainingModule.create({
          data: {
            laboratoryId: actor.laboratoryId,
            title: d.data.title,
            slug: randomToken().slice(0, 12),
            published: d.published,
          },
        });
    await tx.trainingVersion.create({
      data: {
        moduleId: savedModule.id,
        version,
        summary: d.data.summary,
        content: d.data.content,
        questions: json(d.data.questions),
      },
    });
    await audit(tx, actor, "TRAINING_VERSION_SAVED", savedModule.id, {
      version,
    });
    return savedModule.id;
  });
}
export async function submitTraining(actor: Actor, input: unknown) {
  const d = z
    .object({
      versionId: z.string(),
      read: z.literal(true),
      answers: z.array(z.number().int()),
      requestKey: z.uuid(),
    })
    .parse(input);
  return transaction(actor, async (tx) => {
    const v = await tx.trainingVersion.findFirst({
      where: {
        id: d.versionId,
        module: { laboratoryId: actor.laboratoryId, published: true },
      },
      include: { module: true },
    });
    if (!v || v.module.currentVersion !== v.version)
      throw new DomainError("Módulo atualizado. Recarregue o treinamento.");
    const qs = z.array(trainingQuestionSchema).parse(v.questions);
    const result = grade(qs, d.answers);
    const existing = await tx.trainingAttempt.findUnique({
      where: { requestKey: d.requestKey },
    });
    if (
      existing &&
      (existing.userId !== actor.id || existing.versionId !== v.id)
    )
      throw new DomainError("Tentativa inválida.");
    if (
      existing &&
      JSON.stringify(existing.answers) !== JSON.stringify(d.answers)
    )
      throw new DomainError(
        "Tentativa já registrada. Inicie uma nova tentativa.",
      );
    if (!existing)
      await tx.trainingAttempt.create({
        data: {
          requestKey: d.requestKey,
          userId: actor.id,
          versionId: v.id,
          answers: json(d.answers),
          ...result,
        },
      });
    await tx.trainingProgress.upsert({
      where: { userId_versionId: { userId: actor.id, versionId: v.id } },
      create: {
        userId: actor.id,
        versionId: v.id,
        readAt: new Date(),
        completedAt: result.passed ? new Date() : null,
      },
      update: {
        readAt: new Date(),
        ...(result.passed ? { completedAt: new Date() } : {}),
      },
    });
    await audit(tx, actor, "TRAINING_SUBMITTED", v.id, {
      passed: result.passed,
      correct: result.correct,
    });
    return {
      ...result,
      feedback: qs.map((q, i) => ({
        text: q.text,
        correct: d.answers[i] === q.correctIndex,
        explanation: q.explanation,
      })),
    };
  });
}
