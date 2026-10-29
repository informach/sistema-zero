import * as Blockly from 'blockly/core'
import 'blockly/blocks'
import { afterAll, expect, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { criarManifesto } from '../../../../../docs/desafios-do-jogo/pico/gerar-manifesto'
import type { Project } from '../../core/project'
import { generateProjectFiles } from '../../generators/project'
import { SZIRV2Schema } from '../../ir/schema'
import { gameTwoDBlocks } from '../../official-extensions/game-2d/blocks'
import { registerExtensionBlocks } from '../blocks'
import { buildIRFromWorkspace } from '../buildIR'
import { ensureBlocklyInitialized } from '../setup'

const needsDom = typeof document === 'undefined'
if (needsDom) GlobalRegistrator.register()
afterAll(async () => {
  if (needsDom) await GlobalRegistrator.unregister()
})

test('os oito projetos do Pico abrem como blocos e geram o mesmo jogo', () => {
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
