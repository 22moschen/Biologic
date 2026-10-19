import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
config({ quiet: true });
import { PrismaClient, Prisma } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { hash } from "bcryptjs";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { demoExam, demoModules, examNames } from "./demo-data";
const db = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL ?? "" }),
});
const toJson = (x: unknown) =>
  JSON.parse(JSON.stringify(x)) as Prisma.InputJsonValue;
async function main() {
  if (
    process.env.NODE_ENV === "production" ||
    process.env.ALLOW_DEMO_SEED !== "true"
  )
    throw Error(
      "Seed demonstrativo exige ALLOW_DEMO_SEED=true e é bloqueado em produção.",
    );
  const credentials = z
    .object({
      adminEmail: z.email(),
      attendantEmail: z.email(),
      adminPassword: z
        .string()
        .min(12)
        .refine((v) => Buffer.byteLength(v) <= 72),
      attendantPassword: z
        .string()
        .min(12)
        .refine((v) => Buffer.byteLength(v) <= 72),
    })
    .parse({
      adminEmail: process.env.DEMO_ADMIN_EMAIL,
      attendantEmail: process.env.DEMO_ATTENDANT_EMAIL,
      adminPassword: process.env.DEMO_ADMIN_PASSWORD,
      attendantPassword: process.env.DEMO_ATTENDANT_PASSWORD,
    });
  if (
    credentials.adminEmail.toLowerCase() ===
    credentials.attendantEmail.toLowerCase()
  )
    throw Error("Utilize e-mails distintos.");
  const passwords = await Promise.all([
    hash(credentials.adminPassword, 12),
    hash(credentials.attendantPassword, 12),
  ]);
  await db.$transaction(
    async (tx) => {
      if (await tx.seedRun.findUnique({ where: { id: "biologic-demo-v1" } })) {
        console.log("Seed já executado. Nenhum dado foi alterado.");
        return;
      }
      if (
        (await tx.laboratory.count()) ||
        (await tx.user.count()) ||
        (await tx.patient.count()) ||
        (await tx.attendance.count())
      )
        throw Error(
          "Banco com dados existentes. Seed demonstrativo recusado. Use um banco Neon novo e exclusivo.",
        );
      const lab = await tx.laboratory.create({
        data: {
          name: "Laboratório acadêmico BioLogic",
          slug: "biologic-academico",
        },
      });
      const admin = await tx.user.create({
        data: {
          laboratoryId: lab.id,
          name: "Administradora da demonstração",
          email: credentials.adminEmail.toLowerCase(),
          passwordHash: passwords[0],
          role: "ADMINISTRADOR",
        },
      });
      const attendant = await tx.user.create({
        data: {
          laboratoryId: lab.id,
          name: "Atendente da demonstração",
          email: credentials.attendantEmail.toLowerCase(),
          passwordHash: passwords[1],
          role: "ATENDENTE",
        },
      });
      const patients = [];
      for (const [i, name] of [
        "Paciente fictícia Aurora",
        "Paciente fictício Bento",
        "Paciente fictícia Clara",
      ].entries())
        patients.push(
          await tx.patient.create({
            data: {
              laboratoryId: lab.id,
              name,
              birthDate: new Date(`199${i}-05-15T00:00:00Z`),
            },
          }),
        );
      const exams = [];
      for (const [code, name, category] of examNames)
        exams.push(
          await tx.exam.create({
            data: {
              laboratoryId: lab.id,
              code,
              name,
              category,
              versions: {
                create: { version: 1, content: toJson(demoExam(name)) },
              },
            },
          }),
        );
      for (const trainingModule of demoModules)
        await tx.trainingModule.create({
          data: {
            laboratoryId: lab.id,
            title: trainingModule.title,
            slug: trainingModule.slug,
            published: true,
            versions: {
              create: {
                version: 1,
                summary: trainingModule.summary,
                content: trainingModule.content,
                questions: toJson(trainingModule.questions),
              },
            },
          },
        });
      for (const [i, status] of (
        ["EM_PREENCHIMENTO", "COM_PENDENCIA", "CONFERENCIA_CONCLUIDA"] as const
      ).entries()) {
        const a = await tx.attendance.create({
          data: {
            laboratoryId: lab.id,
            patientId: patients[i].id,
            createdBy: attendant.id,
            requestKey: randomUUID(),
            status,
            completedAt: i === 2 ? new Date() : null,
            exams: {
              create: {
                sourceExamId: exams[0].id,
                version: 1,
                snapshot: toJson(demoExam(exams[0].name)),
              },
            },
          },
          include: { exams: true },
        });
        if (i > 0) {
          for (const q of demoExam(exams[0].name).questions) {
            const value =
              q.id === "identificacao" && i === 1
                ? "Não"
                : q.id === "duvidas"
                  ? "Não"
                  : q.type === "TEXT"
                    ? ""
                    : "Sim";
            await tx.checklistAnswer.create({
              data: {
                attendanceId: a.id,
                questionKey: `${a.exams[0].id}:${q.id}`,
                value,
              },
            });
            if (q.id === "identificacao" && i === 1)
              await tx.pendingIssue.create({
                data: {
                  attendanceId: a.id,
                  questionKey: `${a.exams[0].id}:${q.id}`,
                  question: q.text,
                  originalAnswer: value,
                },
              });
          }
        }
        await tx.auditEvent.create({
          data: {
            laboratoryId: lab.id,
            actorId: admin.id,
            action: "DEMO_ATTENDANCE_CREATED",
            entityId: a.id,
            detail: { status },
          },
        });
      }
      await tx.seedRun.create({ data: { id: "biologic-demo-v1" } });
      console.log(
        "Demonstração criada. Use os e-mails e senhas definidos nas variáveis seguras.",
      );
    },
    { isolationLevel: "Serializable", timeout: 60000 },
  );
}
main()
  .catch(() => {
    console.error(
      "Seed não executado. Confira as variáveis, a conexão e se o banco está vazio ou já contém o marcador desta demonstração.",
    );
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
