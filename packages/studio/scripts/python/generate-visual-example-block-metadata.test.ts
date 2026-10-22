import { expect, test } from 'bun:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import {
  decodeVisualExampleSource,
  readVisualExampleBlockMetadata,
  visualExampleBlockMetadataSource,
} from './generate-visual-example-block-metadata'

const source = 'x = 1\n'
const receipt = () => ({
  kind: 'python-visual-authoring',
  authoringLoader: 'loadPythonAuthoring',
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
  const generated = visualExampleBlockMetadataSource({
    'pacman-visual': metadata,
    'space-arena-visual': metadata,
  })
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
