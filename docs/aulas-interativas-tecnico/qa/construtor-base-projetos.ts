/** Conversão síncrona pelas fábricas oficiais; não escreve nem modifica os snapshots aprovados. */

import { markLifecycleBlocksState } from '../../../packages/studio/src/blockly/blocksStateVersion'
import { buildWorkspaceStateFromIR } from '../../../packages/studio/src/blockly/workspaceState'
import { createBlankProjectSnapshot } from '../../../packages/studio/src/core/blankProject'
import type { ProjectAsset } from '../../../packages/studio/src/core/projectAssets'
import {
  copyDocument,
  projectBlockTypes,
} from '../../../packages/studio/src/core/projectDocumentGuards'
import { generateProjectFiles } from '../../../packages/studio/src/generators/project'
import {
  normalizeSZIR,
  type SZIRInput,
  type SZIRV2,
  SZIRV2Schema,
} from '../../../packages/studio/src/ir/index'
import { gameTwoDManifest } from '../../../packages/studio/src/official-extensions/game-2d/manifest'
import { gameThreeDManifest } from '../../../packages/studio/src/official-extensions/game-3d/manifest'
import { parseJS } from '../../../packages/studio/src/parsers/js'

const stamp = Date.parse('2026-11-24T15:00:00.000Z')
interface BaseProjectInput {
  projectId: string
  name: string
  assets?: ProjectAsset[]
}
export function exportFromIR(input: BaseProjectInput & { ir: SZIRInput }) {
  const ir = JSON.parse(JSON.stringify(normalizeSZIR(input.ir))) as SZIRV2
  SZIRV2Schema.parse(ir)
  if (/"type":"(?:rawJS|memberCall|memberCallExpr)"/.test(JSON.stringify(ir)))
    throw new Error('Raw unsupported source')
  const blocksState = markLifecycleBlocksState(buildWorkspaceStateFromIR(ir))
  const project = {
    ...createBlankProjectSnapshot(input.projectId, input.name),
    createdAt: stamp,
    updatedAt: stamp,
    ir,
    blocksState,
    files: generateProjectFiles({ ir, projectName: input.name }),
    assets: input.assets ?? [],
    installedExtensions: ir.extensions.map((entry) => {
      const m = entry.extensionId === 'game-2d' ? gameTwoDManifest : gameThreeDManifest
      if (m.id !== entry.extensionId) throw new Error('Unsupported prototype extension')
      return { id: m.id, version: m.version, installedAt: stamp }
    }),
    projectTools: projectBlockTypes(blocksState),
  }
  copyDocument(project)
  return project
}
export function exportFromSource(
  input: BaseProjectInput & { source: string; extensionId: 'game-2d' | 'game-3d' },
) {
  return exportFromIR({
    ...input,
    ir: {
      html: [],
      css: [],
      js: parseJS(input.source),
      extensions: [{ extensionId: input.extensionId }],
    },
  })
}
