import { describe, expect, test } from 'bun:test'
import {
  careerNodeState,
  coursesForLevel,
  LEVEL_TIER,
  levelForTier,
  nodeShowsCheck,
  tierCompletion,
  trilhaLocked,
} from '../src/lib/career-map'
import { LEVEL_ORDER } from '../src/lib/level-info'
import type { CatalogCourseView, StudentLevelView } from '../src/lib/types'

function course(over: Partial<CatalogCourseView>): CatalogCourseView {
  return {
    courseSlug: 'curso',
    title: 'Curso',
    subtitle: null,
    coverImageUrl: null,
    salesPageUrl: null,
    hasAccess: true,
    level: 'iniciante',
    track: '2d',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...over,
  } as CatalogCourseView
}

const levelView = (slug: StudentLevelView['slug']): StudentLevelView =>
  ({ slug, next: null, remaining: null }) as StudentLevelView

describe('career-map (regras puras do Mapa da Carreira)', () => {
  test('LEVEL_TIER espelha o learningTier do core (todos os níveis mapeados)', () => {
    expect(Object.keys(LEVEL_TIER)).toEqual([...LEVEL_ORDER])
    // Desde 14/08 a Faísca tem degrau PRÓPRIO; antes ela dividia o Iniciante 2D com o
    // Construtor(a) e a divisão era só apresentação.
    expect(LEVEL_TIER.noob).toBe('primeiros-passos-2d')
    expect(LEVEL_TIER.coder).toBe('iniciante-2d')
    expect(LEVEL_TIER.god).toBeNull()
  })

  test('careerNodeState: atrás = done, igual = current, à frente = locked', () => {
    expect(careerNodeState('hacker', 'noob')).toBe('done')
    expect(careerNodeState('hacker', 'hacker')).toBe('current')
    expect(careerNodeState('hacker', 'god')).toBe('locked')
    // Slug desconhecido (nível novo no backend antes do deploy) → trata como Faísca.
    expect(careerNodeState('nivel-do-futuro', 'noob')).toBe('current')
    expect(careerNodeState('nivel-do-futuro', 'coder')).toBe('locked')
  })

  test('levelForTier devolve o 1º nível que estuda a trilha', () => {
    expect(levelForTier('primeiros-passos-2d')).toBe('noob')
    expect(levelForTier('iniciante-2d')).toBe('coder')
    expect(levelForTier('iniciante-3d')).toBe('hacker')
    expect(levelForTier('avancado-3d')).toBe('champion')
  })
})

describe('coursesForLevel (cada nível é dono de um degrau inteiro)', () => {
  const entrada = [
    course({ courseSlug: 'entrada', level: 'primeiros-passos', careerSlot: 1 }),
    course({ courseSlug: 'entrada-bonus', level: 'primeiros-passos', careerSlot: null }),
  ]
  const ini2d = [
    course({ courseSlug: 'base', careerSlot: 1 }),
    course({ courseSlug: 'c2', careerSlot: 2 }),
    course({ courseSlug: 'c3', careerSlot: 3 }),
    course({ courseSlug: 'bonus', careerSlot: null }),
  ]

  test('Faísca (noob) mostra o degrau de ENTRADA inteiro, bônus incluso', () => {
    // ⭐ O bônus da Faísca é justamente o que não existia antes de 14/08: com o degrau
    // compartilhado, todo bônus do Iniciante 2D caía na trilha do Construtor(a).
    expect(
      coursesForLevel('noob', [...entrada, ...ini2d])
        .map((c) => c.courseSlug)
        .sort(),
    ).toEqual(['entrada', 'entrada-bonus'])
  })

  test('Construtor (coder) mostra o Iniciante 2D inteiro, base inclusa', () => {
    expect(
      coursesForLevel('coder', [...entrada, ...ini2d])
        .map((c) => c.courseSlug)
        .sort(),
    ).toEqual(['base', 'bonus', 'c2', 'c3'])
  })

  test('nível de degrau único (hacker) mostra o degrau inteiro (base + resto + bônus)', () => {
    const ini3d = [
      course({ courseSlug: 'b3', level: 'iniciante', track: '3d', careerSlot: 1 }),
      course({ courseSlug: 'x3', level: 'iniciante', track: '3d', careerSlot: 2 }),
      course({ courseSlug: 'bn3', level: 'iniciante', track: '3d', careerSlot: null }),
    ]
    expect(
      coursesForLevel('hacker', ini3d)
        .map((c) => c.courseSlug)
        .sort(),
    ).toEqual(['b3', 'bn3', 'x3'])
  })

  test('catálogo não etiquetado ainda aparece: curso sem posição é bônus do degrau', () => {
    // Substitui o antigo fail-open "sem curso-base, mostra o degrau inteiro": ele existia
    // porque a divisão por slot podia esvaziar a trilha da Faísca. Sem divisão, o curso
    // sem posição entra pela porta do bônus, que toda trilha abre.
    const untagged = [
      course({ courseSlug: 'u1', level: 'primeiros-passos', careerSlot: null }),
      course({ courseSlug: 'u2', level: 'primeiros-passos', careerSlot: null }),
    ]
    expect(
      coursesForLevel('noob', untagged)
        .map((c) => c.courseSlug)
        .sort(),
    ).toEqual(['u1', 'u2'])
  })

  test('só considera cursos do degrau do próprio nível', () => {
    const mixed = [
      course({ courseSlug: 'entrada', level: 'primeiros-passos', careerSlot: 1 }),
      course({ courseSlug: 'other', level: 'avancado', track: '3d', careerSlot: 1 }),
    ]
    expect(coursesForLevel('noob', mixed).map((c) => c.courseSlug)).toEqual(['entrada'])
  })

  test('Lenda (god) mostra só os cursos de NÍVEL lenda (bônus da formatura, fora da carreira)', () => {
    const mix = [
      course({ courseSlug: 'lenda1', level: 'lenda', track: '2d', careerSlot: null }),
      course({ courseSlug: 'av3d', level: 'avancado', track: '3d', careerSlot: 3 }),
      course({ courseSlug: 'av3d-bonus', level: 'avancado', track: '3d', careerSlot: null }),
      course({ courseSlug: 'lenda2', level: 'lenda', track: '3d', careerSlot: null }),
    ]
    expect(
      coursesForLevel('god', mix)
        .map((c) => c.courseSlug)
        .sort(),
    ).toEqual(['lenda1', 'lenda2'])
  })

  test('sem curso de nível lenda → trilha da Lenda vazia', () => {
    expect(coursesForLevel('god', ini2d)).toEqual([])
  })
})

describe('tierCompletion (régua MISTA: obrigatória exige o Mural, bônus só concluir)', () => {
  /** Curso de posição com os marcos que a criança tem nele. */
  const slot = (n: number, marcos?: { completed: boolean; showcased: boolean }) =>
    course({
      courseSlug: `ini-${n}`,
      level: 'iniciante',
      track: '2d',
      careerSlot: n,
      milestones: marcos,
    })
  const PRONTO = { completed: true, showcased: true }
  const SO_CONCLUIDO = { completed: true, showcased: false }

  // Três posições qualificadas de verdade (concluídas E publicadas).
  const obrigatorios = [1, 2, 3].map((n) => slot(n, PRONTO))
  const bonus = (marcos?: { completed: boolean; showcased: boolean }) =>
    course({
      courseSlug: 'ini-bonus',
      level: 'iniciante',
      track: '2d',
      careerSlot: null,
      milestones: marcos,
    })

  test('🚨 o curso BÔNUS entra na conta (era o que sumia)', () => {
    const catalogo = [...obrigatorios, bonus()]
    expect(tierCompletion('coder', catalogo)).toEqual({ done: 3, total: 4 })
    // ANTI-VÁCUO: se o bônus voltar a ser filtrado, o total cai para 3 e isto reprova.
    expect(tierCompletion('coder', catalogo).total).not.toBe(obrigatorios.length)
    // E o bônus feito soma — SÓ com a conclusão, sem pedir Mural.
    expect(tierCompletion('coder', [...obrigatorios, bonus(SO_CONCLUIDO)])).toEqual({
      done: 4,
      total: 4,
    })
  })

  test('🚨 obrigatória CONCLUÍDA mas não publicada no Mural NÃO conta', () => {
    // É a régua da carreira sendo fiel: só as aulas acabarem não qualifica a posição,
    // então o contador não pode dizer que está pronta.
    const feitasSemPublicar = [1, 2, 3].map((n) => slot(n, SO_CONCLUIDO))
    expect(tierCompletion('coder', feitasSemPublicar)).toEqual({ done: 0, total: 3 })
  })

  test('🚨 BÔNUS nunca deve o Mural (a assimetria é o ponto da régua mista)', () => {
    // Com a MESMA marcação, a posição não conta e o bônus conta. Se alguém uniformizar
    // a régua, um destes dois lados quebra.
    expect(tierCompletion('coder', [slot(1, SO_CONCLUIDO)])).toEqual({ done: 0, total: 1 })
    expect(tierCompletion('coder', [bonus(SO_CONCLUIDO)])).toEqual({ done: 1, total: 1 })
  })

  test('curso publicado que a criança NÃO pode abrir conta no total, não no done', () => {
    // É o cenário inteiro: ela fechou o degrau, eu publico algo novo, ela vê 3 de 4.
    const novo = course({
      courseSlug: 'ini-novo',
      level: 'iniciante',
      track: '2d',
      careerSlot: null,
      hasAccess: false,
      careerLock: { locked: true, reason: 'tier-reward' },
    })
    expect(tierCompletion('coder', [...obrigatorios, novo])).toEqual({ done: 3, total: 4 })
  })

  test('só conta curso da PRÓPRIA trilha', () => {
    const deOutroDegrau = course({
      courseSlug: 'ini3d-1',
      level: 'iniciante',
      track: '3d',
      careerSlot: 1,
      milestones: PRONTO,
    })
    expect(tierCompletion('coder', [...obrigatorios, deOutroDegrau])).toEqual({
      done: 3,
      total: 3,
    })
  })

  test('degrau FUTURO conta zero sozinho (não há marco lá)', () => {
    // Sem derivar de `remaining`, a guarda contra "degrau futuro lê tudo pronto"
    // deixou de ser necessária: o degrau intocado simplesmente não tem marcos.
    const do3d = [1, 2].map((n) =>
      course({ courseSlug: `ini3d-${n}`, level: 'iniciante', track: '3d', careerSlot: n }),
    )
    expect(tierCompletion('hacker', do3d)).toEqual({ done: 0, total: 2 })
  })

  test('catálogo vazio, Lenda e curso sem marcos (members antigo)', () => {
    expect(tierCompletion('coder', [])).toEqual({ done: 0, total: 0 })
    // A Lenda não estuda degrau: a trilha dela são os cursos `lenda`, todos bônus —
    // logo contados pela conclusão, sem pedir Mural.
    const formatura = course({ courseSlug: 'lenda-1', level: 'lenda', milestones: SO_CONCLUIDO })
    expect(tierCompletion('god', [formatura])).toEqual({ done: 1, total: 1 })
    // Sem o campo (members antigo): conta no total, nunca no done.
    expect(tierCompletion('coder', [slot(1), slot(2)])).toEqual({ done: 0, total: 2 })
  })
})

describe('nodeShowsCheck (o ✓ regride quando sai curso novo)', () => {
  test('posto vencido só mantém o ✓ com a trilha inteira feita', () => {
    expect(nodeShowsCheck('done', { done: 9, total: 9 })).toBe(true)
    expect(nodeShowsCheck('done', { done: 8, total: 9 })).toBe(false)
    // Trilha ainda sem curso nenhum publicado: nada a fazer, o ✓ fica.
    expect(nodeShowsCheck('done', { done: 0, total: 0 })).toBe(true)
  })

  test('nó atual e travado nunca mostram ✓', () => {
    expect(nodeShowsCheck('current', { done: 3, total: 3 })).toBe(false)
    expect(nodeShowsCheck('locked', { done: 3, total: 3 })).toBe(false)
  })

  test('⚠️ sem catálogo confiável o ✓ volta a ser posicional', () => {
    // Falha de rede não pode apagar a conquista de todo mundo. É a diferença entre
    // "progresso DESCONHECIDO" e "nada feito": a página só monta o contador quando o
    // `listMyCourses` respondeu 200; falhou → `undefined` chega aqui, não um mapa zerado.
    expect(nodeShowsCheck('done', null)).toBe(true)
    expect(nodeShowsCheck('done', undefined)).toBe(true)
    // ⚠️ ANTI-VÁCUO do achado: se a página passasse `{done:0,total:8}` no lugar do
    // `undefined`, o veterano perderia TODOS os ✓ do mapa por um soluço de rede.
    expect(nodeShowsCheck('done', { done: 0, total: 8 })).toBe(false)
  })
})

describe('trilhaLocked (deep-link por nível)', () => {
  test('trava só nível FUTURO sem nenhum curso liberado', () => {
    const lockedCourse = course({
      level: 'avancado',
      track: '3d',
      careerLock: { locked: true, reason: 'future-tier' },
    })
    // Faísca olhando a trilha do Gênio (avançado 3D), tudo travado → bloqueada.
    expect(trilhaLocked(levelView('noob'), 'champion', [lockedCourse])).toBe(true)
    // Nível alcançado → aberta (mesmo com curso travado na lista).
    expect(trilhaLocked(levelView('champion'), 'champion', [lockedCourse])).toBe(false)
    // EQUIPE/estado especial: algum curso do nível liberado → nunca mura.
    const openCourse = course({ level: 'avancado', track: '3d' })
    expect(trilhaLocked(levelView('noob'), 'champion', [openCourse])).toBe(false)
    // Sem gamificação (nível nulo) → não bloqueia (fallback fica com a página).
    expect(trilhaLocked(null, 'champion', [lockedCourse])).toBe(false)
  })
})
