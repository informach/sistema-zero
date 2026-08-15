import type { Logger } from '@sistemazero/core/logging'
import type { CourseAudience } from '../../domain/course/course'
import type { GamificationRepository } from '../../domain/ports/gamification-repository.port'
import type {
  StudioBlockGrant,
  StudioUnlockRepository,
} from '../../domain/ports/studio-unlock-repository.port'

export interface StudioUnlocksView {
  /** Blocos que a criança pode usar no Estúdio livre. Vazio = nenhum curso liberou nada. */
  blocks: string[]
}

/**
 * A paleta do Estúdio livre, montada pelo CURRÍCULO (08/2026).
 *
 * Antes o conjunto de blocos era fixo por NÍVEL da carreira. Agora cada curso declara
 * o que libera (`metadata.studioUnlockBlocks`) e o aluno tem a UNIÃO dos cursos
 * elegíveis: bônus Kids exige conclusão; curso Kids com posição e curso Adult exigem
 * também publicação no Mural.
 *
 * A união tem duas metades, e as duas são necessárias:
 * - **ao vivo** (`listStudioUnlocksByCourse`): lê o JSON ATUAL dos cursos elegíveis,
 *   então um bloco ACRESCENTADO chega sozinho em quem já atende ao critério atual;
 * - **congelada** (`listGrants`): o que já foi servido a este aluno, para que remover um
 *   bloco do JSON, despublicar ou apagar o curso NÃO tire a ferramenta da mão de quem já
 *   a tinha (nem de projetos que já a usam).
 *
 * ⚠️ O congelamento acontece AQUI, na leitura, e não num hook nos marcos: assim "não
 * perde" significa exatamente "não perde o que já lhe foi servido", que é a promessa que
 * dá para cumprir. A escrita só ocorre quando a união REALMENTE cresceu — página aberta
 * sem novidade não escreve nada. É best-effort: falhar em congelar não pode negar a
 * paleta a quem tem direito a ela (o pior caso é congelar na próxima visita).
 */
export class GetStudioUnlocksService {
  constructor(
    private readonly gamification: GamificationRepository,
    private readonly unlocks: StudioUnlockRepository,
    private readonly logger: Logger,
  ) {}

  async execute(userId: string, audience: CourseAudience): Promise<StudioUnlocksView> {
    const [live, frozen] = await Promise.all([
      this.gamification.listStudioUnlocksByCourse(userId, audience),
      this.unlocks.listGrants(userId, audience),
    ])

    const frozenByCourse = new Map(frozen.map((grant) => [grant.courseId, grant.blocks]))
    const merged = new Map<string, string[]>(frozenByCourse)
    const toFreeze: StudioBlockGrant[] = []

    for (const { courseId, blocks } of live) {
      const before = frozenByCourse.get(courseId) ?? []
      const union = [...new Set([...before, ...blocks])]
      merged.set(courseId, union)
      // Só grava o que cresceu — abrir o Estúdio não pode virar um UPDATE por visita.
      if (union.length > before.length) toFreeze.push({ courseId, blocks: union })
    }

    if (toFreeze.length > 0) {
      try {
        await this.unlocks.saveGrants(userId, audience, toFreeze)
      } catch (error) {
        // Congelar é proteção contra uma edição FUTURA do currículo; falhar aqui não
        // pode custar a paleta de agora.
        this.logger.error('studio_unlocks.freeze_failed', {
          userId,
          courses: toFreeze.length,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    const blocks = new Set<string>()
    for (const list of merged.values()) {
      for (const type of list) blocks.add(type)
    }
    return { blocks: [...blocks] }
  }
}
