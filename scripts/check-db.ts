import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
config({ quiet: true });
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
async function main() {
  if (!process.env.DATABASE_URL || !process.env.DIRECT_URL)
    throw Error("Configure DATABASE_URL e DIRECT_URL no servidor.");
  const db = new PrismaClient({
    adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }),
  });
  try {
    await db.$queryRaw`SELECT 1`;
    console.log(
      "Conexão Neon validada por consulta SQL. Nenhum dado alterado.",
    );
  } finally {
    await db.$disconnect();
  }
}
main().catch(() => {
  console.error(
    "Conexão não validada. Verifique as variáveis e o acesso ao endpoint Neon. Nenhuma credencial foi registrada.",
  );
  process.exitCode = 1;
});
