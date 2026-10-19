"use server";
import { requireActor } from "@/server/auth";
import { findPatients } from "@/server/patient-search";
export async function searchPatients(input: unknown) {
  try {
    return {
      ok: true as const,
      data: await findPatients(await requireActor(), input),
    };
  } catch {
    return {
      ok: false as const,
      error:
        "Não foi possível consultar pacientes. Verifique sua sessão e tente novamente.",
    };
  }
}
