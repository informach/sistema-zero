import { describe, expect, test } from 'bun:test'
import {
  hasHorizonNode,
  journeyHorizon,
  journeyProgress,
  levelsBeyondHorizon,
  nextLevelHintWithin,
  promisedNextLevel,
  readySlotsByTier,
  TIER_ORDER,
  visibleJourneyLevels,
} from '../src/lib/journey-horizon'
import { LEVEL_ORDER } from '../src/lib/level-info'
import type { CatalogCourseView, StudentLevelSlug, StudentLevelView } from '../src/lib/types'

/**
 * O horizonte é a régua PROVISÓRIA: enquanto o catálogo não tem os 48 cursos, o mapa mostra
 * só o que dá para alcançar e o contador conta só o que existe. O teste que mais importa é o
 * do CATÁLOGO CHEIO — é ele que garante que a visão definitiva volta sozinha, sem ninguém
 * lembrar de desligar nada.
 */

type Track = NonNullable<CatalogCourseView['track']>
type Level = NonNullable<CatalogCourseView['level']>

let seq = 0
function course(level: Level, track: Track, careerSlot: number | null): CatalogCourseView {
  seq += 1
  return {
    courseSlug: `curso-${seq}`,
    title: `Curso ${seq}`,
    subtitle: null,
    coverImageUrl: null,
    hasAccess: true,
    level,
    track,
    careerSlot,
    salesPageUrl: null,
  }
}

/**
 * Posições obrigatórias por degrau. UMA exceção ao 8: a ENTRADA tem 1 (o curso que a Faísca
 * faz). Soma: 49. O Iniciante 2D teve 7 entre 14/08 e 15/08 e a usuária desfez.
 */
const SLOTS_POR_DEGRAU: Record<string, number> = {
  'primeiros-passos-2d': 1,
}

/** O degrau inteiro, com o número de posições que ELE tem. */
function fullTier(level: Level, track: Track): CatalogCourseView[] {
  const total = SLOTS_POR_DEGRAU[`${level}-${track}`] ?? 8
  return Array.from({ length: total }, (_, index) => course(level, track, index + 1))
}

/** O curso de ENTRADA sozinho: a régua do Construtor(a). */
const entrada = () => course('primeiros-passos', '2d', 1)

/** O catálogo COMPLETO da jornada: 1 + 8×6 = 49 posições. */
function fullCatalog(): CatalogCourseView[] {
  return [
    ...fullTier('primeiros-passos', '2d'),
    ...fullTier('iniciante', '2d'),
    ...fullTier('iniciante', '3d'),
    ...fullTier('intermediario', '2d'),
    ...fullTier('intermediario', '3d'),
    ...fullTier('avancado', '2d'),
    ...fullTier('avancado', '3d'),
  ]
}

/** `remaining` como o members devolve: quanto falta por degrau para o PRÓXIMO nível. */
function studentLevel(
  slug: StudentLevelSlug,
  next: StudentLevelSlug | null,
  remaining: Partial<Record<(typeof TIER_ORDER)[number], number>> = {},
): StudentLevelView {
  if (!next) return { slug, next: null, remaining: null }
  return {
    slug,
    next,
    remaining: {
      any: 0,
      'primeiros-passos-2d': 0,
      'iniciante-2d': 0,
      'iniciante-3d': 0,
      'intermediario-2d': 0,
      'intermediario-3d': 0,
      'avancado-2d': 0,
      'avancado-3d': 0,
      ...remaining,
    },
  }
}

describe('journeyHorizon', () => {
  test('catálogo vazio para na entrada (Faísca)', () => {
    expect(journeyHorizon([])).toBe('noob')
  })

  test('só o curso de ENTRADA alcança o Construtor', () => {
    expect(journeyHorizon([entrada()])).toBe('coder')
  })

  test('cursos do Iniciante 2D sem o de entrada não movem nada', () => {
    // A régua do Construtor(a) é o degrau de entrada; gravar o Iniciante 2D primeiro não
    // adianta o horizonte.
    expect(journeyHorizon(fullTier('iniciante', '2d'))).toBe('noob')
  })

  test('degrau incompleto não passa do Construtor', () => {
    const courses = [entrada(), ...[1, 2, 3].map((slot) => course('iniciante', '2d', slot))]
    expect(journeyHorizon(courses)).toBe('coder')
  })

  test('Iniciante 2D inteiro alcança o Inventor', () => {
    expect(journeyHorizon([entrada(), ...fullTier('iniciante', '2d')])).toBe('hacker')
  })

  test('curso bônus (sem posição) NÃO move o horizonte', () => {
    const courses = [
      entrada(),
      ...fullTier('iniciante', '2d'),
      course('iniciante', '2d', null),
      course('primeiros-passos', '2d', null),
    ]
    expect(journeyHorizon(courses)).toBe('hacker')
  })

  test('curso de nível Lenda NÃO move o horizonte', () => {
    expect(journeyHorizon([entrada(), course('lenda', '2d', null)])).toBe('coder')
  })

  test('degrau posterior completo não pula o buraco do anterior', () => {
    // Iniciante 3D inteiro, mas o Iniciante 2D está vazio: para no Construtor.
    expect(journeyHorizon([entrada(), ...fullTier('iniciante', '3d')])).toBe('coder')
  })

  test('⭐ catálogo DESCONHECIDO (busca falhou) não encolhe nada', () => {
    // Soluço de rede não pode tirar posto conquistado da tela: sem catálogo, cai na
    // visão definitiva (os 8 postos e os números crus do members).
    expect(journeyHorizon(null)).toBe('god')
    expect(visibleJourneyLevels('noob', journeyHorizon(null))).toEqual(LEVEL_ORDER)
    const level = studentLevel('coder', 'hacker', { 'iniciante-2d': 8 })
    expect(journeyProgress(level, null)).toMatchObject({
      kind: 'pending',
      remaining: 8,
      done: 0,
      ready: 8,
    })
  })

  test('⭐ catálogo COMPLETO chega na Lenda — a visão definitiva volta sozinha', () => {
    const all = fullCatalog()
    expect(journeyHorizon(all)).toBe('god')
    const visible = visibleJourneyLevels('noob', journeyHorizon(all))
    expect(visible).toEqual(LEVEL_ORDER)
    expect(hasHorizonNode(visible)).toBe(false)
    expect(levelsBeyondHorizon(visible)).toEqual([])
  })
})

describe('visibleJourneyLevels', () => {
  test('mostra até o horizonte', () => {
    expect(visibleJourneyLevels('noob', 'coder')).toEqual(['noob', 'coder'])
    expect(hasHorizonNode(visibleJourneyLevels('noob', 'coder'))).toBe(true)
  })

  test('nunca corta o nível do aluno (equipe resolve como Lenda)', () => {
    expect(visibleJourneyLevels('god', 'coder')).toEqual(LEVEL_ORDER)
  })

  test('slug desconhecido não quebra o mapa', () => {
    expect(visibleJourneyLevels('inexistente', 'coder')).toEqual(['noob', 'coder'])
  })

  test('os postos além do horizonte são o conteúdo do painel', () => {
    const visible = visibleJourneyLevels('noob', 'coder')
    expect(levelsBeyondHorizon(visible)).toEqual([
      'hacker',
      'explorer',
      'elite',
      'architect',
      'champion',
      'god',
    ])
  })
})

describe('readySlotsByTier', () => {
  test('agrupa por degrau e ignora bônus', () => {
    const ready = readySlotsByTier([
      course('iniciante', '2d', 1),
      course('iniciante', '2d', 3),
      course('iniciante', '3d', 1),
      course('iniciante', '2d', null),
    ])
    expect([...(ready.get('iniciante-2d') ?? [])].sort()).toEqual([1, 3])
    expect([...(ready.get('iniciante-3d') ?? [])]).toEqual([1])
  })

  test('track ausente conta como 2d (members antigo)', () => {
    const legacy = { ...course('iniciante', '2d', 1), track: undefined }
    expect(readySlotsByTier([legacy]).get('iniciante-2d')?.has(1)).toBe(true)
  })
})

describe('journeyProgress', () => {
  test('Faísca com o curso de entrada publicado: falta 1 (e ele existe)', () => {
    const level = studentLevel('noob', 'coder', { 'primeiros-passos-2d': 1 })
    const progress = journeyProgress(level, [entrada()])
    expect(progress).toMatchObject({ kind: 'pending', remaining: 1, done: 0, ready: 1 })
  })

  test('⭐ o degrau de ENTRADA cabe no catálogo de hoje, então a frase honesta VOLTA', () => {
    // Com 1 posição só, o degrau da Faísca fica CHEIO com o curso que já existe — e a
    // regra "não diga quanto falta com o degrau pela metade" deixa de silenciar aqui.
    const level = studentLevel('noob', 'coder', { 'primeiros-passos-2d': 1 })
    expect(nextLevelHintWithin(level, [entrada()])).toBe(
      'Falta 1 curso para você virar Construtor(a). Termine e publique o seu jogo no Mural!',
    )
  })

  test('⭐ Construtor com só o curso-base no catálogo fica EM DIA, não "faltam 8"', () => {
    // O members diz que faltam 8 posições para o Inventor; nenhuma delas foi gravada.
    const level = studentLevel('coder', 'hacker', { 'iniciante-2d': 8 })
    expect(journeyProgress(level, [entrada()])).toEqual({ kind: 'up-to-date' })
  })

  test('Construtor com 3 cursos gravados e 1 feito: faltam 2, não 7', () => {
    // O degrau tem 8 posições: o members dizendo "faltam 7" significa 1 já qualificada.
    const level = studentLevel('coder', 'hacker', { 'iniciante-2d': 7 })
    const courses = [1, 2, 3].map((slot) => course('iniciante', '2d', slot))
    expect(journeyProgress(level, courses)).toMatchObject({
      kind: 'pending',
      remaining: 2,
      done: 1,
      ready: 3,
    })
  })

  test('curso despublicado depois de qualificado não gera número negativo', () => {
    // Fez 3, mas só 2 seguem publicados: o clamp segura em "em dia".
    const level = studentLevel('coder', 'hacker', { 'iniciante-2d': 5 })
    const courses = [1, 2].map((slot) => course('iniciante', '2d', slot))
    expect(journeyProgress(level, courses)).toEqual({ kind: 'up-to-date' })
  })

  test('pega o PRIMEIRO degrau pendente na ordem da jornada', () => {
    const level = studentLevel('hacker', 'explorer', { 'iniciante-3d': 8 })
    const courses = [entrada(), ...fullTier('iniciante', '2d'), ...fullTier('iniciante', '3d')]
    expect(journeyProgress(level, courses)).toMatchObject({
      kind: 'pending',
      tier: 'iniciante-3d',
      ready: 8,
    })
  })

  test('degrau pendente sem curso gravado é "em dia" mesmo com degrau posterior cheio', () => {
    const level = studentLevel('coder', 'hacker', { 'iniciante-2d': 7 })
    const courses = [entrada(), ...fullTier('iniciante', '3d')]
    expect(journeyProgress(level, courses)).toEqual({ kind: 'up-to-date' })
  })

  test('Lenda não tem próximo nível', () => {
    expect(journeyProgress(studentLevel('god', null), fullCatalog())).toEqual({ kind: 'top' })
    expect(journeyProgress(null, fullCatalog())).toEqual({ kind: 'top' })
  })
})

describe('nextLevelHintWithin', () => {
  test('⭐⭐ degrau INCOMPLETO não diz quanto falta (a régua do posto não mudou)', () => {
    // A criança precisa dos 8 para virar Inventor(a). Com 3 gravados, dizer "faltam 2" é
    // mentira: ela fecha os 2 e não sobe. Falsa esperança é pior que silêncio.
    // ⚠️ O 7 na lista é a FRONTEIRA que mudou em 15/08: sete cursos publicados já foram o
    // degrau cheio e hoje são um degrau incompleto, que precisa continuar em silêncio.
    const level = studentLevel('coder', 'hacker', { 'iniciante-2d': 7 })
    for (const publicados of [1, 2, 3, 6, 7]) {
      const catalogo = Array.from({ length: publicados }, (_, i) =>
        course('iniciante', '2d', i + 1),
      )
      expect(nextLevelHintWithin(level, catalogo)).toBeNull()
    }
  })

  test('⭐ degrau CHEIO volta a dizer, com o número VERDADEIRO do members', () => {
    const level = studentLevel('coder', 'hacker', { 'iniciante-2d': 7 })
    expect(nextLevelHintWithin(level, fullTier('iniciante', '2d'))).toBe(
      'Faltam 7 cursos para você virar Inventor(a). Termine e publique os seus jogos no Mural!',
    )
    const quaseLa = studentLevel('coder', 'hacker', { 'iniciante-2d': 1 })
    expect(nextLevelHintWithin(quaseLa, fullTier('iniciante', '2d'))).toBe(
      'Falta 1 curso para você virar Inventor(a). Termine e publique o seu jogo no Mural!',
    )
  })

  test('a frase não usa vocabulário interno (degrau, etapa, curso-base)', () => {
    const level = studentLevel('coder', 'hacker', { 'iniciante-2d': 3 })
    const frase = nextLevelHintWithin(level, fullTier('iniciante', '2d')) ?? ''
    expect(frase).not.toContain('Iniciante 2D')
    expect(frase).not.toContain('etapa')
    expect(frase).not.toContain('curso-base')
    expect(frase).not.toContain('—')
  })

  test('em dia e topo não têm frase (a UI mostra a própria)', () => {
    const level = studentLevel('coder', 'hacker', { 'iniciante-2d': 7 })
    expect(nextLevelHintWithin(level, [entrada()])).toBeNull()
    expect(nextLevelHintWithin(studentLevel('god', null), fullCatalog())).toBeNull()
  })
})

describe('promisedNextLevel (o cartão "Próximo nível" da trilha)', () => {
  test('promete o posto quando o degrau está todo publicado e ainda falta curso', () => {
    const level = studentLevel('coder', 'hacker', { 'iniciante-2d': 3 })
    expect(promisedNextLevel(level, fullTier('iniciante', '2d'))).toBe('hacker')
  })

  test('cala com o degrau pela metade: o mapa esconde o posto e o cartão não pode prometê-lo', () => {
    const level = studentLevel('coder', 'hacker', { 'iniciante-2d': 3 })
    // Metade dos cursos do degrau publicados: o `hint` já cala por isso.
    const meio = [entrada(), course('iniciante', '2d', 1), course('iniciante', '2d', 2)]
    expect(nextLevelHintWithin(level, meio)).toBeNull()
    expect(promisedNextLevel(level, meio)).toBeNull()
  })

  test('quem já fez tudo o que existe, e o topo, também não veem o cartão', () => {
    const emDia = studentLevel('coder', 'hacker', { 'iniciante-2d': 7 })
    expect(promisedNextLevel(emDia, [entrada()])).toBeNull()
    expect(promisedNextLevel(studentLevel('god', null), fullCatalog())).toBeNull()
    expect(promisedNextLevel(null, fullCatalog())).toBeNull()
  })
})

describe('TIER_ORDER', () => {
  test('são os 7 degraus na ordem da jornada, sem repetir', () => {
    expect(TIER_ORDER).toEqual([
      'primeiros-passos-2d',
      'iniciante-2d',
      'iniciante-3d',
      'intermediario-2d',
      'intermediario-3d',
      'avancado-2d',
      'avancado-3d',
    ])
  })
})
