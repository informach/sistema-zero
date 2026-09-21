export interface CurrentModule {
  id: string
  title: string
  summary: string | null
  sortOrder: number
}

export interface CurrentLesson {
  id: string
  moduleId: string
  slug: string
  title: string
  sortOrder: number
}

const MODULES: {
  title: string
  summary: string
  lessonKeys: readonly string[]
}[] = [
  {
    title: 'A nave ganha vida',
    summary: 'Conheça o Estúdio e faça uma nave aparecer, se mover e ficar na tela.',
    lessonKeys: ['welcome', 'day1'],
  },
  {
    title: 'Tiros e asteroides',
    summary: 'Faça a nave atirar e crie asteroides que caem e reagem quando levam um tiro.',
    lessonKeys: ['day2', 'day3'],
  },
  {
    title: 'O jogo completo e a conquista',
    summary:
      'Coloque pontos, vidas e telas de começo e fim no seu jogo. Depois, pegue seu certificado e descubra os próximos passos com quem cuida de você.',
    lessonKeys: ['day4', 'day5', 'certificate'],
  },
]

function normalized(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function matchesRequired(key: string, lesson: CurrentLesson): boolean {
  const slug = normalized(lesson.slug)
  const title = normalized(lesson.title)
  if (key === 'welcome')
    return slug === 'boas-vindas' || title === 'boas-vindas' || title === 'onde-fica-cada-coisa'
  if (key === 'certificate') return slug === 'certificado' || title.includes('certificado')
  const day = Number(key.slice(3))
  const prefix = new RegExp(`^(?:desafio-)?dia-0?${day}(?:-|$)`)
  const titles = [
    '',
    'a-nave-ganha-vida',
    'a-nave-atira',
    'a-chuva-de-pedras',
    'o-jogo-passa-a-contar',
    'o-jogo-ganha-comeco-e-fim',
  ]
  return prefix.test(slug) || prefix.test(title) || title === titles[day]
}

function optionalKind(lesson: CurrentLesson): 'notebook' | 'parents-map' | 'continue' | null {
  const slug = normalized(lesson.slug)
  const title = normalized(lesson.title)
  if (slug === 'caderno-do-aluno' || title.includes('caderno-do-aluno')) return 'notebook'
  if (
    slug === 'mapa-dos-pais' ||
    slug === 'mapa-para-os-pais' ||
    title.includes('mapa-dos-pais') ||
    title.includes('mapa-para-os-pais')
  )
    return 'parents-map'
  if (
    slug === 'continue-criando' ||
    slug === 'continuar-criando' ||
    title === 'continue-criando' ||
    title === 'continuar-criando'
  )
    return 'continue'
  return null
}

export function planDesafioCourse(modules: CurrentModule[], lessons: CurrentLesson[]) {
  if (modules.length < 3 || modules.length > 4) {
    throw new Error(
      `O Desafio precisa ter 3 módulos, ou 4 com encerramento antigo; encontrados: ${modules.length}`,
    )
  }
  const orderedModules = [...modules].sort((a, b) => a.sortOrder - b.sortOrder)
  const oldEndingModule = orderedModules[3] ?? null
  const found = new Map<string, CurrentLesson>()
  for (const key of MODULES.flatMap((module) => module.lessonKeys)) {
    const candidates = lessons.filter((lesson) => matchesRequired(key, lesson))
    if (candidates.length !== 1) {
      throw new Error(
        `Aula obrigatória ${key}: esperada 1 correspondência, encontradas ${candidates.length}`,
      )
    }
    found.set(key, candidates[0] as CurrentLesson)
  }
  const keptIds = new Set([...found.values()].map((lesson) => lesson.id))
  if (keptIds.size !== 7) throw new Error('Uma aula corresponde a mais de um dia do Desafio')

  const optional = new Map<string, CurrentLesson>()
  const unexpected: CurrentLesson[] = []
  for (const lesson of lessons) {
    if (keptIds.has(lesson.id)) continue
    const kind = optionalKind(lesson)
    if (!kind) {
      unexpected.push(lesson)
      continue
    }
    if (optional.has(kind)) throw new Error(`Há mais de uma aula opcional do tipo ${kind}`)
    optional.set(kind, lesson)
  }
  if (unexpected.length > 0) {
    throw new Error(`Aulas inesperadas: ${unexpected.map((lesson) => lesson.slug).join(', ')}`)
  }
  if (
    oldEndingModule &&
    lessons.some(
      (lesson) =>
        lesson.moduleId === oldEndingModule.id &&
        lesson.id !== found.get('certificate')?.id &&
        optionalKind(lesson) !== 'continue',
    )
  ) {
    throw new Error('O quarto módulo contém aulas além do certificado e Continue criando')
  }

  const targetModules = orderedModules.slice(0, MODULES.length)
  const moduleChanges = targetModules.map((current, index) => {
    const desired = MODULES[index]!
    return {
      id: current.id,
      from: { title: current.title, summary: current.summary },
      to: { title: desired.title, summary: desired.summary },
      changed: current.title !== desired.title || current.summary !== desired.summary,
    }
  })
  const lessonChanges = targetModules.flatMap((module, index) =>
    MODULES[index]!.lessonKeys.map((key, sortOrder) => {
      const current = found.get(key)!
      return {
        key,
        id: current.id,
        slug: current.slug,
        title: current.title,
        from: { moduleId: current.moduleId, sortOrder: current.sortOrder },
        to: { moduleId: module.id, sortOrder },
        changed: current.moduleId !== module.id || current.sortOrder !== sortOrder,
      }
    }),
  )
  const deletions = [...optional.entries()].map(([kind, lesson]) => ({ kind, ...lesson }))
  return {
    modules: moduleChanges,
    removeOldEndingModule: oldEndingModule
      ? { id: oldEndingModule.id, title: oldEndingModule.title }
      : null,
    lessons: lessonChanges,
    deletions,
    changed:
      moduleChanges.some((module) => module.changed) ||
      lessonChanges.some((lesson) => lesson.changed) ||
      deletions.length > 0 ||
      oldEndingModule !== null,
  }
}
