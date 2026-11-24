/** Importação dos snapshots em Blockly real e equivalência dos três arquivos gerados. */

import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { isStudioAuthoringProject } from '../../../../packages/core/src/studio/authoring-project'
import {
  registerCoreBlocks,
  registerExtensionBlocks,
} from '../../../../packages/studio/src/blockly/blocks'
import { registerIfElseMutator } from '../../../../packages/studio/src/blockly/blocks/ifElseMutator'
import { buildIRFromWorkspace } from '../../../../packages/studio/src/blockly/buildIR'
import { registerFieldAssetPicker } from '../../../../packages/studio/src/blockly/fields/FieldAssetPicker'
import { registerFieldColourSZ } from '../../../../packages/studio/src/blockly/fields/FieldColourSZ'
import { registerFieldNamePicker } from '../../../../packages/studio/src/blockly/fields/FieldNamePicker'
import { registerFieldSpritePicker } from '../../../../packages/studio/src/blockly/fields/FieldSpritePicker'
import { registerProjectAreaSafeDeleteExtension } from '../../../../packages/studio/src/blockly/projectAreaSafeDelete'
import { generateProjectFiles } from '../../../../packages/studio/src/generators/project'
import { SZIRV2Schema } from '../../../../packages/studio/src/ir/schema'
import { gameTwoDBlocks } from '../../../../packages/studio/src/official-extensions/game-2d/blocks'
import { gameThreeDBlocks } from '../../../../packages/studio/src/official-extensions/game-3d/blocks'
import { config2D } from '../../qa/construtor-2d'
import { config3D } from '../../qa/construtor-3d'

const studioRequire = createRequire(
  new URL('../../../../packages/studio/package.json', import.meta.url),
)
const Blockly = studioRequire('blockly/core')
studioRequire('blockly/blocks')
if (typeof document === 'undefined')
  studioRequire('@happy-dom/global-registrator').GlobalRegistrator.register()
studioRequire('@blockly/field-colour').registerFieldColour()
registerFieldColourSZ()
registerFieldNamePicker()
registerFieldSpritePicker()
registerFieldAssetPicker()
registerIfElseMutator()
registerProjectAreaSafeDeleteExtension()
registerCoreBlocks()
registerExtensionBlocks(gameTwoDBlocks)
registerExtensionBlocks(gameThreeDBlocks)

const results = [] as {
  course: string
  stage: string
  blocks: number
  topBlocks: number
  sha256: string
}[]
for (const cfg of [config2D, config3D])
  for (const stage of cfg.etapas) {
    const content = readFileSync(resolve(cfg.pasta, `projetos/${stage}.szproject.json`), 'utf8')
    const project = JSON.parse(content)
    assert(isStudioAuthoringProject(project), `${cfg.curso}/${stage}: documento inválido`)
    const workspace = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(project.blocksState, workspace)
      const ir = JSON.parse(JSON.stringify(buildIRFromWorkspace(workspace)))
      SZIRV2Schema.parse(ir)
      assert(
        !JSON.stringify(ir).match(/"type":"(?:rawJS|memberCall)"/),
        'Código opaco em vez de blocos',
      )
      const actual = generateProjectFiles({ ir, projectName: project.name })
      const expected = generateProjectFiles({ ir: project.ir, projectName: project.name })
      for (const file of ['script.js', 'index.html', 'style.css'])
        assert.equal(
          actual[file],
          expected[file],
          `${cfg.curso}/${stage}/${file}: roundtrip mudou programa`,
        )
      results.push({
        course: cfg.curso,
        stage,
        blocks: workspace.getAllBlocks(false).length,
        topBlocks: workspace.getTopBlocks(false).length,
        sha256: createHash('sha256').update(content).digest('hex'),
      })
    } finally {
      workspace.dispose()
    }
  }
const dir = resolve(import.meta.dir, '../../qa/relatorios')
mkdirSync(dir, { recursive: true })
writeFileSync(
  resolve(dir, 'construtor-base-roundtrip.json'),
  `${JSON.stringify(
    {
      version: 1,
      status: 'passed',
      scope:
        'Blockly headless real, schema e equivalência dos arquivos gerados; não é ensaio do editor com conta de aluno.',
      projects: results,
    },
    null,
    2,
  )}\n`,
)
console.log(`${results.length} projetos: Blockly, schema e JS/HTML/CSS preservados.`)
