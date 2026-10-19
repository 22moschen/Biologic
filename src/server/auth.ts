import "server-only";
import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { z } from "zod";
import { db } from "./db";
import { rateLimit } from "./security";
import { DomainError, type Actor } from "@/lib/domain";
const credentialsSchema = z.object({
  email: z.email().max(254),
  password: z
    .string()
    .min(1)
    .max(72)
    .refine((v) => Buffer.byteLength(v) <= 72),
});
// Valid bcrypt hash used only to equalize missing-user verification time.
const dummyHash =
  "$2b$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW";
export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  pages: { signIn: "/entrar" },
  providers: [
    Credentials({
      name: "Equipe BioLogic",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const email = parsed.data.email.toLowerCase();
        await rateLimit("login", email);
        const user = await db.user.findUnique({ where: { email } });
        const ok = await compare(
          parsed.data.password,
          user?.passwordHash ?? dummyHash,
        );
        if (!ok || !user?.active) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          sessionVersion: user.sessionVersion,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        token.sv = (user as { sessionVersion?: number }).sessionVersion;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.uid);
        session.user.sessionVersion = Number(token.sv);
      }
      return session;
    },
  },
  logger: {
    error() {
      console.error(
        "Falha de autenticação. Verifique a configuração do servidor.",
      );
    },
    warn() {},
    debug() {},
  },
};
export async function requireActor(): Promise<Actor> {
  if (!process.env.NEXTAUTH_SECRET || !process.env.DATABASE_URL)
    throw new DomainError(
      "Configure a autenticação e o banco Neon para acessar a equipe.",
    );
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    throw new DomainError("Entre com sua conta para continuar.");
  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user?.active || user.sessionVersion !== session.user.sessionVersion)
    throw new DomainError("Sessão inválida. Entre novamente.");
  return {
    id: user.id,
    laboratoryId: user.laboratoryId,
    role: user.role,
    sessionVersion: user.sessionVersion,
  };
}

export async function requirePageActor(): Promise<Actor> {
  try {
    return await requireActor();
  } catch (error) {
    if (error instanceof DomainError) redirect("/entrar");
    throw error;
  }
}
