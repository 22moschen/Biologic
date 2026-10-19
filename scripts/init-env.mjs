import { readFile, writeFile, access } from "node:fs/promises";
import { randomBytes } from "node:crypto";
try {
  await access(".env");
  console.log(".env já existe; nenhum valor foi alterado.");
} catch {
  const template = await readFile(".env.example", "utf8");
  await writeFile(
    ".env",
    template.replace(
      'NEXTAUTH_SECRET=""',
      `NEXTAUTH_SECRET="${randomBytes(32).toString("base64url")}"`,
    ),
    { flag: "wx", mode: 0o600 },
  );
  console.log(
    ".env criado com segredo local aleatório. Configure as conexões Neon sem compartilhar os valores.",
  );
}
