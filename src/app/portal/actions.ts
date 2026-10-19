"use server";
import { cookies, headers } from "next/headers";
import { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { digest, randomToken, rateLimit } from "@/server/security";
import { tokenValid } from "@/lib/domain";
export async function exchangeToken(
  raw: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const h = await headers();
    await rateLimit(
      "portal",
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "shared",
      30,
    );
    if (!/^[A-Za-z0-9_-]{43}$/.test(raw))
      return {
        ok: false,
        error:
          "Acesso inválido, expirado ou revogado. Solicite um novo link à equipe.",
      };
    const session = randomToken();
    const accepted = await db.$transaction(
      async (tx) => {
        const token = await tx.patientAccessToken.findUnique({
          where: { hash: digest(raw) },
        });
        if (!tokenValid(token) || !token) return false;
        await tx.patientAccessToken.update({
          where: { id: token.id },
          data: { sessionHash: digest(session) },
        });
        return true;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    if (!accepted)
      return {
        ok: false,
        error:
          "Acesso inválido, expirado ou revogado. Solicite um novo link à equipe.",
      };
    (await cookies()).set("biologic-patient", session, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/portal",
      maxAge: 7 * 86400,
    });
    return { ok: true };
  } catch {
    return {
      ok: false,
      error:
        "Não foi possível validar o acesso. Aguarde alguns minutos e tente novamente.",
    };
  }
}
