import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { markLifecycleBlocksState } from '../../../../../packages/studio/src/blockly/blocksStateVersion'
import { buildWorkspaceStateFromIR } from '../../../../../packages/studio/src/blockly/workspaceState'
import { createBlankProjectSnapshot } from '../../../../../packages/studio/src/core/blankProject'
import {
  copyDocument,
  projectBlockTypes,
} from '../../../../../packages/studio/src/core/projectDocumentGuards'
import { generateProjectFiles } from '../../../../../packages/studio/src/generators/project'
import { normalizeSZIR, SZIRV2Schema } from '../../../../../packages/studio/src/ir/index'
import { gameTwoDManifest } from '../../../../../packages/studio/src/official-extensions/game-2d/manifest'
import { gameThreeDManifest } from '../../../../../packages/studio/src/official-extensions/game-3d/manifest'
import { parseJS } from '../../../../../packages/studio/src/parsers/js'

const stamp = Date.parse('2026-11-24T15:00:00.000Z')
export function exportFromIR(input: any) {
  const ir = JSON.parse(JSON.stringify(normalizeSZIR(input.ir)))
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
    installedExtensions: ir.extensions.map((entry: any) => {
      const m = entry.extensionId === 'game-2d' ? gameTwoDManifest : gameThreeDManifest
      if (m.id !== entry.extensionId) throw new Error('Unsupported prototype extension')
      return { id: m.id, version: m.version, installedAt: stamp }
    }),
    projectTools: projectBlockTypes(blocksState),
  }
  copyDocument(project)
  return project
}
export function exportFromSource(input: any) {
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
export function exportAll() {
  const base = path.resolve(import.meta.dirname)
  const output = path.resolve(base, '..')
  const reports: any[] = []
  for (const filename of fs
    .readdirSync(path.join(base, '2d'))
    .filter((x) => x.endsWith('.source.json'))) {
    const p = JSON.parse(fs.readFileSync(path.join(base, '2d', filename), 'utf8'))
    const project = exportFromIR(p)
    const dest = path.join(output, '2d', p.filename)
    fs.writeFileSync(dest, JSON.stringify(project) + '\n')
    reports.push({
      file: dest,
      bytes: fs.statSync(dest).size,
      blockTypes: project.projectTools.length,
      formatVersion: project.formatVersion,
    })
  }
  for (const p of JSON.parse(fs.readFileSync(path.join(base, '3d', 'sources.json'), 'utf8'))) {
    const assets = p.assetsFile
      ? JSON.parse(fs.readFileSync(path.join(base, '3d', p.assetsFile), 'utf8'))
      : (p.assets ?? [])
    const project = exportFromSource({
      ...p,
      assets,
      projectId: 'construtor-' + p.stem,
      extensionId: 'game-3d',
      source: fs.readFileSync(path.join(base, '3d', p.source), 'utf8'),
    })
    const dest = path.join(output, '3d', p.stem + '.szproject.json')
    fs.writeFileSync(dest, JSON.stringify(project) + '\n')
    reports.push({
      file: dest,
      bytes: fs.statSync(dest).size,
      blockTypes: project.projectTools.length,
      formatVersion: project.formatVersion,
    })
  }
  fs.writeFileSync(
    path.join(import.meta.dirname, 'export-report.json'),
    JSON.stringify(reports, null, 2) + '\n',
  )
  return reports
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  console.log(JSON.stringify(exportAll(), null, 2))
