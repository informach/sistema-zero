import { IdentityUuidSchema } from '@sistemazero/core/identity'
import type { KidsJourneyStaffPreview, KidsJourneyView } from '@sistemazero/core/journey'
import type { CourseAudience } from '../../domain/course/course'
import { BADGE_SLUGS, HIDDEN_UNTIL_UNLOCKED_BADGES } from '../../domain/gamification/badges'
import { effectiveStreak, localDateSaoPaulo } from '../../domain/gamification/gamification'
import { computeStudentLevel } from '../../domain/gamification/levels'
import { KidsJourneyUnavailableError } from '../../domain/kids-journey/kids-journey.errors'
import {
  type GamificationRepository,
  MAX_STREAK_FREEZES,
} from '../../domain/ports/gamification-repository.port'
import type { AdultJourneyService } from '../adult-journey/adult-journey.service'
import type { KidsJourneyProfilesService } from '../kids-journey/kids-journey-profiles.service'
import type { KidsJourneyQueryService } from '../kids-journey/kids-journey-query.service'
import { kidsStudentLevel } from '../kids-journey/kids-student-level'
import type { GamificationMeView } from '../mappers/views'

/**
 * Perfil de gamificação do aluno NA VITRINE pedida (XP/streak/badges são
 * segregados por audiência — `?audience=`, default `adult` como nas listagens).
 * Kids exige registro e política persistida; perfil ausente é indisponível. Estatísticas de
 * atividade sem XP seguem zero, sem fabricar posto/conquista. O streak devolvido é o
 * de EXIBIÇÃO (0 quando quebrado) — o valor cru persiste e recomeça na próxima
 * atividade. `withRanking` → inclui a colocação no ranking de XP da MESMA
 * vitrine (cálculo extra — só a página de perfil pede).
 */
export class GetGamificationService {
  constructor(
    private readonly repo: GamificationRepository,
    private readonly clock: () => Date,
    private readonly kidsJourney: Pick<KidsJourneyQueryService, 'get' | 'staffPreview'>,
    private readonly kidsProfiles: Pick<KidsJourneyProfilesService, 'getMany'>,
    private readonly adultJourney?: Pick<AdultJourneyService, 'get'>,
  ) {}

  async execute(
    inputUserId: string,
    inputAccountId: string,
    opts: { audience: CourseAudience; withRanking?: boolean; privileged?: boolean },
  ): Promise<GamificationMeView> {
    const captured = { ...opts }
    const userId =
      captured.audience === 'kids' ? IdentityUuidSchema.parse(inputUserId) : inputUserId
    const accountId =
      captured.audience === 'kids' ? IdentityUuidSchema.parse(inputAccountId) : inputAccountId
    if (captured.audience !== 'kids') return this.read(userId, accountId, captured, null)
    // `privileged` here is the team preview already admitted by the HTTP boundary
    // (`resolveKidsStaffPreviewActor`): the staff account or a profile of the staff's OWN
    // account, never a support session. XP/streak/badges still come from `userId` (the profile).
    if (captured.privileged) {
      const preview = await this.kidsJourney.staffPreview()
      return this.read(userId, accountId, captured, null, preview)
    }
    const kids = await this.kidsJourney.get({ userId, accountId })
    return this.read(userId, accountId, captured, kids)
  }

  /** Admin route has already authorized inspection; the profile owner comes from Members registry. */
  async inspect(inputUserId: string, audience: CourseAudience): Promise<GamificationMeView> {
    const userId = audience === 'kids' ? IdentityUuidSchema.parse(inputUserId) : inputUserId
    if (audience !== 'kids') return this.read(userId, userId, { audience }, null)
    const kids = (await this.kidsProfiles.getMany([userId])).get(userId)
    if (!kids) throw new KidsJourneyUnavailableError()
    // Ranking is deliberately absent: no account identity is fabricated for this inspection.
    return this.read(userId, null, { audience }, kids)
  }

  private async read(
    userId: string,
    accountId: string | null,
    opts: { audience: CourseAudience; withRanking?: boolean; privileged?: boolean },
    kids: KidsJourneyView | null,
    preview?: KidsJourneyStaffPreview,
  ): Promise<GamificationMeView> {
    // XP/streak/badges são do PERFIL (`userId`); o ranking precisa da CONTA
    // (`accountId`) para a pertinência à coorte (acesso da conta na audiência).
    // Equipe (privileged) NUNCA ranqueia (só cliente conta): omite o ranking — sem isto,
    // um membro da equipe que TAMBÉM comprou um curso se via ranqueado entre os clientes.
    const now = this.clock()
    const wantsRanking = opts.withRanking && !opts.privileged && accountId !== null
    const [profile, badges, ranking, qualifying, studioUnlockRevision, journey] = await Promise.all(
      [
        this.repo.getProfile(userId, opts.audience),
        this.repo.listBadges(userId, opts.audience),
        wantsRanking ? this.repo.getRanking(userId, accountId!, opts.audience, now) : null,
        opts.audience === 'adult' ? this.repo.listQualifyingJourneySlots(userId, 'adult') : null,
        opts.audience === 'kids'
          ? this.repo.getStudioUnlockRevision(userId, opts.audience).catch(() => null)
          : Promise.resolve(null),
        opts.audience === 'adult' ? this.adultJourney?.get(userId, opts.privileged) : null,
      ],
    )
    const today = localDateSaoPaulo(now)
    const unlockedBySlug = new Map(badges.map((b) => [b.badgeSlug, b.unlockedAt]))
    const onVacation =
      profile?.vacationFrom != null &&
      profile?.vacationTo != null &&
      today >= profile.vacationFrom &&
      today <= profile.vacationTo
    return {
      xp: profile?.xp ?? 0,
      // Equipe (passe livre) = moedas virtuais ilimitadas: a UI mostra ∞ (o saldo real fica 0).
      coins: {
        balance: profile?.coinBalance ?? 0,
        ...(opts.privileged ? { unlimited: true } : {}),
      },
      streak: {
        current: profile
          ? effectiveStreak(
              {
                streakCurrent: profile.streakCurrent,
                streakBest: profile.streakBest,
                lastActivityDate: profile.lastActivityDate,
                // Projeta o freeze GRÁTIS prestes a ser concedido na 1ª atividade do
                // mês (clamp no teto, igual ao `award`): senão o display mostra
                // "streak 0/quebrado" na 1ª lacuna do mês que a próxima atividade
                // ainda cobriria — culpando à toa num sistema guilt-free.
                freezes: Math.min(
                  MAX_STREAK_FREEZES,
                  profile.streakFreezes +
                    (profile.freezeGrantedMonth !== today.slice(0, 7) ? 1 : 0),
                ),
                vacationFrom: profile.vacationFrom,
                vacationTo: profile.vacationTo,
              },
              today,
            )
          : 0,
        best: profile?.streakBest ?? 0,
        activeToday: profile?.lastActivityDate === today,
        // Contrato guilt-free: a UI mostra "protegido"/"de férias" sem nunca culpar.
        freezesAvailable: profile?.streakFreezes ?? 0,
        onVacation,
        vacationUntil: onVacation ? (profile?.vacationTo ?? null) : null,
      },
      // As conquistas das oficinas ao vivo só aparecem depois de ganhas (não se divulgam).
      badges: BADGE_SLUGS.filter(
        (slug) => !HIDDEN_UNTIL_UNLOCKED_BADGES.has(slug) || unlockedBySlug.has(slug),
      ).map((slug) => ({
        slug,
        unlockedAt: unlockedBySlug.get(slug)?.toISOString() ?? null,
      })),
      level: kids ? kidsStudentLevel(kids) : qualifying ? computeStudentLevel(qualifying) : null,
      ...(kids ? { kidsJourney: kids } : {}),
      ...(preview ? { kidsPreview: preview } : {}),
      ...(journey ? { journey } : {}),
      ...(studioUnlockRevision ? { studioUnlockRevision } : {}),
      ...(ranking ? { ranking } : {}),
    }
  }
}
