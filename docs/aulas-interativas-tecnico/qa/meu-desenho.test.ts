import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  isLearningManifest,
  type LearningManifest,
  type LessonSection,
} from '../../../packages/core/src/learning'
import { artSlotCourseIssues } from '../../../packages/core/src/learning/art-slots'
import { remapStudioExampleSections } from '../../../packages/core/src/learning/authoring-manifest-projection'
import {
  executionRuleBudgetMs,
  isExecutionRule,
  isSectionExecutionRule,
  type SectionExecutionRule,
} from '../../../packages/core/src/learning/project-execution'
import { readManifestStudioProjectExamples } from '../../../packages/core/src/learning/studio-project-examples'
import { pintaAssetFromWire } from '../../../packages/pinta/src/assets/wire'
import { sanitizePintaAsset } from '../../../packages/pinta/src/core/project'
import { resolveBlockLevel } from '../../../packages/studio/src/blockly/blockLevels'
import {
  evaluateStudioSectionProject,
  studioSectionCompletionIssues,
} from '../../../packages/studio/src/blockly/projectCheckAuthoring'
import { meuDesenhoChecks } from './meu-desenho-criterios'
import {
  CHAVE_DO_JOGO,
  projetoComMinhaChave,
  projetoInicialMeuDesenho,
  QUADRO_DA_CHAVE,
  VAGA_CHAVE,
} from './meu-desenho-projeto'

const dir = resolve(import.meta.dir, '../../aulas-interativas/faisca/meu-primeiro-desenho-no-pinta')

function manifesto(): LearningManifest {
  const value = JSON.parse(readFileSync(resolve(dir, 'meu-desenho-aula-1.manifesto.json'), 'utf8'))
  if (!isLearningManifest(value)) throw new Error('Manifesto inválido')
  return value
}

/** O manifesto como a aula publicada o enxerga (ids = chaves), para as réguas de publicação. */
function aula(m: LearningManifest) {
  const uuid = (n: number) => `00000000-0000-4000-8000-${String(n + 1).padStart(12, '0')}`
  const ids = new Map(m.sections.map((section, i) => [section.key, uuid(i)]))
  const sections = m.sections.map((section) => ({
    ...section,
    id: ids.get(section.key)!,
    blockIds: section.blockKeys,
    workspaceBlockId: section.workspaceKey,
  })) as unknown as LessonSection[]
  const blocks = m.blocks.map((block) => ({
    id: block.key,
    content: !('content' in block)
      ? { kind: 'video' }
      : 'projectExamples' in block.content
        ? {
            ...block.content,
            projectExamples: remapStudioExampleSections(
              portavel(block.content.projectExamples),
              (key) => ids.get(key),
            ),
          }
        : block.content,
  }))
  return { sections, blocks }
}

function portavel(value: unknown) {
  const read = readManifestStudioProjectExamples(value)
  if (read.kind !== 'valid') throw new Error('Exemplos inválidos')
  return read.value
}

const bloco = (m: LearningManifest, key: string) => {
  const block = m.blocks.find((b) => b.key === key)
  if (!block || !('content' in block)) throw new Error(`Bloco ausente: ${key}`)
  return block.content as Record<string, unknown>
}

describe('Meu primeiro desenho no Pinta', () => {
  test('o manifesto é válido, do curso reservado, com as quatro partes na ordem', () => {
    const m = manifesto()
    expect(m.courseSlug).toBe('jornada-faisca-extra-2')
    expect(m.lessonSlug).toBe('aula-1')
    expect(m.sections.map((s) => [s.key, s.intent])).toEqual([
      ['abertura', 'explanation'],
      ['material', 'material'],
      ['desenhar', 'delivery'],
      ['trocar', 'closing'],
    ])
  })

  test('as conclusões passam pelas réguas de publicação do core e do Estúdio', () => {
    const { sections, blocks } = aula(manifesto())
    expect(studioSectionCompletionIssues(sections, blocks)).toEqual([])
  })

  test('o desenho é entregue ANTES do jogo, e as duas entregas pedem o envio em dia', () => {
    const m = manifesto()
    const desenhar = m.sections.find((s) => s.key === 'desenhar')!
    const trocar = m.sections.find((s) => s.key === 'trocar')!
    expect(desenhar.workspaceKey).toBe('desenho')
    expect(desenhar.completion?.blockIds).toContain('desenho')
    expect(desenhar.completion?.submissionUpToDate).toBe(true)
    expect(trocar.workspaceKey).toBe('projeto')
    expect(trocar.completion?.blockIds).toContain('projeto')
    expect(trocar.completion?.submissionUpToDate).toBe(true)
    // Sem experiência nem quiz: a aula é de ferramenta, não de lógica nova.
    expect(m.blocks.some((b) => 'content' in b && b.content.kind === 'quiz')).toBe(false)
    expect(
      m.blocks.some(
        (b) =>
          'content' in b &&
          b.content.kind === 'interactive' &&
          (b.content as { activity?: { type?: string } }).activity?.type === 'experimentation',
      ),
    ).toBe(false)
  })

  test('a vaga de arte liga o Pinta ao Estúdio sem nenhum problema de curso', () => {
    const m = manifesto()
    const pinta = bloco(m, 'desenho')
    const studio = bloco(m, 'projeto')
    expect(pinta.artSlot).toEqual({ name: VAGA_CHAVE, replaces: CHAVE_DO_JOGO })
    expect(studio.artSlots).toEqual([{ name: VAGA_CHAVE, mode: 'add' }])
    const order = (key: string) => [
      0,
      0,
      m.sections.findIndex((s) => s.blockKeys.includes(key)),
      m.blocks.findIndex((b) => b.key === key),
    ]
    const initial = studio.initialProject as { assets: { name: string; kind: string }[] }
    const base = { lessonId: 'aula-1', lessonTitle: m.title }
    expect(
      artSlotCourseIssues([
        {
          ...base,
          kind: 'pinta',
          blockId: 'desenho',
          order: order('desenho'),
          slot: pinta.artSlot as never,
        },
        {
          ...base,
          kind: 'studio',
          blockId: 'projeto',
          order: order('projeto'),
          slots: studio.artSlots as never,
          imageNames: initial.assets.filter((a) => a.kind === 'image').map((a) => a.name),
        },
      ]),
    ).toEqual([])
    // O jogo inicial tem a chave do jogo e NÃO tem a imagem da vaga (o `add` colidiria).
    const names = initial.assets.map((a) => a.name)
    expect(names).toContain(CHAVE_DO_JOGO)
    expect(names).not.toContain(VAGA_CHAVE)
  })

  test('o desenho inicial é um quadro vetorial quadrado, vazio e com o nome da vaga', () => {
    const pinta = bloco(manifesto(), 'desenho')
    const asset = sanitizePintaAsset(pintaAssetFromWire(pinta.initialAsset))
    expect(asset?.kind).toBe('vector-sprite')
    if (asset?.kind !== 'vector-sprite') return
    expect([asset.frameWidth, asset.frameHeight]).toEqual([QUADRO_DA_CHAVE, QUADRO_DA_CHAVE])
    expect(asset.name).toBe(VAGA_CHAVE)
    expect(asset.animations.flatMap((a) => a.frames).every((f) => f.length === 0)).toBe(true)
    expect(pinta.purpose).toBe('submission')
    expect(pinta.allowTools).toEqual(['select', 'ellipse', 'rect', 'brush', 'fit'])
  })

  test('o objetivo da montagem: o gabarito cumpre, o jogo inicial não', () => {
    const estrutura = meuDesenhoChecks.filter((c) => !isExecutionRule(c.rule)) as Parameters<
      typeof evaluateStudioSectionProject
    >[0]
    expect(estrutura).toHaveLength(1)
    expect(evaluateStudioSectionProject(estrutura, projetoComMinhaChave())[0]?.passed).toBe(true)
    expect(evaluateStudioSectionProject(estrutura, projetoInicialMeuDesenho())[0]?.passed).toBe(
      false,
    )
  })

  test('o objetivo que roda o jogo é válido e cabe no prazo da parte', () => {
    const exec = meuDesenhoChecks.filter((c) => isExecutionRule(c.rule))
    expect(exec).toHaveLength(1)
    for (const c of exec) expect(isSectionExecutionRule(c.rule)).toBe(true)
    const total = exec.reduce(
      (s, c) => s + executionRuleBudgetMs(c.rule as SectionExecutionRule),
      0,
    )
    expect(total).toBeLessThanOrEqual(40_000)
  })

  test('o gabarito só troca a imagem da chave e põe o desenho nos materiais', () => {
    const inicial = projetoInicialMeuDesenho()
    const gabarito = projetoComMinhaChave()
    expect(gabarito.files['script.js']).toBe(
      inicial.files['script.js'].replace(`"${CHAVE_DO_JOGO}"`, `"${VAGA_CHAVE}"`),
    )
    const desenho = gabarito.assets?.find((a) => a.name === VAGA_CHAVE)
    expect(desenho?.source).toBe('lesson-art')
    expect(desenho?.dataUrl.startsWith('data:image/svg+xml;base64,')).toBe(true)
  })

  test('os exemplos do Estúdio são válidos e a paleta é só do iniciante, sem HTML nem CSS', () => {
    const studio = bloco(manifesto(), 'projeto')
    expect(readManifestStudioProjectExamples(studio.projectExamples).kind).toBe('valid')
    const blocks = studio.allowBlocks as string[]
    expect(blocks).toContain('sz_g2d_create_image_sprite')
    for (const type of blocks) {
      expect(resolveBlockLevel(type).startsWith('iniciante-'), type).toBe(true)
      expect(type).not.toMatch(/^sz_(html|css|canvas|adv)/)
    }
    expect(studio.chain).toBeUndefined()
  })
})
