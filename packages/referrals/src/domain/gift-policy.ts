/** Política registrada em cada novo resgate, sem alterar bolsas históricas. */
export const SCHOLARSHIP_ACCESS_DURATION_DAYS = 7

const DAY_MS = 24 * 60 * 60 * 1000

export function scholarshipExpiresAt(createdAt: Date, durationDays: number | null): Date | null {
  return durationDays === null ? null : new Date(createdAt.getTime() + durationDays * DAY_MS)
}
