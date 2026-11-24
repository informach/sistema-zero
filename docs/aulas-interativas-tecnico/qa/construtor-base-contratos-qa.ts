/** Contratos comuns das duas bases. Não usa o resultado final para aprovar etapas anteriores. */
import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { gradeLearningQuiz, isLearningManifest } from '../../../packages/core/src/learning'
import {
  LEARNING_IMPORT_BODY_MAX_BYTES,
  learningImportBodyBytes,
} from '../../../packages/core/src/learning/authoring-manifest-projection'
import { isExecutionRule } from '../../../packages/core/src/learning/project-execution'
import { evaluateProjectStructure } from '../../../packages/core/src/learning/project-structure'
import { isSectionCompletion } from '../../../packages/core/src/learning/section-progression'
import { readManifestStudioProjectExamples } from '../../../packages/core/src/learning/studio-project-examples'
import { isStudioAuthoringProject } from '../../../packages/core/src/studio/authoring-project'
import { studioProjectContinuityIssue } from '../../../packages/core/src/studio/project-continuity'
import { FRAME_BLOCKS } from '../../../packages/studio/src/blockly/blocks/frames'
import { JS_BLOCKS } from '../../../packages/studio/src/blockly/blocks/js'
import { MATH_BLOCKS } from '../../../packages/studio/src/blockly/blocks/math'
import { VALUE_BLOCKS } from '../../../packages/studio/src/blockly/blocks/values'
import { isBlockTypeAllowed } from '../../../packages/studio/src/core/levels'
import { gameTwoDBlocks } from '../../../packages/studio/src/official-extensions/game-2d/blocks'
import { gameThreeDBlocks } from '../../../packages/studio/src/official-extensions/game-3d/blocks'
import { tiposDosBlocos } from './construtor-base-gerador'
import type { ConstrutorBaseConfig } from './construtor-base-tipos'
import { problemasPedagogicos } from './diretrizes-pedagogicas'
import { falaDaParte } from './faisca-comum'
import { derivadosDeVoz } from './gerar-falas-elevenlabs'
import { extrairPartesElevenLabs } from './roteiro-elevenlabs'

const definitions = new Set(
  [
    ...FRAME_BLOCKS,
    ...JS_BLOCKS,
    ...MATH_BLOCKS,
    ...VALUE_BLOCKS,
    ...gameTwoDBlocks,
    ...gameThreeDBlocks,
  ].map((block) => block.type),
)
const read = (path: string) => JSON.parse(readFileSync(path, 'utf8'))

export function testarContratoBase(config: ConstrutorBaseConfig) {
  const projects = Object.fromEntries(
    config.etapas.map((stage) => [stage, config.montarProjeto(stage)]),
  )
  const final = projects[config.etapaFinal]!
  const palette = tiposDosBlocos(final.blocksState)

  test(`${config.curso}: cada progressivo entregue reproduz a fonte, tem blocos nativos e conserva o ambiente`, () => {
    for (const stage of config.etapas) {
      const project = read(resolve(config.pasta, 'projetos', `${stage}.szproject.json`))
      expect(project, stage).toEqual(projects[stage])
      expect(isStudioAuthoringProject(project), stage).toBe(true)
      expect(studioProjectContinuityIssue(project, projects[config.etapas[0]!]!), stage).toBeNull()
      const serialized = JSON.stringify(project.ir)
      expect(serialized, stage).not.toMatch(/"type":"(?:rawJS|memberCall)"/)
      const types = tiposDosBlocos(project.blocksState)
      expect(types.length, stage).toBeGreaterThan(0)
      for (const type of types) {
        expect(definitions.has(type), type).toBe(true)
        expect(palette, type).toContain(type)
        expect(
          isBlockTypeAllowed(type, 'avancado-3d', {
            level: `iniciante-${config.dimensao}`,
            allowBlocks: palette,
          }),
          type,
        ).toBe(true)
      }
      const checks = config.checks(stage)
      expect(isSectionCompletion({ version: 1, blockIds: [], projectChecks: checks }), stage).toBe(
        true,
      )
      for (const check of checks.filter((check) => !isExecutionRule(check.rule)))
        expect(evaluateProjectStructure(check.rule as never, project), `${stage}/${check.id}`).toBe(
          true,
        )
    }
  })

  let lastStage = config.etapas[0]!
  for (const [index, lesson] of config.aulas.entries()) {
    const expectedEntry = lastStage
    lastStage = lesson.trechos.filter((part) => part.etapa).at(-1)?.etapa ?? lastStage
    test(`${config.curso}/${lesson.slug}: continuidade, conquistas por parte, voz e orçamento de importação`, () => {
      const base = `${config.prefixo}-${lesson.slug}`
      const manifest = read(resolve(config.pasta, `${base}.manifesto.json`))
      expect(isLearningManifest(manifest)).toBe(true)
      if (!isLearningManifest(manifest)) throw new Error(`Manifesto inválido: ${base}`)
      expect(manifest.courseSlug).toBe(config.curso)
      expect(manifest.lessonSlug).toBe(lesson.slug)
      expect(manifest.title).toBe(lesson.title)
      expect(problemasPedagogicos(manifest, true)).toEqual([])
      expect(lesson.entryStage).toBe(expectedEntry)
      const studio = manifest.blocks.find((block) => block.key === 'projeto')?.content
      if (studio?.kind !== 'studio') throw new Error('Estúdio da aula ausente')
      expect(studio.chain).toBe(config.chain ?? config.curso)
      expect(studio.initialProject).toEqual(projects[expectedEntry])
      expect(studio.allowBlocks).toEqual(palette)
      expect(studio.allowedModes).toEqual(['blocks'])
      const examples = readManifestStudioProjectExamples(studio.projectExamples)
      expect(examples.kind).toBe('valid')
      if (examples.kind !== 'valid') throw new Error('Exemplos por parte inválidos')
      let previous = expectedEntry
      for (const part of lesson.trechos) {
        const section = manifest.sections.find((section) => section.key === part.key)
        expect(section, part.key).toBeDefined()
        if (!section) throw new Error(`Parte ausente: ${part.key}`)
        if (part.kind !== 'build' && part.kind !== 'delivery') continue
        const binding = examples.value.sections[part.key]
        expect(binding, part.key).toBeDefined()
        expect(examples.value.examples[binding!.entryExampleId!], `${part.key}/entrada`).toEqual(
          projects[previous],
        )
        expect(examples.value.examples[binding!.solutionExampleId!], `${part.key}/solução`).toEqual(
          projects[part.etapa!],
        )
        expect(section.completion?.projectChecks).toEqual(config.checks(part.etapa!))
        previous = part.etapa!
      }
      const delivery = manifest.sections.filter((section) => section.intent === 'delivery')
      expect(delivery).toHaveLength(1)
      expect(delivery[0]!.completion?.submissionUpToDate).toBe(true)
      expect(delivery[0]!.completion?.blockIds).toContain('projeto')
      const script = readFileSync(resolve(config.pasta, `${base}.roteiro.md`), 'utf8')
      const clips = extrairPartesElevenLabs(script)
      expect(clips).toEqual(
        lesson.trechos
          .filter((part) => part.kind !== 'quiz')
          .map((part) => falaDaParte(part, index)),
      )
      for (const [suffix, voice] of derivadosDeVoz(clips))
        expect(readFileSync(resolve(config.pasta, `${base}${suffix}`), 'utf8'), suffix).toBe(voice)
      expect(
        learningImportBodyBytes(
          manifest,
          'preserve',
          'a'.repeat(64),
          '00000000-0000-4000-8000-000000000000',
        ),
      ).toBeLessThanOrEqual(LEARNING_IMPORT_BODY_MAX_BYTES)
    })
  }

  test(`${config.curso}: revisões corrigidas pelo motor distinguem a resposta certa e cada erro`, () => {
    let quizzes = 0
    for (const lesson of config.aulas)
      for (const part of lesson.trechos) {
        if (part.kind !== 'quiz' || !part.quiz) continue
        quizzes++
        const quiz = part.quiz
        const answers = Object.fromEntries(
          quiz.questions.map((question) => [question.id, question.correctChoiceIds]),
        )
        expect(gradeLearningQuiz(quiz, answers).passed).toBe(true)
        for (const question of quiz.questions) {
          expect(question.explanation?.trim().length).toBeGreaterThan(20)
          for (const wrong of question.choices.filter(
            (choice) => !question.correctChoiceIds.includes(choice.id),
          ))
            expect(gradeLearningQuiz(quiz, { ...answers, [question.id]: [wrong.id] }).passed).toBe(
              false,
            )
        }
      }
    expect(quizzes).toBeGreaterThan(0)
  })
}
