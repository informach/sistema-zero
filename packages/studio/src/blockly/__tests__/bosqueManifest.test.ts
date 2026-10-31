import * as Blockly from 'blockly/core'
import 'blockly/blocks'
import { afterAll, expect, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { criarManifesto } from '../../../../../docs/desafios-do-jogo/bosque/gerar-manifesto'
import { isSectionExecutionRule } from '../../../../core/src/learning/project-execution'
import type { SectionJavaScriptProjectCheck } from '../../../../core/src/learning/section-progression'
import type { Project } from '../../core/project'
import { generateProjectFiles } from '../../generators/project'
import { SZIRV2Schema } from '../../ir/schema'
import { gameTwoDBlocks } from '../../official-extensions/game-2d/blocks'
import { registerExtensionBlocks } from '../blocks'
import { buildIRFromWorkspace } from '../buildIR'
import { evaluateStudioProjectStructure } from '../projectCheckAuthoring'
import { ensureBlocklyInitialized } from '../setup'

const needsDom = typeof document === 'undefined'
if (needsDom) GlobalRegistrator.register()
afterAll(async () => {
  if (needsDom) await GlobalRegistrator.unregister()
})

test('os projetos do Bosque abrem como blocos e geram o mesmo jogo', () => {
  ensureBlocklyInitialized()
  registerExtensionBlocks(gameTwoDBlocks)
  for (const d of criarManifesto().desafios) {
    for (const tipo of ['projetoInicial', 'gabarito'] as const) {
      const p = d.conteudo[tipo] as Project
      const workspace = new Blockly.Workspace()
      try {
        Blockly.serialization.workspaces.load(p.blocksState as Record<string, unknown>, workspace)
        const ir = buildIRFromWorkspace(workspace)
        expect(SZIRV2Schema.safeParse(ir).success, `${d.slug}/${tipo}`).toBe(true)
        expect(
          generateProjectFiles({ ir, projectName: p.name })['script.js'],
          `${d.slug}/${tipo}`,
        ).toBe(p.files['script.js'])
      } finally {
        workspace.dispose()
      }
    }
  }
})

test('trocar sorteio por passo fixo, fala ou dono do ponto reprova a estrutura', () => {
  const m = criarManifesto()
  for (const d of m.desafios.filter((d) =>
    ['bosque-corrida-dos-bichos', 'bosque-corrida-dos-bichos-placar'].includes(d.slug),
  )) {
    for (const c of d.conteudo.objetivos as SectionJavaScriptProjectCheck[]) {
      if (isSectionExecutionRule(c.rule)) continue
      const project = structuredClone(d.conteudo.gabarito) as Project
      const serialized = JSON.stringify(project.blocksState)
      if (c.id === 'sorteio')
        project.blocksState = JSON.parse(serialized.replaceAll('sz_g2d_random_x', 'sz_val_number'))
      else if (c.id.startsWith('fala-'))
        project.blocksState = JSON.parse(serialized.replaceAll('Ganhei', 'Oi'))
      else project.blocksState = JSON.parse(serialized.replaceAll('vitorias_', 'outro_'))
      expect(evaluateStudioProjectStructure(c.rule, project), c.id).toBe(false)
    }
  }
})
