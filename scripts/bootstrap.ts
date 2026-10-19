import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
config({ quiet: true });
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { hash } from "bcryptjs";
import { z } from "zod";
const db = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL ?? "" }),
});
async function main() {
  const input = z
    .object({
      email: z.email(),
      password: z
        .string()
        .min(12)
        .refine((s) => Buffer.byteLength(s) <= 72),
      name: z.string().min(3),
      laboratoryName: z.string().min(3),
    })
    .parse({
      email: process.env.BOOTSTRAP_ADMIN_EMAIL,
      password: process.env.BOOTSTRAP_ADMIN_PASSWORD,
      name: process.env.BOOTSTRAP_ADMIN_NAME,
      laboratoryName: process.env.LABORATORY_NAME,
    });
  const passwordHash = await hash(input.password, 12);
  await db.$transaction(
    async (tx) => {
      const existing = await tx.user.findUnique({
        where: { email: input.email.toLowerCase() },
      });
      if (existing) {
        console.log("Conta já existe; nenhum dado foi alterado.");
        return;
      }
      if ((await tx.laboratory.count()) || (await tx.user.count()))
        throw Error(
          "Banco já inicializado. Use a administração para criar contas.",
        );
      const laboratory = await tx.laboratory.create({
        data: { name: input.laboratoryName, slug: "biologic-academico" },
      });
      const admin = await tx.user.create({
        data: {
          laboratoryId: laboratory.id,
          name: input.name,
          email: input.email.toLowerCase(),
          passwordHash,
          role: "ADMINISTRADOR",
        },
      });
      await tx.auditEvent.create({
        data: {
          laboratoryId: laboratory.id,
          actorId: admin.id,
          action: "LABORATORY_INITIALIZED",
          entityId: laboratory.id,
          detail: {},
        },
      });
      console.log(
        "Laboratório e primeira conta administrativa criados. Nenhum conteúdo demonstrativo inserido.",
      );
    },
    { isolationLevel: "Serializable" },
  );
}
main()
  .catch(() => {
    console.error(
      "Inicialização recusada. Confira as variáveis BOOTSTRAP_*, LABORATORY_NAME e a conexão. Use um banco novo ou a administração existente.",
    );
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
