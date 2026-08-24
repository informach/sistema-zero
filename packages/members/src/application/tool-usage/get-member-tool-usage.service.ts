import type { HubGateway } from '../../domain/ports/hub-gateway.port'
import type { ToolUsageRepository } from '../../domain/ports/tool-usage-repository.port'

/** Uso de UMA ferramenta com barra de tempo ("N criações · última atividade em X"). */
export interface ToolUsageEntryView {
  count: number
  lastActivityAt: string | null
}

export interface LearnerToolUsageView {
  /** O aprendiz (a conta no adulto; o PERFIL no kids). */
  userId: string
  pensa: { projects: number; cyclesCompleted: number; lastActivityAt: string | null }
  /** Desenhos vivos na nuvem + entregas de bloco `pinta`; lastActivity = max dos dois. */
  pinta: { drawings: number; deliveries: number; lastActivityAt: string | null }
  /** Jogos vivos na nuvem + entregas de bloco `studio`; lastActivity = max dos dois. */
  estudio: { creations: number; deliveries: number; lastActivityAt: string | null }
  /** Participação APROVADA no Clube. `null` = hub indisponível (não é "zero"). */
  clube: { posts: number; comments: number; lastActivityAt: string | null } | null
  /** Jogos publicados no Mural + jogadas. `null` = hub indisponível. */
  mural: { published: number; plays: number; lastPublishedAt: string | null } | null
}

export interface MemberToolUsageView {
  learners: LearnerToolUsageView[]
}

/**
 * USO das ferramentas por aprendiz (ficha admin): Pensa/Pinta/Estúdio dos dados
 * locais (lote, sem N+1) + Clube/Mural via hub S2S **best-effort** (hub fora →
 * campos `null`, a rota NUNCA 500a). 1 chamada por FAMÍLIA: `userId` (conta) +
 * `profileIds` (perfis kids) viram a lista de aprendizes.
 */
export class GetMemberToolUsageService {
  constructor(
    private readonly toolUsage: ToolUsageRepository,
    private readonly hub: HubGateway,
  ) {}

  async execute(userId: string, profileIds: string[] = []): Promise<MemberToolUsageView> {
    const learners = [...new Set([userId, ...profileIds])]
    const [pensa, pintaCreations, studioCreations, pintaSubs, studioSubs, hubActivity] =
      await Promise.all([
        this.toolUsage.pensaUsageByUsers(learners),
        this.toolUsage.creationsUsageByUsers(learners, 'pinta'),
        this.toolUsage.creationsUsageByUsers(learners, 'studio'),
        this.toolUsage.submissionsUsageByUsers(learners, 'pinta'),
        this.toolUsage.submissionsUsageByUsers(learners, 'studio'),
        this.hub.listActivityByAuthors(learners),
      ])
    const hubBy = hubActivity ? new Map(hubActivity.map((a) => [a.authorId, a])) : null

    return {
      learners: learners.map((learnerId) => {
        const p = pensa.get(learnerId)
        const pinta = combineTool(pintaCreations.get(learnerId), pintaSubs.get(learnerId))
        const estudio = combineTool(studioCreations.get(learnerId), studioSubs.get(learnerId))
        const hub = hubBy?.get(learnerId) ?? null
        return {
          userId: learnerId,
          pensa: {
            projects: p?.projects ?? 0,
            cyclesCompleted: p?.cyclesCompleted ?? 0,
            lastActivityAt: p?.lastActivityAt ? p.lastActivityAt.toISOString() : null,
          },
          pinta: { drawings: pinta.created, deliveries: pinta.delivered, lastActivityAt: pinta.at },
          estudio: {
            creations: estudio.created,
            deliveries: estudio.delivered,
            lastActivityAt: estudio.at,
          },
          // hub best-effort: null quando a FONTE caiu (hubBy null) OU o autor não
          // veio na resposta (o hub devolve TODO id pedido — ausência = defensivo).
          clube:
            hubBy === null
              ? null
              : {
                  posts: hub?.clubThreads ?? 0,
                  comments: hub?.clubComments ?? 0,
                  lastActivityAt: hub?.lastClubActivityAt ?? null,
                },
          mural:
            hubBy === null
              ? null
              : {
                  published: hub?.showcasePublished ?? 0,
                  plays: hub?.showcasePlays ?? 0,
                  lastPublishedAt: hub?.lastShowcaseAt ?? null,
                },
        }
      }),
    }
  }
}

function combineTool(
  created: { count: number; lastActivityAt: Date | null } | undefined,
  delivered: { count: number; lastActivityAt: Date | null } | undefined,
): { created: number; delivered: number; at: string | null } {
  const dates = [created?.lastActivityAt, delivered?.lastActivityAt].filter(
    (d): d is Date => d instanceof Date,
  )
  const latest = dates.length > 0 ? new Date(Math.max(...dates.map((d) => d.getTime()))) : null
  return {
    created: created?.count ?? 0,
    delivered: delivered?.count ?? 0,
    at: latest ? latest.toISOString() : null,
  }
}
