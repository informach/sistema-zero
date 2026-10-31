import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { test } from 'node:test'
import { normalizeWebAnimation } from '../vendor/edi-web-data.mjs'

test('vendored player is tied to a source commit, license and exact build hashes', async () => {
  const folder = resolve(import.meta.dirname, '../vendor')
  const manifest = JSON.parse(await readFile(resolve(folder, 'manifest.json'), 'utf8'))
  assert.equal(manifest.format, 'edi-web-player-vendor')
  assert.match(manifest.sourceRevision, /^[a-f0-9]{40}$/)
  assert.equal(Object.keys(manifest.files).length, 6)
  for (const [name, expected] of Object.entries(manifest.files)) {
    assert.match(name, /^[a-zA-Z0-9_.-]+$/)
    const content = await readFile(resolve(folder, name))
    assert.deepEqual(expected, {
      bytes: content.byteLength,
      sha256: createHash('sha256').update(content).digest('hex'),
    })
  }
  assert.match(await readFile(resolve(folder, 'THIRD_PARTY_LICENSES.txt'), 'utf8'), /MIT License/)
})

test('canonical server parser loads without DOM and refuses editable projects or executable uploads', () => {
  assert.equal(typeof globalThis.document, 'undefined')
  assert.throws(() => normalizeWebAnimation({ format: 'edi-animation', version: 999 }))
  assert.throws(() => normalizeWebAnimation('<svg onload="alert(1)"/>'))
  assert.throws(() => normalizeWebAnimation({ version: 25, artboards: [] }))
})
