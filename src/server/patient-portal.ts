import "server-only";
import { db } from "./db";
import { digest } from "./security";
import { tokenValid } from "@/lib/domain";
// The browser never chooses an attendance ID. The session hash determines exactly one token and attendance.
export async function loadPatientPortal(session: string | undefined) {
  if (!session || !process.env.DATABASE_URL) return null;
  const token = await db.patientAccessToken.findUnique({
    where: { sessionHash: digest(session) },
    select: {
      expiresAt: true,
      revokedAt: true,
      attendance: {
        select: {
          publicId: true,
          updatedAt: true,
          patient: { select: { name: true } },
          exams: { select: { id: true, snapshot: true } },
          laboratory: { select: { name: true } },
        },
      },
    },
  });
  return token && tokenValid(token) ? token.attendance : null;
}
