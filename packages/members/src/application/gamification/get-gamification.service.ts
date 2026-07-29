import type { CourseAudience } from '../../domain/course/course'
import { BADGE_SLUGS } from '../../domain/gamification/badges'
import { effectiveStreak, localDateSaoPaulo } from '../../domain/gamification/gamification'
import { computeStudentLevel } from '../../domain/gamification/levels'
import {
  type GamificationRepository,
  MAX_STREAK_FREEZES,
} from '../../domain/ports/gamification-repository.port'
import type { GamificationMeView } from '../mappers/views'

/**
 * Perfil de gamificação do aluno NA VITRINE pedida (XP/streak/badges são
 * segregados por audiência — `?audience=`, default `adult` como nas listagens).
 * Sem perfil ainda → zeros e catálogo todo bloqueado. O streak devolvido é o
 * de EXIBIÇÃO (0 quando quebrado) — o valor cru persiste e recomeça na próxima
 * atividade. `withRanking` → inclui a colocação no ranking de XP da MESMA
 * vitrine (cálculo extra — só a página de perfil pede).
 */
export class GetGamificationService {
  constructor(
    private readonly repo: GamificationRepository,
    private readonly clock: () => Date,
  ) {}

  async execute(
    userId: string,
    accountId: string,
    opts: { audience: CourseAudience; withRanking?: boolean; privileged?: boolean },
  ): Promise<GamificationMeView> {
    // XP/streak/badges são do PERFIL (`userId`); o ranking precisa da CONTA
    // (`accountId`) para a pertinência à coorte (acesso da conta na audiência).
    // Equipe (privileged) NUNCA ranqueia (só cliente conta): omite o ranking — sem isto,
    // um membro da equipe que TAMBÉM comprou um curso se via ranqueado entre os clientes.
    const now = this.clock()
    const wantsRanking = opts.withRanking && !opts.privileged
    const [profile, badges, ranking, qualifying] = await Promise.all([
      this.repo.getProfile(userId, opts.audience),
      this.repo.listBadges(userId, opts.audience),
      wantsRanking ? this.repo.getRanking(userId, accountId, opts.audience, now) : null,
      this.repo.listQualifyingCareerSlots(userId, opts.audience),
    ])
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
      badges: BADGE_SLUGS.map((slug) => ({
        slug,
        unlockedAt: unlockedBySlug.get(slug)?.toISOString() ?? null,
      })),
      // Nível do aluno (rank): derivado dos cursos qualificados (concluído + Mural).
      level: computeStudentLevel(qualifying),
      ...(ranking ? { ranking } : {}),
    }
  }
}
