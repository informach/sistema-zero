import { beforeAll, expect, test } from 'bun:test'
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import * as Blockly from 'blockly/core'
import 'blockly/blocks'
import {
  isExecutionRule,
  isLearningManifest,
  type SectionProjectCheck,
} from '@sistemazero/core/learning'
import { gameThreeDBlocks } from '../../official-extensions/game-3d/blocks'
import { registerExtensionBlocks } from '../blocks'
import { evaluateStudioSectionProject } from '../projectCheckAuthoring'
import { ensureBlocklyInitialized } from '../setup'

/**
 * Patrulha Espacial (base 3D do Construtor) avaliada com o Blockly de verdade: em cada parte que confere o projeto, a solução de exemplo da parte cumpre
 * todos os objetivos de estrutura depois de passar por carregar e salvar no workspace (o que a
 * criança faz ao abrir e enviar). A execução (objetivos que rodam o jogo) é conferida pelos
 * validadores da progressão em `docs/aulas-interativas-tecnico/recursos/construtor-base/`.
 * A Nave Contra Asteroides tem a conferência própria, mais completa, em `naveEditorial.test.ts`.
 */
const raiz = resolve(import.meta.dir, '../../../../../docs/aulas-interativas/construtor')
const cursos = ['patrulha-espacial'] as const

beforeAll(() => {
  ensureBlocklyInitialized()
  registerExtensionBlocks(gameThreeDBlocks)
})

interface Exemplos {
  examples: Record<string, { blocksState: unknown }>
  sections: Record<string, { entryExampleId: string; solutionExampleId: string }>
}

function manifestos(curso: string) {
  return readdirSync(resolve(raiz, curso))
    .filter((f) => f.endsWith('.manifesto.json'))
    .map((f) => {
      const value: unknown = JSON.parse(readFileSync(resolve(raiz, curso, f), 'utf8'))
      if (!isLearningManifest(value)) throw new Error(`Manifesto inválido: ${f}`)
      return [f, value] as const
    })
}

function exemplosDoManifesto(manifest: unknown): Exemplos {
  const blocks = (manifest as { blocks: { content?: { projectExamples?: Exemplos } }[] }).blocks
  const studio = blocks.find((b) => b.content?.projectExamples)
  if (!studio?.content?.projectExamples) throw new Error('Aula sem exemplos de projeto')
  return studio.content.projectExamples
}

function salvoPeloWorkspace(blocksState: unknown) {
  const workspace = new Blockly.Workspace()
  try {
    Blockly.serialization.workspaces.load(blocksState as never, workspace)
    return { blocksState: Blockly.serialization.workspaces.save(workspace) }
  } finally {
    workspace.dispose()
  }
}

for (const curso of cursos) {
  test(`${curso}: a solução de cada parte cumpre os objetivos de estrutura no Blockly`, () => {
    let partes = 0
    for (const [arquivo, manifest] of manifestos(curso)) {
      const exemplos = exemplosDoManifesto(manifest)
      for (const section of manifest.sections) {
        const checks = (section.completion?.projectChecks ?? []).filter(
          (check: SectionProjectCheck) => !isExecutionRule(check.rule),
        )
        if (!checks.length) continue
        const ids = exemplos.sections[section.key]
        expect(ids, `${arquivo}/${section.key}: sem exemplo`).toBeDefined()
        const solucao = exemplos.examples[ids!.solutionExampleId]!
        const falhas = evaluateStudioSectionProject(checks, salvoPeloWorkspace(solucao.blocksState))
          .filter((c) => !c.passed)
          .map((c) => c.checkId)
        expect(falhas, `${arquivo}/${section.key}`).toEqual([])
        partes++
      }
    }
    // Anti-vácuo: a Patrulha confere projeto em muitas partes.
    expect(partes).toBeGreaterThan(10)
  })
}
