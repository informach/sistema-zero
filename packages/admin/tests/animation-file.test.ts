import { describe, expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  type ModuleAnimation,
  ModuleAnimationSchema,
  moduleAnimation,
} from '@sistemazero/core/course/module-animation'
import { ownedAnimationPreview, prepareAnimationFile } from '../src/lib/animation-file'

const folder = resolve(import.meta.dir, '../../../art/edisvg/exports')
const manifest = JSON.parse(readFileSync(resolve(folder, 'manifest.json'), 'utf8'))
const original: Uint8Array = readFileSync(resolve(folder, manifest.artifacts[0].file))

describe('real ediSVG uploads', () => {
  test('extracts the same verified poster and canonical JSON from the supplied art', () => {
    const result = prepareAnimationFile(original)
    expect(result.info.title).toBeString()
    expect(result.poster.mime).toBe('image/png')
    expect(result.poster.bytes.subarray(0, 8)).toEqual(
      new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
    )
    expect(result.sha256).toBe(createHash('sha256').update(result.content).digest('hex'))
    expect(result.poster.sha256).toBe(
      createHash('sha256').update(result.poster.bytes).digest('hex'),
    )
    expect(result.content.byteLength).toBeGreaterThan(100)
    expect(result.content.byteLength).toBeLessThan(original.byteLength)
    const before = JSON.parse(new TextDecoder().decode(original))
    const after = JSON.parse(result.content.toString('utf8'))
    expect(after.poster).toBeUndefined()
    expect(after.document).toEqual(before.document)
  })

  test('rejects editable projects, JS, bad UTF-8, missing or tampered PNG and excessive bytes', () => {
    const parsed = JSON.parse(new TextDecoder().decode(original))
    const missing = { ...parsed, poster: undefined }
    const tampered = structuredClone(parsed)
    tampered.poster.data = 'AAAA'
    for (const bytes of [
      Buffer.from(JSON.stringify({ version: 25, artboards: [] })),
      Buffer.from('export default () => alert(1)'),
      new Uint8Array([0xc3, 0x28]),
      Buffer.from(JSON.stringify(missing)),
      Buffer.from(JSON.stringify(tampered)),
      new Uint8Array(10_000_001),
    ])
      expect(() => prepareAnimationFile(bytes)).toThrow()
  })
})

test('preview only accepts an exact new owned artifact, without redirect, query or arbitrary resource', () => {
  const prefix = 'https://cdn.example/admin/module-animation/'
  const key = 'f32321f1-39fb-47bc-945f-4a9a575d06f3/animation.edi-animation.json'
  expect(ownedAnimationPreview(prefix + key, prefix)).toBe(true)
  for (const url of [
    `${prefix}${key}?next=http://localhost`,
    `${prefix}${key}#other`,
    `http://127.0.0.1/${key}`,
    `${prefix}../secret.json`,
    prefix + key.replace('animation.', 'other.'),
    prefix.replace('cdn.example', 'cdn.example.attacker.test') + key,
  ])
    expect(ownedAnimationPreview(url, prefix)).toBe(false)
})

test('neutral media reference refuses unrelated files and malformed metadata', () => {
  const art = prepareAnimationFile(original)
  const ref: ModuleAnimation = {
    format: 'edi-animation',
    version: 1,
    title: art.info.title,
    url: 'https://cdn.example/art.edi-animation.json',
    sha256: art.sha256,
    bytes: art.content.byteLength,
    poster: {
      url: 'https://cdn.example/poster.png',
      sha256: art.poster.sha256,
      width: art.poster.width,
      height: art.poster.height,
    },
  }
  expect(ModuleAnimationSchema.parse(ref)).toEqual(ref)
  expect(moduleAnimation(null)).toBeNull()
  for (const changed of [
    { ...ref, url: 'javascript:alert(1)' },
    { ...ref, url: 'https://user:pass@cdn.example/a.edi-animation.json' },
    { ...ref, version: 2 },
    { ...ref, poster: { ...ref.poster, width: 99999 } },
    { ...ref, url: 'https://cdn.example/a.riv' },
    { ...ref, sha256: 'wrong' },
  ])
    expect(moduleAnimation(changed)).toBeNull()
})
