import { and, asc, between, eq, isNotNull, isNull } from 'drizzle-orm'
import type {
  AdultNoticeCandidate,
  ProfileAdultNoticeRepository,
} from '../../../domain/ports/profile-adult-notice-repository.port'
import type { Database } from './db'
import { profileAdultNotices, profiles, users } from './schema'

/**
 * Candidatos e dedupe do aviso de 18 anos. O responsável sai de `profiles.account_user_id`
 * (nunca do `profiles.id`): o perfil-padrão legado tem `id = id da conta`, mas a regra é a
 * mesma para todos. Só conta ATIVA recebe (mesmo critério do diretório de recados).
 */
export class DrizzleProfileAdultNoticeRepository implements ProfileAdultNoticeRepository {
  constructor(private readonly db: Database) {}

  async listCandidates(input: {
    birthDateFrom: string
    birthDateTo: string
    limit: number
  }): Promise<AdultNoticeCandidate[]> {
    const rows = await this.db
      .select({
        profileId: profiles.id,
        profileName: profiles.name,
        birthDate: profiles.birthDate,
        accountUserId: profiles.accountUserId,
        guardianEmail: users.email,
        guardianFirstName: users.firstName,
      })
      .from(profiles)
      .innerJoin(users, eq(users.id, profiles.accountUserId))
      .leftJoin(profileAdultNotices, eq(profileAdultNotices.profileId, profiles.id))
      .where(
        and(
          eq(profiles.status, 'active'),
          isNotNull(profiles.birthDate),
          between(profiles.birthDate, input.birthDateFrom, input.birthDateTo),
          eq(users.status, 'active'),
          isNull(profileAdultNotices.profileId),
        ),
      )
      .orderBy(asc(profiles.birthDate), asc(profiles.id))
      .limit(input.limit)
    return rows.flatMap((row) => (row.birthDate ? [{ ...row, birthDate: row.birthDate }] : []))
  }

  async markNotified(input: {
    profileId: string
    accountUserId: string
    turnedAdultOn: string
    notifiedAt: Date
  }): Promise<void> {
    await this.db
      .insert(profileAdultNotices)
      .values({
        profileId: input.profileId,
        accountUserId: input.accountUserId,
        turnedAdultOn: input.turnedAdultOn,
        notifiedAt: input.notifiedAt,
      })
      .onConflictDoNothing({ target: profileAdultNotices.profileId })
  }
}
