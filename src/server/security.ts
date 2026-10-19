import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { db } from "./db";
import { DomainError } from "@/lib/domain";
export const digest = (s: string) =>
  createHash("sha256").update(s).digest("hex");
export const randomToken = () => randomBytes(32).toString("base64url");
export async function rateLimit(
  namespace: string,
  identity: string,
  max = 10,
  minutes = 15,
) {
  const window = Math.floor(Date.now() / (minutes * 60000));
  const key = digest(`${namespace}:${identity}:${window}`);
  const row = await db.rateLimit.upsert({
    where: { key },
    create: {
      key,
      count: 1,
      expiresAt: new Date((window + 1) * minutes * 60000),
    },
    update: { count: { increment: 1 } },
  });
  if (row.count > max)
    throw new DomainError("Muitas tentativas. Aguarde alguns minutos.");
}
