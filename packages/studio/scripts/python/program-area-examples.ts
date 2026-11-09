/**
 * Qualify every Classic gallery example with the real CPython/WASM analyzer:
 * bun scripts/python/program-area-examples.ts --node <node24> --distribution <dir>
 *   --distribution-sha256 <sha256> --runtime-release <release.json>
 * Checks all Python files, Program ownership, AST equality and saved-state reopening.
 * Source and media payloads are never rewritten.
 */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import {
  createStudioRuntimeCatalog,
  StudioRuntimeReleaseSchema,
} from '@sistemazero/core/studio/runtime-catalog'
import * as Blockly from 'blockly/core'
import { PYTHON_EXAMPLE_SUMMARIES } from '../../src/examples/pythonCatalog'
import { loadPythonAuthoring } from '../../src/python/blocks/authoring'
import { pythonVisualToWorkspace, pythonWorkspaceToVisual } from '../../src/python/blocks/blockly'
import { pythonSemanticTree } from '../../src/python/blocks/nodes'
import {
  ensurePythonProgramArea,
  pythonProgramArea,
  pythonScratchRoots,
} from '../../src/python/blocks/programArea'
import { pythonASTToVisual, pythonVisualToAST } from '../../src/python/blocks/projection'
import { readPythonWorkspaceState } from '../../src/python/blocks/readWorkspaceState'
import { savePythonWorkspace } from '../../src/python/blocks/workspaceState'
import { pythonOfficialModulesFor } from '../../src/python/officialModules'
import { startVisualExampleAnalysis } from './visual-example-qualification'

const args = process.argv.slice(2)
const option = (name: string) => {
  const index = args.indexOf(`--${name}`)
  const value = index >= 0 ? args[index + 1] : undefined
  assert.ok(value, `Missing --${name}`)
  return value
}
const release = StudioRuntimeReleaseSchema.parse(
  JSON.parse(await readFile(option('runtime-release'), 'utf8')),
)
const runtime = {
  profileId: release.profileId,
  releaseId: release.releaseId,
  manifestSha256: release.manifestSha256,
}
const catalog = await createStudioRuntimeCatalog({
  releases: [release],
  profiles: [
    {
      id: release.profileId,
      languages: ['python'],
      kinds: release.manifest.kinds,
      modes: release.manifest.modes,
      levels: [],
      releases: [{ id: release.releaseId, manifestSha256: release.manifestSha256 }],
    },
  ],
})
const analysisOptions = {
  nodeExecutable: option('node'),
  distribution: option('distribution'),
  distributionSha256: option('distribution-sha256'),
}
let analysis = await startVisualExampleAnalysis(analysisOptions)
let parsedFiles = 0
const results: { key: string; files: number; blocks: number }[] = []
try {
  for (const entry of PYTHON_EXAMPLE_SUMMARIES) {
    if (entry.kind !== 'classic') continue
    const payload = await entry.load()
    const { codecs } = await loadPythonAuthoring(
      { runtime, installedExtensions: entry.extensions },
      { catalog, pythonAuthoring: [{ runtime, blockIds: entry.requiredBlockIds ?? [] }] },
    )
    const officialModules = pythonOfficialModulesFor({
      paths: Object.keys(payload.files),
      entrypoint: payload.entrypoint,
      extensionIds: entry.extensions.map(({ id }) => id),
    })
    let files = 0
    let blocks = 0
    for (const [path, source] of Object.entries(payload.files)) {
      if (!path.endsWith('.py')) continue
      // Each analyzer process has a bounded lifetime; renew it between small batches.
      if (parsedFiles > 0 && parsedFiles % 15 === 0) {
        await analysis.close()
        analysis = await startVisualExampleAnalysis(analysisOptions)
      }
      const parsed = await analysis.request({ operation: 'parse', source, path, compilable: true })
      assert.ok(parsed.ok && 'tree' in parsed && parsed.tree, `${entry.key}/${path}: parse`)
      assert.equal(parsed.diagnostics.length, 0, `${entry.key}/${path}: diagnostics`)
      const workspace = new Blockly.Workspace()
      const reopened = new Blockly.Workspace()
      try {
        const projection = pythonASTToVisual(parsed.tree, { codecs, officialModules })
        const roots = pythonVisualToWorkspace(projection, workspace, codecs)
        const areaIds = ensurePythonProgramArea(workspace, roots, path)
        assert.equal(workspace.getTopBlocks(false).length, 1, `${entry.key}/${path}: roots`)
        assert.equal(pythonScratchRoots(workspace).length, 0, `${entry.key}/${path}: scratch`)
        const area = pythonProgramArea(workspace)
        assert.equal(area?.getFieldValue('FILE'), path)
        assert.equal(area?.isDeletable(), false)
        const expected = pythonSemanticTree(parsed.tree)
        const tree = (ws: Blockly.Workspace) =>
          pythonSemanticTree(
            pythonVisualToAST(
              pythonWorkspaceToVisual(ws, areaIds, projection.typeIgnores, codecs),
              codecs,
            ),
          )
        assert.deepEqual(tree(workspace), expected, `${entry.key}/${path}: projection`)
        Blockly.serialization.workspaces.load(
          readPythonWorkspaceState(savePythonWorkspace(workspace, new Map()), codecs),
          reopened,
        )
        assert.equal(pythonProgramArea(reopened)?.id, area?.id)
        assert.equal(pythonScratchRoots(reopened).length, 0)
        assert.deepEqual(tree(reopened), expected, `${entry.key}/${path}: reopening`)
        blocks += workspace.getAllBlocks(false).length
      } finally {
        reopened.dispose()
        workspace.dispose()
      }
      parsedFiles++
      files++
    }
    assert.ok(files, `${entry.key}: no Python files`)
    results.push({ key: entry.key, files, blocks })
    console.log(`PASS ${entry.key}: ${files} files, ${blocks} blocks`)
  }
  console.log(JSON.stringify({ examples: results.length, files: parsedFiles, results }, null, 2))
} finally {
  await analysis.close()
}
