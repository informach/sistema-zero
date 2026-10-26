/**
 * Run with Bun (TS imports), while syntax analysis runs in one Node 24/WASM child:
 * --node <exe> --distribution <directory> --distribution-sha256 <sha256>
 * --runtime-release <release.json> --source <main.py>
 * --approved-block-ids <string-array.json> --edits <VisualExampleEdit-array.json>
 * --inspect replaces qualification with a field/path inventory (qualifies:false).
 * CPython 3.12 is not a substitute: analyzer.py requires optimize=0 and _field_types.
 * Canonical rendering proves semantic AST equality, not comment/format preservation.
 */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createInterface } from 'node:readline'
import { canonicalJson } from '@sistemazero/core/creations'
import {
  createStudioRuntimeCatalog,
  type StudioRuntimeRelease,
  StudioRuntimeReleaseSchema,
} from '@sistemazero/core/studio/runtime-catalog'
import * as Blockly from 'blockly/core'
import { loadPythonAuthoring } from '../../src/python/blocks/authoring'
import { pythonVisualToWorkspace, pythonWorkspaceToVisual } from '../../src/python/blocks/blockly'
import { isNode, pythonSemanticTree } from '../../src/python/blocks/nodes'
import {
  type PythonBlockProjection,
  type PythonVisualNode,
  pythonASTToVisual,
  pythonVisualToAST,
} from '../../src/python/blocks/projection'
import { readPythonAnalysisResult } from '../../src/python/language/readResult'
import type {
  PythonAnalysisRequest,
  PythonAnalysisResult,
  PythonNode,
  PythonValue,
} from '../../src/python/language/types'
import { PGZERO_EXTENSION } from '../../src/runtime/python/pgzero/contract'
import { RAYLIB_2D_EXTENSION, RAYLIB_3D_EXTENSION } from '../../src/runtime/python/raylib/contract'
import { TURTLE_EXTENSION } from '../../src/runtime/python/turtle/contract'

const digest = (value: string) => createHash('sha256').update(value).digest('hex')
const semantic = (tree: PythonNode) => canonicalJson(pythonSemanticTree(tree))

export interface VisualBlockPath {
  body: number
  inputs: { name: string; index: number }[]
}
export interface VisualExampleEdit {
  label: string
  path: VisualBlockPath
  codecId: string
  field: string
  before: string
  after: string
}
export interface VisualExampleAnalysis {
  identity: {
    pythonVersion: '3.14.2'
    pyodideVersion: '314.0.7'
    distributionSha256: string
    analyzerSha256: string
  }
  request(request: PythonAnalysisRequest): Promise<PythonAnalysisResult>
}

/** Supplied release configures this QA host; it does not attest a deployed approval. */
/** The canvas extension an example installs: its modules join the official ones. */
const EXAMPLE_EXTENSIONS: Readonly<
  Record<string, { extension: { id: string; version: string }; modules: readonly string[] }>
> = {
  [TURTLE_EXTENSION.id]: { extension: TURTLE_EXTENSION, modules: ['turtle', 'formas_do_pinta'] },
  [PGZERO_EXTENSION.id]: { extension: PGZERO_EXTENSION, modules: ['pgzero', 'pgzrun', 'pygame'] },
  [RAYLIB_2D_EXTENSION.id]: { extension: RAYLIB_2D_EXTENSION, modules: ['pyray', 'raylib'] },
  [RAYLIB_3D_EXTENSION.id]: { extension: RAYLIB_3D_EXTENSION, modules: ['pyray', 'raylib'] },
} as const

export async function loadVisualExampleAuthoring(options: {
  release: StudioRuntimeRelease
  approvedBlockIds: readonly string[]
  extension?: string
}) {
  const chosen = EXAMPLE_EXTENSIONS[options.extension ?? TURTLE_EXTENSION.id]
  if (!chosen) throw new Error('Extensão de exemplo desconhecida.')
  const { release } = options
  if (!release.manifest.python) throw new Error('A qualificação exige uma release Python.')
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
        languages: [release.manifest.programmingLanguage],
        kinds: release.manifest.kinds,
        modes: release.manifest.modes,
        levels: [],
        releases: [{ id: release.releaseId, manifestSha256: release.manifestSha256 }],
      },
    ],
  })
  const loaded = await loadPythonAuthoring(
    { runtime, installedExtensions: [chosen.extension] },
    {
      catalog,
      pythonAuthoring: [{ runtime, blockIds: options.approvedBlockIds }],
    },
  )
  return {
    ...loaded,
    runtime,
    runtimeFeatures: release.manifest.python.features,
    extension: chosen.extension.id,
    officialModules: new Set(['math', 'random', ...chosen.modules]),
  }
}

type VisualExampleAuthoring = Awaited<ReturnType<typeof loadVisualExampleAuthoring>>

/** No source fragments, IDs or screen coordinates participate in this stable path. */
function atPath(projection: PythonBlockProjection, path: VisualBlockPath) {
  assert.ok(Number.isSafeInteger(path.body) && path.body >= 0, 'Invalid body index')
  let value = projection.body[path.body]
  for (const step of path.inputs) {
    assert.ok(value?.kind === 'block', 'The edit path must contain visual blocks')
    assert.ok(Number.isSafeInteger(step.index) && step.index >= 0, 'Invalid input index')
    value = value.inputs.find((input) => input.name === step.name)?.nodes[step.index]
  }
  assert.ok(value?.kind === 'block', 'The edit must target a visual block')
  return value
}

export function inspectPythonVisualProjection(projection: PythonBlockProjection) {
  const counts = new Map<string, number>()
  const fields: {
    path: VisualBlockPath
    codecId: string
    field: string
    value: string
  }[] = []
  const opaque: { path: VisualBlockPath; kind: string }[] = []
  function visit(value: PythonVisualNode, path: VisualBlockPath) {
    if (value.kind === 'source') {
      opaque.push({ path, kind: value.node.kind })
      return
    }
    counts.set(value.codecId, (counts.get(value.codecId) ?? 0) + 1)
    for (const field of value.fields)
      fields.push({ path, codecId: value.codecId, field: field.name, value: field.value })
    for (const input of value.inputs)
      input.nodes.forEach((child, index) => {
        visit(child, { ...path, inputs: [...path.inputs, { name: input.name, index }] })
      })
  }
  projection.body.forEach((value, body) => {
    visit(value, { body, inputs: [] })
  })
  return {
    blockCount: [...counts.values()].reduce((sum, count) => sum + count, 0),
    blocks: [...counts]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([id, count]) => ({ id, count })),
    fields,
    opaque,
  }
}

function checkedProjection(tree: PythonNode, authoring: VisualExampleAuthoring) {
  // Editorial constraints for self-contained examples, not a general Python sandbox.
  const imports = new Set(['math', 'random', 'time', 'sz_audio', ...authoring.officialModules])
  function editorial(value: PythonValue) {
    if (Array.isArray(value)) {
      for (const child of value) editorial(child)
      return
    }
    if (!isNode(value)) return
    if (value.kind === 'Import') {
      const aliases = value.fields.names
      assert.ok(Array.isArray(aliases), 'Invalid import')
      for (const alias of aliases)
        assert.ok(
          isNode(alias) && typeof alias.fields.name === 'string' && imports.has(alias.fields.name),
          'Reference examples must use only declared standard/provided modules',
        )
    }
    if (value.kind === 'ImportFrom')
      assert.ok(
        typeof value.fields.module === 'string' &&
          imports.has(value.fields.module) &&
          canonicalJson(value.fields.level) === canonicalJson({ literal: 'int', value: '0' }),
        'Reference examples must not import hidden author modules',
      )
    if (value.kind === 'Call' && isNode(value.fields.func) && value.fields.func.kind === 'Name')
      assert.ok(
        !['exec', 'eval', 'compile', '__import__'].includes(String(value.fields.func.fields.id)),
        'Reference examples must not execute hidden source strings',
      )
    for (const child of Object.values(value.fields)) editorial(child)
  }
  editorial(tree)
  const projection = pythonASTToVisual(tree, {
    codecs: authoring.codecs,
    officialModules: authoring.officialModules,
  })
  const coverage = inspectPythonVisualProjection(projection)
  assert.equal(
    coverage.opaque.length,
    0,
    `Opaque Python syntax: ${JSON.stringify(coverage.opaque)}`,
  )
  for (const { id } of coverage.blocks)
    assert.ok(
      authoring.approvedBlockIds.has(id),
      `Block not in the supplied authoring approval: ${id}`,
    )
  // type_ignores is separate AST metadata; it must not be used to hide executable syntax.
  assert.equal(
    projection.typeIgnores.length,
    0,
    'Reference examples must not hide type-ignore data',
  )
  assert.equal(
    semantic(pythonVisualToAST(projection, authoring.codecs)),
    semantic(tree),
    'Projection lost AST',
  )
  return { projection, coverage }
}

async function parse(analysis: VisualExampleAnalysis, source: string, path: string) {
  const result = await analysis.request({ operation: 'parse', source, path, compilable: true })
  assert.ok(result.ok && 'tree' in result && result.tree, 'Python must parse and compile')
  assert.equal(result.diagnostics.length, 0, 'Python must have no syntax diagnostics')
  assert.equal(result.compilable, true, 'The analyzer must validate symbol tables')
  return result.tree
}

async function render(analysis: VisualExampleAnalysis, tree: PythonNode, path: string) {
  const result = await analysis.request({ operation: 'render', node: tree })
  assert.ok(result.ok && 'source' in result, 'Canonical Python rendering failed')
  assert.equal(
    semantic(await parse(analysis, result.source, path)),
    semantic(tree),
    'Rendered AST drift',
  )
  return result.source
}

/** Authoring qualification only. Supplied block approval never grants runtime capabilities. */
export async function qualifyPythonVisualExample(options: {
  source: string
  path: string
  analysis: VisualExampleAnalysis
  authoring: VisualExampleAuthoring
  edits: readonly VisualExampleEdit[]
}) {
  assert.ok(options.edits.length > 0 && options.edits.length <= 20, 'Provide 1..20 causal edits')
  const original = await parse(options.analysis, options.source, options.path)
  const { projection, coverage } = checkedProjection(original, options.authoring)
  const codecs = options.authoring.codecs
  const first = new Blockly.Workspace()
  const restored = new Blockly.Workspace()
  try {
    const roots = pythonVisualToWorkspace(projection, first, codecs)
    const saved = Blockly.serialization.workspaces.save(first)
    Blockly.serialization.workspaces.load(saved, restored)
    const read = () => pythonWorkspaceToVisual(restored, roots, projection.typeIgnores, codecs)
    let current = read()
    assert.equal(restored.getAllBlocks(false).length, coverage.blockCount, 'Workspace count drift')
    assert.equal(
      semantic(pythonVisualToAST(current, codecs)),
      semantic(original),
      'Saved AST drift',
    )
    let generated = await render(options.analysis, pythonVisualToAST(current, codecs), options.path)
    const edits = []
    for (const edit of options.edits) {
      assert.ok(edit.label.length > 0 && edit.label.length <= 120, 'Invalid edit label')
      const selected = atPath(current, edit.path)
      assert.equal(selected.codecId, edit.codecId, 'Edit codec mismatch')
      const field = selected.fields.find((candidate) => candidate.name === edit.field)
      assert.ok(field, 'Edit field missing')
      assert.equal(field.value, edit.before, 'Stale edit')
      assert.notEqual(edit.after, edit.before, 'The causal edit must change a value')
      const expected = structuredClone(current)
      const expectedField = atPath(expected, edit.path).fields.find(
        (item) => item.name === edit.field,
      )!
      expectedField.value = edit.after
      const expectedTree = pythonVisualToAST(expected, codecs)
      const beforeTree = pythonVisualToAST(current, codecs)
      assert.notEqual(
        semantic(expectedTree),
        semantic(beforeTree),
        'Field does not affect Python AST',
      )
      const block = restored.getBlockById(selected.blockId!)
      assert.ok(block, 'Workspace edit target missing')
      block.setFieldValue(edit.after, edit.field)
      current = read()
      const changed = pythonVisualToAST(current, codecs)
      assert.equal(semantic(changed), semantic(expectedTree), 'Blockly edit changed unrelated AST')
      checkedProjection(changed, options.authoring)
      const source = await render(options.analysis, changed, options.path)
      assert.notEqual(source, generated, 'Blockly edit did not reach generated source')
      edits.push({
        ...edit,
        beforeSourceSha256: digest(generated),
        afterSourceSha256: digest(source),
      })
      generated = source
    }
    const finalSaved = Blockly.serialization.workspaces.save(restored)
    const finalWorkspace = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(finalSaved, finalWorkspace)
      const finalProjection = pythonWorkspaceToVisual(finalWorkspace, roots, [], codecs)
      assert.equal(
        semantic(pythonVisualToAST(finalProjection, codecs)),
        semantic(pythonVisualToAST(current, codecs)),
        'Edited workspace did not persist',
      )
      assert.equal(
        finalWorkspace.getAllBlocks(false).length,
        coverage.blockCount,
        'Saved block loss',
      )
    } finally {
      finalWorkspace.dispose()
    }
    return {
      kind: 'python-visual-authoring',
      analyzer: options.analysis.identity,
      authoringRuntime: options.authoring.runtime,
      authoringRuntimeFeatures: options.authoring.runtimeFeatures,
      authoringLoader: 'loadPythonAuthoring',
      extension: options.authoring.extension,
      codecOrderSha256: digest(canonicalJson(codecs.map(({ id }) => id))),
      sourceSha256: digest(options.source),
      generatedSha256: digest(generated),
      opaqueCount: 0,
      blockCount: coverage.blockCount,
      referencedBlocks: coverage.blocks,
      approvedBlockIdsSha256: digest(canonicalJson([...options.authoring.approvedBlockIds].sort())),
      fullWorkspaceRoundtrip: true,
      initialWorkspaceSha256: digest(canonicalJson(saved)),
      editedWorkspaceSha256: digest(canonicalJson(finalSaved)),
      canonicalRenderReanalysis: true,
      runtimeCapabilitiesQualified: false,
      browserInteractionQualified: false,
      edits,
    }
  } finally {
    first.dispose()
    restored.dispose()
  }
}

/** One pinned CPython/WASM process; only syntax service code executes, never the example. */
export async function startVisualExampleAnalysis(options: {
  nodeExecutable: string
  distribution: string
  distributionSha256: string
}) {
  assert.match(options.distributionSha256, /^[a-f0-9]{64}$/)
  const adapter = resolve(import.meta.dirname, 'visual-example-analysis.mjs')
  const analyzerSha256 = digest(
    await readFile(resolve(import.meta.dirname, '../../src/python/language/analyzer.py'), 'utf8'),
  )
  const child = spawn(
    options.nodeExecutable,
    [
      '--max-old-space-size=1024',
      adapter,
      resolve(options.distribution),
      options.distributionSha256,
    ],
    { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'], env: {}, timeout: 120_000 },
  )
  let pending: { resolve(value: string): void; reject(error: Error): void } | undefined
  let failure: Error | undefined
  let hasClosed = false
  let closing = false
  let stderr = ''
  const fail = (error: Error) => {
    failure ??= error
    const request = pending
    pending = undefined
    request?.reject(failure)
  }
  child.stderr.setEncoding('utf8')
  child.stderr.on('data', (data: string) => {
    stderr = (stderr + data).slice(0, 2000)
  })
  child.on('error', fail)
  child.stdin.on('error', fail)
  const closed = new Promise<void>((resolveClosed) =>
    child.once('close', (code) => {
      hasClosed = true
      if (code !== 0) failure ??= new Error(`Python analysis process failed (${code}): ${stderr}`)
      if (pending) fail(failure ?? new Error('Python analysis process closed'))
      resolveClosed()
    }),
  )
  const lines = createInterface({ input: child.stdout })
  lines.on('line', (line) => {
    const request = pending
    pending = undefined
    if (!request) {
      failure ??= new Error('Unsolicited Python analysis response')
      child.stdin.end()
      return
    }
    request.resolve(line)
  })
  async function request(request: PythonAnalysisRequest) {
    assert.ok(!pending, 'Analysis requests must be serial')
    if (failure) throw failure
    assert.ok(!hasClosed && !closing, 'Python analysis process has closed')
    const payload = await new Promise<string>((resolveLine, reject) => {
      pending = { resolve: resolveLine, reject }
      child.stdin.write(`${JSON.stringify(request)}\n`, (error) => {
        if (error) {
          fail(error)
        }
      })
    })
    return readPythonAnalysisResult(payload, 'source' in request ? request.source.length : 0)
  }
  return {
    identity: {
      pythonVersion: '3.14.2' as const,
      pyodideVersion: '314.0.7' as const,
      distributionSha256: options.distributionSha256,
      analyzerSha256,
    },
    processId: child.pid,
    request,
    async close() {
      if (!closing && !hasClosed) {
        closing = true
        child.stdin.end()
      }
      await closed
      lines.close()
      if (failure) throw failure
    },
  }
}

if (import.meta.main) {
  const args = process.argv.slice(2)
  const get = (name: string) => {
    const index = args.indexOf(`--${name}`)
    assert.ok(
      index >= 0 && args[index + 1] && !args[index + 1]!.startsWith('--'),
      `Missing --${name}`,
    )
    return args[index + 1]!
  }
  const analysis = await startVisualExampleAnalysis({
    nodeExecutable: get('node'),
    distribution: get('distribution'),
    distributionSha256: get('distribution-sha256'),
  })
  try {
    const sourcePath = get('source')
    const source = await readFile(sourcePath, 'utf8')
    const approved: unknown = args.includes('--approved-block-ids')
      ? JSON.parse(await readFile(get('approved-block-ids'), 'utf8'))
      : []
    assert.ok(Array.isArray(approved) && approved.every((id) => typeof id === 'string'))
    const authoring = await loadVisualExampleAuthoring({
      release: StudioRuntimeReleaseSchema.parse(
        JSON.parse(await readFile(get('runtime-release'), 'utf8')),
      ),
      approvedBlockIds: approved,
      extension: args.includes('--extension') ? get('extension') : undefined,
    })
    if (args.includes('--inspect')) {
      const tree = await parse(analysis, source, sourcePath)
      const projection = pythonASTToVisual(tree, {
        codecs: authoring.codecs,
        officialModules: authoring.officialModules,
      })
      console.log(
        JSON.stringify(
          {
            kind: 'python-visual-inspection-only',
            qualifies: false,
            sourceSha256: digest(source),
            analyzer: analysis.identity,
            authoringRuntime: authoring.runtime,
            authoringRuntimeFeatures: authoring.runtimeFeatures,
            ...inspectPythonVisualProjection(projection),
          },
          null,
          2,
        ),
      )
    } else {
      assert.ok(
        args.includes('--approved-block-ids'),
        'Qualification requires supplied block approval',
      )
      const edits: VisualExampleEdit[] = JSON.parse(await readFile(get('edits'), 'utf8'))
      console.log(
        JSON.stringify(
          await qualifyPythonVisualExample({
            path: sourcePath,
            source,
            analysis,
            authoring,
            edits,
          }),
          null,
          2,
        ),
      )
    }
  } finally {
    await analysis.close()
  }
}
