import { expect, test } from 'bun:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { canonicalJson } from '@sistemazero/core/creations'
import { VISUAL_REFERENCE_GAMES } from '../../src/examples/python/visualReferenceGames.manifest'
import { PYTHON_PROGRAMMING_CODECS } from '../../src/python/blocks/catalog'
import { PYTHON_TURTLE_CODECS } from '../../src/python/extensions/turtle/catalog'
import {
  currentCodecOrderSha256,
  decodeVisualExampleSource,
  readVisualExampleBlockMetadata,
  visualExampleBlockMetadataSource,
} from './generate-visual-example-block-metadata'

const source = 'x = 1\n'
const sha256 = (text: string) => createHash('sha256').update(text).digest('hex')
const orderOf = (ids: readonly string[]) => sha256(canonicalJson(ids))
const programmingIds = PYTHON_PROGRAMMING_CODECS.map(({ id }) => id)
const receipt = () => ({
  kind: 'python-visual-authoring',
  authoringLoader: 'loadPythonAuthoring',
  authoringRuntimeFeatures: [] as unknown[],
  codecOrderSha256: orderOf(programmingIds),
  sourceSha256: createHash('sha256').update(source).digest('hex'),
  opaqueCount: 0,
  fullWorkspaceRoundtrip: true,
  canonicalRenderReanalysis: true,
  blockCount: 3,
  referencedBlocks: [
    { id: 'sz_py_variable', count: 1 },
    { id: 'sz_py_integer', count: 2 },
  ],
})

test('source decoding retains BOM identity and refuses invalid UTF-8', () => {
  const original = new TextEncoder().encode(source)
  expect(decodeVisualExampleSource(original)).toBe(source)
  const changed = new TextEncoder().encode(`\uFEFF${source}`)
  assert.throws(() => readVisualExampleBlockMetadata(receipt(), decodeVisualExampleSource(changed)))
  assert.throws(() => decodeVisualExampleSource(new Uint8Array([0xff])))
})

test('metadata contains only exact current-source identity and sorted required block IDs', () => {
  const metadata = readVisualExampleBlockMetadata(receipt(), source)
  expect(metadata).toEqual({
    sourceSha256: receipt().sourceSha256,
    blockIds: ['sz_py_integer', 'sz_py_variable'],
  })
  const generated = visualExampleBlockMetadataSource(
    Object.fromEntries(VISUAL_REFERENCE_GAMES.map(({ key }) => [key, metadata])) as Parameters<
      typeof visualExampleBlockMetadataSource
    >[0],
  )
  expect(generated).toContain('export const VISUAL_REFERENCE_GAME_BLOCKS =')
  expect(generated).not.toContain('referencedBlocks')
  expect(generated).not.toContain('x = 1')
})

test('old, opaque, partial and stale qualifications cannot emit metadata', () => {
  for (const change of [
    { kind: 'inspection' },
    { authoringLoader: undefined },
    { opaqueCount: 1 },
    { fullWorkspaceRoundtrip: false },
    { canonicalRenderReanalysis: false },
    { sourceSha256: 'a'.repeat(64) },
    { blockCount: 2 },
    { referencedBlocks: [] },
    { referencedBlocks: [{ id: 'not-python', count: 3 }] },
    { referencedBlocks: [{ id: 'sz_py_integer', count: 0 }] },
    { referencedBlocks: [{ id: 'sz_py_integer', count: 1.5 }] },
    {
      referencedBlocks: [
        { id: 'sz_py_integer', count: 1 },
        { id: 'sz_py_integer', count: 2 },
      ],
    },
  ])
    assert.throws(() => readVisualExampleBlockMetadata({ ...receipt(), ...change }, source))
  assert.throws(() => readVisualExampleBlockMetadata(receipt(), `${source}y = 2\n`))
})

test('a receipt qualified with another block catalog cannot emit metadata', () => {
  expect(readVisualExampleBlockMetadata(receipt(), source).blockIds).toHaveLength(2)
  for (const change of [
    // One block less in the catalog the example was qualified with.
    { codecOrderSha256: orderOf(programmingIds.slice(1)) },
    // The same blocks in another order.
    { codecOrderSha256: orderOf([...programmingIds].reverse()) },
    // Another extension puts its own blocks first.
    { extension: 'python-pgzero' },
    { extension: 'python-desconhecida' },
    { extension: 'toString' },
    { authoringRuntimeFeatures: undefined },
    { authoringRuntimeFeatures: [1] },
  ])
    assert.throws(() => readVisualExampleBlockMetadata({ ...receipt(), ...change }, source))
})

test('the order puts the supported extension blocks first and follows the runtime features', () => {
  const turtle = { extension: 'python-turtle', authoringRuntimeFeatures: [] }
  const plain = PYTHON_TURTLE_CODECS.filter((codec) => !codec.requiredRuntimeFeatures?.length)
  expect(plain.length).toBeLessThan(PYTHON_TURTLE_CODECS.length)
  expect(currentCodecOrderSha256(turtle)).toBe(
    orderOf([...plain.map(({ id }) => id), ...programmingIds]),
  )
  // A block that needs a runtime feature only enters with the feature.
  const features = [
    ...new Set(PYTHON_TURTLE_CODECS.flatMap((codec) => codec.requiredRuntimeFeatures ?? [])),
  ]
  expect(currentCodecOrderSha256({ ...turtle, authoringRuntimeFeatures: features })).toBe(
    orderOf([...PYTHON_TURTLE_CODECS.map(({ id }) => id), ...programmingIds]),
  )
})
