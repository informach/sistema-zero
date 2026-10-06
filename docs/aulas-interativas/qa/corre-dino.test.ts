import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  evaluateLearning,
  gradeLearningQuiz,
  isLearningManifest,
} from '../../../packages/core/src/learning'
import {
  initialExperiment,
  packExperiment,
  type SceneAction,
  sceneEmitsSound,
  sceneStart,
  stepExperiment,
} from '../../../packages/core/src/learning/scene'
import { evaluateStudioSectionProject } from '../../../packages/studio/src/blockly/projectCheckAuthoring'
import { etapasDino, ORDEM_DINO, projetoDino } from './corre-dino-etapas'
import { type Block, courseProjects } from './corre-dino-projetos-qa'
import { problemasPedagogicos } from './diretrizes-pedagogicas'
import {
  aulasDino,
  ehExperiencia,
  falasSecao,
  gerarManifestoDino,
  SUA_VEZ,
  telaSecao,
} from './gerar-corre-dino'

const stages = etapasDino()
const manifests = ORDEM_DINO.map((slug) => {
  const value: unknown = JSON.parse(
    readFileSync(resolve(import.meta.dir, `../aulas/corre-dino-${slug}.manifesto.json`), 'utf8'),
  )
  if (!isLearningManifest(value)) throw new Error(`Manifesto inválido: ${slug}`)
  return value
})
const walk = (value: unknown): Block[] => {
  if (!value || typeof value !== 'object') return []
  if (Array.isArray(value)) return value.flatMap(walk)
  const record = value as Record<string, unknown>
  return [
    ...(typeof record.type === 'string' ? [value as Block] : []),
    ...Object.values(record).flatMap(walk),
  ]
}

test('os 13 marcos continuam iguais ao jogo original independente dos critérios', () => {
  const originals = courseProjects()
  for (let i = 1; i <= 13; i++) {
    expect(stages[i]).toEqual(originals[i])
    expect(projetoDino(i).blocksState).toEqual(stages[i]!.blocksState)
  }
})

for (const [index, manifest] of manifests.entries())
  test(`${manifest.lessonSlug}: continuidade, paleta, geração estável e critérios praticáveis`, () => {
    expect(gerarManifestoDino(aulasDino[index]!, index)).toEqual(manifest)
    expect(problemasPedagogicos(manifest, true)).toEqual([])
    const studio = manifest.blocks.find((b) => b.key === 'projeto')?.content
    if (studio?.kind !== 'studio') throw new Error('Projeto ausente')
    expect(studio.initialProject).toEqual(projetoDino(index))
    expect(studio.chain).toBe('corre-dino')
    expect(studio.allowedModes).toEqual(['blocks'])
    for (const block of walk(stages[index + 1])) expect(studio.allowBlocks).toContain(block.type)
    for (const section of manifest.sections) {
      const checks = section.completion?.projectChecks ?? []
      const sample = structuredClone(stages[index + 1]!)
      // O contorno existe só enquanto se confere a área; não pertence ao programa entregue.
      if (checks.some((c) => c.id === 'raio-x')) {
        const draw = walk(sample).find((b) => b.type === 'sz_g2d_draw_sprite')!
        draw.next = {
          block: {
            type: 'sz_g2d_draw_hitbox',
            fields: { SPRITE: 'dino' },
            ...(draw.next ? { next: draw.next } : {}),
          },
        }
      }
      expect(
        evaluateStudioSectionProject(checks, sample).filter((c) => !c.passed),
        section.key,
      ).toEqual([])
    }
    const last = manifest.sections.at(-1)!
    expect(last.intent).toBe('delivery')
    expect(last.completion?.blockIds).toContain('projeto')
    expect(
      evaluateStudioSectionProject(last.completion!.projectChecks!, stages[index]!).some(
        (c) => !c.passed,
      ),
    ).toBe(true)
    if (index === 1 || index === 12) {
      const withoutDescription = structuredClone(stages[index + 1]!)
      const description = walk(withoutDescription).find(
        (b) => b.type === 'sz_g2d_set_stage_description',
      )!
      description.fields!.DESCRIPTION = ''
      expect(
        evaluateStudioSectionProject(last.completion!.projectChecks!, withoutDescription).some(
          (c) => !c.passed,
        ),
        'o envio também exige a descrição que acabou de ser ensinada',
      ).toBe(true)
    }
    expect(studio.showcase?.enabled).toBe(index === 12)
  })

test('os cinco quizzes são isolados, explicam o erro e permitem corrigir', () => {
  const lessons: number[] = []
  for (const [i, manifest] of manifests.entries())
    for (const block of manifest.blocks) {
      const quiz = block.content
      if (quiz?.kind !== 'quiz') continue
      lessons.push(i + 1)
      const answers = Object.fromEntries(quiz.questions.map((q) => [q.id, q.correctChoiceIds]))
      expect(quiz.passingScore).toBe(100)
      expect(gradeLearningQuiz(quiz, answers).passed).toBe(true)
      const section = manifest.sections.find((s) => s.blockKeys.includes(block.key))!
      expect(section.blockKeys).toHaveLength(2)
      expect(section.workspaceKey).toBeNull()
      for (const question of quiz.questions) {
        expect(question.explanation?.length).toBeGreaterThan(30)
        for (const choice of question.choices.filter(
          (c) => !question.correctChoiceIds.includes(c.id),
        ))
          expect(gradeLearningQuiz(quiz, { ...answers, [question.id]: [choice.id] }).passed).toBe(
            false,
          )
      }
    }
  expect(lessons).toEqual([3, 6, 9, 11, 13])
})

test('a abertura é jogável e o caderno aparece uma vez, com consulta opcional', () => {
  const first = manifests[0]!
  const play = first.blocks.find((b) => b.key === 'jogo-pronto')?.content
  if (play?.kind !== 'interactive' || play.activity.type !== 'project-play')
    throw new Error('Jogo pronto ausente')
  expect(play.activity.project).toEqual(projetoDino(13))
  expect(play.activity.completion).toBe('participation')
  expect(first.sections[1]!.blockKeys).toContain('caderno')
  expect(first.sections[1]!.completion?.blockIds).not.toContain('caderno')
  expect(
    manifests.flatMap((m) => m.blocks).filter((b) => b.content?.kind === 'materials'),
  ).toHaveLength(1)
  expect(first.blocks.find((b) => b.key === 'caderno')?.content).toMatchObject({
    title: 'Mapa da Aventura: Corre, Dino!',
  })
})

// Vocabulário da aventura (Diretrizes, seção 6): a mesma lista do validador de roteiros e de
// vocabulario-crianca.test.ts. Os passos do Mapa da Aventura (`caderno`) viram PDF e os critérios
// aparecem em Objetivos desta parte, fora desses guardas; por isso são conferidos aqui, junto com
// títulos, Zappy e falas.
const palavrasDaEscola =
  /\b(?:aulas?|cursos?|professor(?:a|as|es)?|alun[oa]s?|seç(?:ão|ões)|cadernos?|etapas?|nota m[ií]nima)\b/i
test('a criança lê aventura: falas, Zappy e Mapa da Aventura sem palavras da escola', () => {
  for (const aula of aulasDino) {
    expect(aula.title).not.toMatch(palavrasDaEscola)
    for (const section of aula.sections)
      for (const texto of [
        section.title,
        section.bridge,
        ...falasSecao(section),
        ...(section.caderno ?? []),
        ...(section.checks ?? []).map((check) => check.label),
      ])
        expect(texto, `${aula.slug}/${section.key}`).not.toMatch(palavrasDaEscola)
  }
  // Diretrizes, seção 5: o mapa é apresentado à criança e as escolhas são convite.
  const mapa = aulasDino[0]!.sections[1]!
  expect(mapa.title).toBe('Seu Mapa da Aventura')
  const fala = falasSecao(mapa).join(' ')
  expect(fala).toStartWith('Olha aqui: este é o seu Mapa da Aventura!')
  expect(fala).toContain(
    'Se quiser, você pode ler aqui mesmo. E, se preferir, também pode clicar em Baixar para guardar o mapa e consultar onde quiser.',
  )
  expect(`${fala} ${mapa.bridge}`).not.toMatch(/não precisa/i)
})

// Diretrizes, seção 2 (06/10/2026): o vídeo da experiência e o do jogo pronto são demonstrações.
// Quem faz os testes é o narrador; ordens para quem assiste só depois de "Agora é a sua vez".
const ordemParaQuemAssiste =
  /(?:^|[.!?:]\s+)(?:Clique|Toque|Leve|Mude|Observe|Compare|Deixe|Escolha|Aumente|Coloque|Troque|Ligue|Desligue|Aproxime|Escreva|Espere|Volte|Teste|Use|Acompanhe|Mantenha|Aperte|Diminua|Pule|Repita|Continue|Faça|Veja|Sorteie|Jogue|Experimente|Mexa)\b/
test('experiências: o conceito primeiro, a demonstração na primeira pessoa e a vez só no fim', () => {
  const cenasVistas = new Set<string>()
  let total = 0
  for (const aula of aulasDino)
    for (const section of aula.sections) {
      if (!ehExperiencia(section) || section.activity?.activity.type !== 'experimentation') continue
      total++
      const falas = falasSecao(section)
      const cena = section.activity.activity.scene
      // A primeira frase diz o conceito; a cena repetida se apresenta como a mesma experiência.
      expect(falas[0], section.key).toStartWith(
        cenasVistas.has(cena)
          ? 'Esta é a mesma experiência'
          : 'Esta é uma experiência para a gente entender',
      )
      cenasVistas.add(cena)
      expect(falas[1], section.key).toStartWith('Olha aqui: ')
      expect(falas.at(-1)).toBe(SUA_VEZ)
      const demonstracao = falas.slice(0, -1).join(' ')
      expect(demonstracao, section.key).not.toMatch(ordemParaQuemAssiste)
      expect(demonstracao, section.key).toMatch(/\beu\b/)
      expect(demonstracao).not.toContain('Vou te mostrar')
      // Cena muda (a once-vs-always só escreve "♪ N vezes"): a fala não promete um som real.
      if (!sceneEmitsSound(cena)) expect(demonstracao, section.key).not.toMatch(/som toca/i)
      const tela = telaSecao(section)
      expect(tela).toContain('quem faz os testes é o narrador')
      expect(tela).not.toContain('antecipar')
      if (section.meme) expect(tela).toContain('Meme ilustrado')
      // O caderno é da criança: continua com os passos no imperativo, sem a demonstração.
      expect(section.caderno?.join(' '), section.key).toMatch(/Próxima parte\.$/)
      expect(section.caderno?.join(' ')).not.toMatch(/\beu\b|Olha aqui/)
    }
  expect(total).toBe(24)
})

test('jogo pronto: um exemplo só, na primeira pessoa, e a vez passa no fim', () => {
  const abertura = aulasDino[0]!.sections[0]!
  expect(abertura.play).toBe(true)
  const falas = falasSecao(abertura)
  expect(falas[0]).toStartWith('Esta é a versão pronta')
  expect(falas[1]).toStartWith('Olha aqui: ')
  expect(falas.slice(0, -1).join(' ')).not.toMatch(ordemParaQuemAssiste)
  expect(falas.at(-1)).toStartWith('Agora é a sua vez: jogue')
  expect(falas.at(-1)).toEndWith('Quando terminar, clique em Próxima parte.')
  expect(abertura.caderno?.join(' ')).toContain('Clique na área do jogo para começar.')
})

test('montagens seguem no imperativo e a publicação comemora com o link', () => {
  for (const aula of aulasDino)
    for (const section of aula.sections) {
      expect(falasSecao(section).join(' ')).not.toMatch(/mexa e veja/i)
      if (!section.checks?.length) continue
      expect(section.caderno, section.key).toBeUndefined()
      expect(falasSecao(section)).not.toContain(SUA_VEZ)
    }
  const entrega = aulasDino[12]!.sections.at(-1)!
  expect(entrega.publish).toBe(true)
  const fala = falasSecao(entrega).join(' ')
  expect(fala).toContain('O resumo do projeto já vem preenchido. Deixe como está.')
  expect(fala).not.toContain('título')
  expect(fala).toContain(
    'Seu jogo está no Mural! Que conquista! Agora você, sua família e seus amigos podem jogar o jogo que você criou. Clique em Copiar link de jogar',
  )
  expect(fala).toEndWith(
    'Depois de copiar o link, clique em Fechar. Por último, clique em Concluir fase.',
  )
})

const seconds = (count: number): SceneAction[] =>
  Array.from({ length: count }, () => ({ type: 'advance', seconds: 1 }))
// Cada percurso encena a instrução escrita, inclusive ações antes ocultas nas pistas.
const routes: Record<string, SceneAction[]> = {
  'aula-01/experiencia-uma-vez-e-sempre': [
    { type: 'place-in-area', card: 'move', area: 'start' },
    ...seconds(6),
    { type: 'place-in-area', card: 'move', area: 'loop' },
    ...seconds(6),
  ],
  'aula-04/experiencia-tres-areas': [
    { type: 'place-in-area', card: 'event', area: 'event' },
    ...seconds(3),
    { type: 'trigger' },
  ],
  'stage-size': [
    { type: 'border', visible: true },
    { type: 'stage', width: 600, height: 300 },
    { type: 'stage', width: 480, height: 270 },
  ],
  coordinates: [
    { type: 'place', x: 300, y: 150 },
    { type: 'place', x: 300, y: 240 },
    { type: 'place', x: 0, y: 0 },
  ],
  world: [{ type: 'create' }, { type: 'connect', port: 'draw', enabled: true }],
  'draw-loop': [
    { type: 'advance', seconds: 0.5 },
    { type: 'loop', on: true },
    { type: 'advance', seconds: 0.5 },
    { type: 'erase', on: true },
    { type: 'advance', seconds: 0.5 },
  ],
  layers: [
    { type: 'layer', front: true },
    { type: 'layer', front: false },
    { type: 'layer', front: true },
  ],
  'screen-reader': [
    { type: 'listen' },
    { type: 'describe', text: 'Corra com o dino e pule os cactos apertando espaço' },
    { type: 'listen' },
  ],
  gravity: [
    { type: 'jump', input: 'tap' },
    ...seconds(2),
    { type: 'connect', port: 'gravity', enabled: true },
    ...seconds(3),
  ],
  impulse: [
    { type: 'impulse', force: 9 },
    { type: 'jump', input: 'tap' },
    ...seconds(2),
    { type: 'impulse', force: 14 },
    { type: 'jump', input: 'tap' },
    ...seconds(2),
  ],
  'jump-sound': [
    { type: 'jump', input: 'key' },
    { type: 'advance', seconds: 0.2 },
    { type: 'jump', input: 'key' },
    ...seconds(2),
    { type: 'jump', input: 'tap' },
    ...seconds(2),
    { type: 'connect', port: 'sound', enabled: true },
    { type: 'jump', input: 'key' },
    { type: 'advance', seconds: 0.2 },
    { type: 'jump', input: 'key' },
    ...seconds(2),
    { type: 'jump', input: 'tap' },
    ...seconds(2),
  ],
  spawn: [
    ...seconds(1),
    { type: 'connect', port: 'timer', enabled: true },
    { type: 'interval', seconds: 1.4 },
    ...seconds(3),
  ],
  velocity: [
    { type: 'velocity', vx: 5, vy: 0 },
    ...seconds(1),
    { type: 'velocity', vx: -5, vy: 0 },
    ...seconds(1),
    { type: 'velocity', vx: 0, vy: 0 },
    ...seconds(1),
  ],
  cleanup: [...seconds(6), { type: 'connect', port: 'cleanup', enabled: true }, ...seconds(3)],
  'game-state': [
    ...seconds(1),
    { type: 'connect', port: 'condition', enabled: true },
    ...seconds(3),
    { type: 'start', input: 'tap' },
    ...seconds(3),
  ],
  controls: [
    { type: 'start', input: 'tap' },
    { type: 'start', input: 'key' },
    { type: 'home' },
    { type: 'connect', port: 'touch', enabled: true },
    { type: 'start', input: 'tap' },
    { type: 'home' },
    { type: 'start', input: 'key' },
  ],
  'aula-09/experiencia-contato': [{ type: 'move', distance: 50 }],
  hitbox: [
    { type: 'move', distance: 50 },
    { type: 'resize', width: 51.2 },
    { type: 'move', distance: 40 },
    { type: 'resize', width: 25.6 },
  ],
  restart: [
    { type: 'start', input: 'key' },
    ...seconds(3),
    { type: 'start', input: 'key' },
    { type: 'start', input: 'key' },
    ...seconds(3),
    { type: 'connect', port: 'restart', enabled: true },
    { type: 'start', input: 'key' },
    { type: 'start', input: 'key' },
  ],
  variable: [
    { type: 'store', value: 1 },
    { type: 'store', value: 0 },
    { type: 'change', by: 1 },
    { type: 'change', by: 1 },
    { type: 'show', on: true },
    { type: 'change', by: 1 },
  ],
  score: [
    { type: 'score-place', clock: 'frame', guarded: false },
    ...seconds(1),
    { type: 'score-place', clock: 'loose', guarded: false },
    ...seconds(1),
    { type: 'connect', port: 'condition', enabled: true },
    ...seconds(1),
    { type: 'start', input: 'key' },
    ...seconds(3),
    { type: 'collide' },
    ...seconds(2),
  ],
  random: [
    { type: 'sample', kind: 'position', unit: 0.1, guided: false },
    { type: 'sample', kind: 'position', unit: 0.9, guided: false },
    ...Array.from({ length: 8 }, () => ({
      type: 'sample' as const,
      kind: 'position' as const,
      unit: 0.1,
      guided: false,
    })),
    { type: 'sample', kind: 'velocity', unit: 0.1, guided: false },
    { type: 'sample', kind: 'velocity', unit: 0.9, guided: false },
  ],
  'number-line': [
    ...Array.from({ length: 3 }, () => ({ type: 'sum-minus-one' as const })),
    { type: 'reset' },
    { type: 'compare-op', operator: '>' },
    { type: 'step-value', value: -9 },
    { type: 'reset' },
    { type: 'compare-op', operator: '=' },
    ...Array.from({ length: 4 }, () => ({ type: 'sum-minus-one' as const })),
  ],
  acceleration: [
    ...Array.from({ length: 5 }, () => ({
      type: 'sample' as const,
      kind: 'velocity' as const,
      unit: 0,
      guided: false,
    })),
    { type: 'sample', kind: 'velocity', unit: 1, guided: false },
    { type: 'connect', port: 'limit', enabled: false },
    ...Array.from({ length: 5 }, () => ({
      type: 'sample' as const,
      kind: 'velocity' as const,
      unit: 0,
      guided: false,
    })),
  ],
}
for (const manifest of manifests)
  for (const block of manifest.blocks) {
    const content = block.content
    if (content?.kind !== 'interactive' || content.activity.type !== 'experimentation') continue
    test(`${manifest.lessonSlug}/${block.key}: a instrução escrita conclui a experiência`, () => {
      if (content.activity.type !== 'experimentation') throw new Error('Cena ausente')
      expect(content.prediction).toBeUndefined()
      expect(content.checkpoint).toBeUndefined()
      expect(content.semPerguntaFinal).toBe(true)
      expect(evaluateLearning(content, {}).passed).toBe(false)
      const start = sceneStart(content.activity)
      let session = initialExperiment(start)
      const actions =
        routes[`${manifest.lessonSlug}/${block.key}`] ?? routes[content.activity.scene]
      if (!actions) throw new Error(`Percurso ausente: ${content.activity.scene}`)
      for (const action of actions) session = stepExperiment(start, session, action).session
      const result = evaluateLearning(content, {
        sceneCheckpoint: packExperiment(content.activity.scene, session),
      })
      expect(result.passed, JSON.stringify(result)).toBe(true)
    })
  }
