import type { CourseAudience } from '../../domain/course/course'
import {
  CLUBE_ACCESS_REF,
  ESTUDIO_ACCESS_REF,
  LIVE_ACCESS_REF,
  type MissionAccessPredicate,
} from '../../domain/gamification/missions'
import type { LiveLessonAccessPort } from '../../domain/ports/live-lesson-access.port'
import type { AccessCheckService } from '../access-check/access-check.service'

/**
 * Predicado de posse que poda as missões GATED do pool. Um lugar só para a leitura das missões
 * e para o resgate, que precisam sortear o MESMO set (senão o resgate recusa uma missão que a
 * criança vê, ou aceita uma que ela nunca viu).
 *
 * - Equipe (privileged): passe livre.
 * - Clube e Estúdio: posse pela CONTA, a régua da rota `/members/access` (grant específico ou
 *   comunidade), as duas refs numa ida.
 * - Oficina ao vivo (14/10/2026): a vaga é da CRIANÇA (perfil + conta) e da vitrine. Sem o port
 *   (`liveSeats` ausente) a missão das oficinas simplesmente não entra.
 */
export async function resolveMissionAccess(input: {
  accessCheck: AccessCheckService
  liveSeats?: Pick<LiveLessonAccessPort, 'hasActiveSeat'>
  accountId: string
  userId: string
  audience: CourseAudience
  privileged: boolean
  now: Date
}): Promise<MissionAccessPredicate> {
  if (input.privileged) return () => true
  const [result, liveSeat] = await Promise.all([
    input.accessCheck.execute(input.accountId, [CLUBE_ACCESS_REF, ESTUDIO_ACCESS_REF]),
    input.liveSeats
      ? input.liveSeats.hasActiveSeat({
          accountId: input.accountId,
          learnerId: input.userId,
          audience: input.audience,
          now: input.now,
        })
      : Promise.resolve(false),
  ])
  const owned = new Set<string>([...result.grants, ...result.communities])
  if (liveSeat) owned.add(LIVE_ACCESS_REF)
  return (ref: string) => owned.has(ref)
}
