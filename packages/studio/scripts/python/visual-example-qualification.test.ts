import { afterAll, beforeAll, expect, test } from 'bun:test'
import assert from 'node:assert/strict'
import { createStudioRuntimeRelease } from '@sistemazero/core/studio/runtime-catalog'
import { PYTHON_PROGRAMMING_CODECS } from '../../src/python/blocks/catalog'
import { moduleNode, node } from '../../src/python/blocks/nodes'
import { pythonASTToVisual } from '../../src/python/blocks/projection'
import { PYTHON_TURTLE_CODECS } from '../../src/python/extensions/turtle/catalog'
import { TURTLE_EXTENSION } from '../../src/runtime/python/turtle/contract'
import {
  inspectPythonVisualProjection,
  loadVisualExampleAuthoring,
  qualifyPythonVisualExample,
  startVisualExampleAnalysis,
  type VisualExampleEdit,
} from './visual-example-qualification'

const nodeExecutable = process.env.PYTHON_VISUAL_QA_NODE
const distribution = process.env.PYTHON_VISUAL_QA_DISTRIBUTION
const distributionSha256 = process.env.PYTHON_VISUAL_QA_DISTRIBUTION_SHA256
const configured = !!(nodeExecutable && distribution && distributionSha256)
const approvedBlockIds = new Set(
  [...PYTHON_TURTLE_CODECS, ...PYTHON_PROGRAMMING_CODECS].map(({ id }) => id),
)
let analysis: Awaited<ReturnType<typeof startVisualExampleAnalysis>>
let authoring: Awaited<ReturnType<typeof loadVisualExampleAuthoring>>
async function fixtureAuthoring(compound = true) {
  const release = await createStudioRuntimeRelease({
    manifestVersion: 1,
    profileId: 'python-visual-qa',
    releaseId: compound ? 'compound' : 'no-compound-capability',
    programmingLanguage: 'python',
    kinds: ['classic'],
    modes: ['blocks', 'bridge', 'code'],
    capabilities: ['edit'],
    extensions: [{ id: TURTLE_EXTENSION.id, versions: [TURTLE_EXTENSION.version] }],
    sourceTargets: ['browser', 'desktop'],
    requiredBrowserFeatures: [],
    artifacts: [{ path: 'inert-qa.txt', sha256: 'a'.repeat(64) }],
    python: {
      version: '3.14.2',
      packages: [],
      providedModules: [],
      features: compound ? ['turtle-compound-shapes'] : [],
    },
  })
  return loadVisualExampleAuthoring({ release, approvedBlockIds: [...approvedBlockIds] })
}
beforeAll(async () => {
  authoring = await fixtureAuthoring()
  if (configured) {
    analysis = await startVisualExampleAnalysis({
      nodeExecutable: nodeExecutable!,
      distribution: distribution!,
      distributionSha256: distributionSha256!,
    })
  }
})

test('the real loader filters compound APIs by the supplied release instead of concatenating catalogs', async () => {
  const old = await fixtureAuthoring(false)
  const gated = authoring.codecs.filter((codec) => codec.requiredRuntimeFeatures?.length)
  expect(gated.length).toBeGreaterThan(0)
  for (const codec of gated) expect(old.codecs.some(({ id }) => id === codec.id)).toBe(false)
  expect(authoring.codecs[0]?.owner).toBe('python-turtle')
  expect(authoring.runtimeFeatures).toEqual(['turtle-compound-shapes'])
})
afterAll(async () => {
  if (analysis) {
    await analysis.close()
    console.info(`Analysis Node process ${analysis.processId} closed normally`)
  }
})

const source = [
  'import turtle',
  'x = 12',
  'speed = 3',
  'color = "red"',
  'pen = turtle.Turtle()',
  'pen.goto(x, 0)',
  'pen.speed(speed)',
  'pen.color(color)',
].join('\n')

async function fixtureEdits(): Promise<VisualExampleEdit[]> {
  const parsed = await analysis.request({
    operation: 'parse',
    source,
    path: 'main.py',
    compilable: true,
  })
  if (!parsed.ok || !('tree' in parsed) || !parsed.tree) throw new Error('Fixture did not parse')
  const coverage = inspectPythonVisualProjection(
    pythonASTToVisual(parsed.tree, {
      codecs: authoring.codecs,
      officialModules: new Set(['turtle']),
    }),
  )
  return [
    { label: 'coordinate', body: 1, codecId: 'sz_py_integer', before: '12', after: '24' },
    { label: 'speed', body: 2, codecId: 'sz_py_integer', before: '3', after: '7' },
    { label: 'color', body: 3, codecId: 'sz_py_text', before: 'red', after: 'blue' },
  ].map(({ body, ...edit }) => {
    const field = coverage.fields.find(
      (candidate) => candidate.path.body === body && candidate.codecId === edit.codecId,
    )
    if (!field) throw new Error('Editable fixture field missing')
    return { ...edit, path: field.path, field: field.field }
  })
}

test('coverage exposes unsupported syntax instead of counting its opaque descendants', () => {
  const projection = pythonASTToVisual(
    moduleNode([
      node('Assert', {
        test: node('Constant', { value: true, kind: null }),
        msg: null,
      }),
    ]),
  )
  const coverage = inspectPythonVisualProjection(projection)
  expect(coverage.opaque).toEqual([{ path: { body: 0, inputs: [] }, kind: 'Assert' }])
  expect(coverage.blockCount).toBe(0)
})

test.skipIf(!configured)(
  'real 3.14 AST survives full Blockly saves and coordinate/speed/color edits',
  async () => {
    const edits = await fixtureEdits()
    const result = await qualifyPythonVisualExample({
      source,
      path: 'main.py',
      analysis,
      authoring,
      edits,
    })
    expect(result.opaqueCount).toBe(0)
    expect(result.blockCount).toBeGreaterThan(20)
    expect(result.referencedBlocks.some(({ id }) => id.startsWith('sz_py_turtle_'))).toBe(true)
    expect(result.fullWorkspaceRoundtrip).toBe(true)
    expect(result.canonicalRenderReanalysis).toBe(true)
    expect(result.edits.map(({ label }) => label)).toEqual(['coordinate', 'speed', 'color'])
    for (const edit of result.edits)
      expect(edit.afterSourceSha256).not.toBe(edit.beforeSourceSha256)
    expect(result.runtimeCapabilitiesQualified).toBe(false)
    expect(result.browserInteractionQualified).toBe(false)
  },
)

test.skipIf(!configured)(
  'unsupported syntax cannot be qualified through an opaque source block',
  async () => {
    await assert.rejects(
      qualifyPythonVisualExample({
        source: `${source}\nassert x`,
        path: 'main.py',
        analysis,
        authoring,
        edits: await fixtureEdits(),
      }),
      /Opaque Python syntax/,
    )
  },
)

test.skipIf(!configured)(
  'missing host authoring approval fails even when the codec exists',
  async () => {
    const missing = new Set(approvedBlockIds)
    missing.delete('sz_py_integer')
    await assert.rejects(
      qualifyPythonVisualExample({
        source,
        path: 'main.py',
        analysis,
        authoring: { ...authoring, approvedBlockIds: missing },
        edits: await fixtureEdits(),
      }),
      /Block not in the supplied authoring approval/,
    )
  },
)

test.skipIf(!configured)(
  'editorial rule refuses hidden code strings and author module imports',
  async () => {
    const edits = await fixtureEdits()
    for (const suffix of [
      'exec("x = 2")',
      'eval("1 + 2")',
      'compile("pass", "x", "exec")',
      'import hidden_game',
      'from .hidden import play',
    ])
      await assert.rejects(
        qualifyPythonVisualExample({
          source: `${source}\n${suffix}`,
          path: 'main.py',
          analysis,
          authoring,
          edits,
        }),
        /Reference examples must/,
      )
  },
)

test.skipIf(!configured)(
  'stale paths, wrong codec, unknown field and no-op edits refuse qualification',
  async () => {
    const first = (await fixtureEdits())[0]!
    const cases: [Partial<VisualExampleEdit>, string][] = [
      [{ before: '999' }, 'Stale edit'],
      [{ codecId: 'sz_py_text' }, 'Edit codec mismatch'],
      [{ field: 'missing' }, 'Edit field missing'],
      [{ after: first.before }, 'must change a value'],
      [{ path: { body: 999, inputs: [] } }, 'target a visual block'],
    ]
    for (const [change, message] of cases)
      await assert.rejects(
        qualifyPythonVisualExample({
          source,
          path: 'main.py',
          analysis,
          authoring,
          edits: [{ ...first, ...change }],
        }),
        new RegExp(message),
      )
  },
)

test.skipIf(!configured)(
  'invalid numeric fields and syntax errors cannot become successful edits',
  async () => {
    const first = (await fixtureEdits())[0]!
    await assert.rejects(
      qualifyPythonVisualExample({
        source,
        path: 'main.py',
        analysis,
        authoring,
        edits: [{ ...first, after: 'not-a-number' }],
      }),
    )
    await assert.rejects(
      qualifyPythonVisualExample({
        source: 'return 1',
        path: 'main.py',
        analysis,
        authoring,
        edits: [first],
      }),
      /Python must parse and compile/,
    )
  },
)

test.skipIf(!configured)(
  'the syntax transport refuses overlap instead of mixing responses',
  async () => {
    const first = analysis.request({ operation: 'parse', source: 'x = 1', path: 'main.py' })
    await assert.rejects(
      analysis.request({ operation: 'parse', source: 'x = 2', path: 'main.py' }),
      /requests must be serial/,
    )
    const result = await first
    expect(result.ok && 'tree' in result && result.tree?.kind === 'Module').toBe(true)
  },
)

test.skipIf(!configured)('a closed syntax process cannot provide a reused response', async () => {
  await analysis.close()
  await assert.rejects(
    analysis.request({ operation: 'parse', source: 'x = 3', path: 'main.py' }),
    /process has closed/,
  )
})
