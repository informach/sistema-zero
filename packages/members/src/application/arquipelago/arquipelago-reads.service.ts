import {
  adultJourneyPosition,
  type CreatorJourneyCurriculum,
  creatorJourneyCoursePlacements,
  JOURNEY_LEVEL_SLUGS,
  type JourneyLevelSlug,
} from '@sistemazero/core/journey'
import { SERVER_BLOCK_CATALOG } from '@sistemazero/studio/server-catalog'
import type { CourseAudience } from '../../domain/course/course'
import type { CourseRepository } from '../../domain/ports/course-repository.port'
import type { AdultJourneyService } from '../adult-journey/adult-journey.service'
import type { KidsJourneyQueryService } from '../kids-journey/kids-journey-query.service'
import { resolveStudioUnlockBlocks } from '../mappers/views'
import type { GetStudioUnlocksService } from '../studio-unlocks/get-studio-unlocks.service'

/** Posições da jornada (as duas têm 8; a última é a Lenda). */
const POSICOES = JOURNEY_LEVEL_SLUGS.length

export interface JogadorDoJogo {
  /** Posição na jornada, de 1 a `total`. No adulto, a etapa; a Lenda é a posição depois da última. */
  posicao: number
  total: number
  /** Blocos do Estúdio conquistados nos cursos (a mesma união do Estúdio livre, só leitura). */
  blocos: string[]
  /** Os postos cujo curso-base (2D) a pessoa concluiu (A3 do Arquipélago). */
  cursosBase: string[]
}

export interface CursoComBlocos {
  courseId: string
  titulo: string
  slug: string
  /** O posto em que o curso fica no currículo (o mais cedo, se estiver em mais de um). */
  posto: JourneyLevelSlug | null
  /** O papel do curso naquele posto (base, missão, poder, extra) ou na Maestria. */
  papel: string | null
  blocos: string[]
}

export interface CurriculoDeBlocos {
  versao: number
  cursos: CursoComBlocos[]
  /** O curso-base (2D) de cada posto, publicado (A3 e A24 do Arquipélago). */
  cursosBase: { posto: string; courseId: string; titulo: string; slug: string }[]
  /** Rótulo e categoria de cada bloco do catálogo do Estúdio (para mostrar e para conferir ids). */
  catalogo: { type: string; rotulo: string; categoria: string }[]
}

/**
 * Leituras S2S do serviço do jogo (Arquipélago): posto e blocos de quem joga e o currículo de
 * blocos (que curso publicado libera qual bloco, e em que posto). Nada aqui escreve.
 */
export class ArquipelagoReadsService {
  constructor(
    private readonly deps: {
      kidsJourney: Pick<KidsJourneyQueryService, 'get' | 'publishedCurriculum'>
      adultJourney: Pick<AdultJourneyService, 'get' | 'policy'>
      unlocks: Pick<GetStudioUnlocksService, 'read'>
      courses: Pick<CourseRepository, 'listPublishedCourses'>
    },
  ) {}

  async jogador(input: {
    userId: string
    accountId: string
    audience: CourseAudience
  }): Promise<JogadorDoJogo> {
    const blocos = this.deps.unlocks.read(input.userId, input.audience)
    if (input.audience === 'kids') {
      const view = await this.deps.kidsJourney.get({
        userId: input.userId,
        accountId: input.accountId,
      })
      return {
        posicao: JOURNEY_LEVEL_SLUGS.indexOf(view.earned.level) + 1,
        total: POSICOES,
        blocos: (await blocos).blocks,
        cursosBase: cursosBaseConcluidos(view.curriculum),
      }
    }
    const adulto = await this.deps.adultJourney.get(input.userId)
    const posicao = adultJourneyPosition(adulto)
    return {
      posicao: posicao?.position ?? 1,
      total: posicao?.total ?? POSICOES,
      blocos: (await blocos).blocks,
      cursosBase: cursosBaseConcluidos(adulto.curriculum),
    }
  }

  async curriculoDeBlocos(audience: CourseAudience): Promise<CurriculoDeBlocos> {
    const [politica, cursos] = await Promise.all([
      audience === 'kids'
        ? this.deps.kidsJourney.publishedCurriculum()
        : this.deps.adultJourney
            .policy()
            .then((p) => ({ version: p.version, curriculum: p.policy.curriculum ?? null })),
      this.deps.courses.listPublishedCourses(audience),
    ])
    const comBlocos: CursoComBlocos[] = []
    for (const curso of cursos) {
      // Oficinas ao vivo não se divulgam fora delas: "Aprenda isso em" mostra só cursos gravados.
      if (curso.modality !== 'recorded') continue
      const blocos = resolveStudioUnlockBlocks(curso)
      if (blocos.length === 0) continue
      const lugar = politica.curriculum ? lugarNoCurriculo(politica.curriculum, curso.id) : null
      comBlocos.push({
        courseId: curso.id,
        titulo: curso.title,
        slug: curso.slug,
        posto: lugar?.posto ?? null,
        papel: lugar?.papel ?? null,
        blocos,
      })
    }
    // O curso-base (2D) de cada posto, publicado, mesmo sem blocos (A3 e A24 do Arquipélago).
    const publicados = new Map(cursos.map((c) => [c.id, c]))
    const cursosBase = (politica.curriculum?.stages ?? []).flatMap((stage) => {
      const curso = publicados.get(stage.base2dCourseId)
      return curso
        ? [{ posto: stage.level, courseId: curso.id, titulo: curso.title, slug: curso.slug }]
        : []
    })
    return {
      versao: politica.version,
      cursos: comBlocos,
      cursosBase,
      catalogo: SERVER_BLOCK_CATALOG.map((b) => ({
        type: b.type,
        rotulo: b.label,
        categoria: b.category,
      })),
    }
  }
}

/**
 * Os postos cujo curso-base (o 2D da trilha) a pessoa concluiu: o Arquipélago abre o desafio na
 * linguagem do posto (Python, Ponte, Pro) só com ele (§6.28, A3). Sem currículo, nenhum.
 */
export function cursosBaseConcluidos(
  curriculo: { stages: readonly { level: string; base2d: { state: string } }[] } | null | undefined,
): string[] {
  return (curriculo?.stages ?? []).filter((s) => s.base2d.state === 'completed').map((s) => s.level)
}

/** O lugar mais cedo do curso no currículo: o posto da trilha, ou a Maestria (sem posto). */
export function lugarNoCurriculo(
  curriculum: CreatorJourneyCurriculum,
  courseId: string,
): { posto: JourneyLevelSlug | null; papel: string } | null {
  const lugares = creatorJourneyCoursePlacements(curriculum, courseId)
  if (lugares.length === 0) return null
  let melhor = lugares[0]
  for (const l of lugares) {
    const a = l.level ? JOURNEY_LEVEL_SLUGS.indexOf(l.level) : Number.POSITIVE_INFINITY
    const b = melhor?.level ? JOURNEY_LEVEL_SLUGS.indexOf(melhor.level) : Number.POSITIVE_INFINITY
    if (a < b) melhor = l
  }
  return melhor ? { posto: melhor.level ?? null, papel: melhor.role } : null
}
