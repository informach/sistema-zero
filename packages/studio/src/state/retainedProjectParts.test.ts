import { expect, test } from 'bun:test'
import {
  prepareRetainedParts,
  readRetainedPartition,
  restoreRetainedPart,
  retainedBodyIds,
} from './retainedProjectParts'

test('captura o documento antes do primeiro await e compartilha bytes entre IDs, arquivos e materiais', async () => {
  const code = 'console.log("Vila")'
  const values = {
    files: {
      id: 'jogo',
      files: { 'script.js': code },
      extraFiles: [{ name: 'outro.js', content: code }],
      tree: { 'dup.js': { kind: 'file', content: code } },
    },
    assets: {
      id: 'jogo',
      assets: [
        { id: 'A', dataUrl: 'png', flag: null },
        { id: 'B', dataUrl: 'png', future: undefined },
      ],
    },
  }
  const expected = structuredClone(values)
  const pending = prepareRetainedParts(values)
  values.files.files['script.js'] = 'mudou'
  values.assets.assets[0]!.dataUrl = 'tarde'
  const saved = await pending
  expect(retainedBodyIds(saved.parts)).toHaveLength(4)
  const bodies = new Map([...saved.bodies].map(([key, body]) => [key, body.text]))
  for (const part of ['files', 'assets'] as const) {
    expect(
      restoreRetainedPart(part, readRetainedPartition(saved.parts[part]), bodies),
    ).toStrictEqual(expected[part])
  }
})
test('rejeita descritor futuro, restauracao repetida, corpo ausente e entradas executáveis preservando a origem', async () => {
  const saved = await prepareRetainedParts({ files: { files: { 'script.js': 'vila' } } })
  const descriptor = saved.parts.files!
  const bodies = new Map([...saved.bodies].map(([key, body]) => [key, body.text]))
  expect(() => readRetainedPartition({ ...descriptor, version: 2 })).toThrow()
  expect(() =>
    readRetainedPartition({
      ...descriptor,
      strings: [...descriptor.strings, ...descriptor.strings],
    }),
  ).toThrow()
  expect(() => restoreRetainedPart('files', descriptor, new Map())).toThrow()
  expect(() => restoreRetainedPart('assets', descriptor, bodies)).toThrow()
  let invoked = false
  await expect(
    prepareRetainedParts({
      meta: {
        get value() {
          invoked = true
          return 1
        },
      },
    }),
  ).rejects.toThrow()
  expect(invoked).toBe(false)
})
