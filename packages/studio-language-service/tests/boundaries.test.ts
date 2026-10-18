import { expect, it } from 'bun:test'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { BoundedLspStream } from '../runtime/framing'
import { sourcePositions } from '../runtime/positions'
import { languageResultMapper } from '../runtime/results'

it('round-trips UTF-16 positions across CR/LF/CRLF without splitting code points', () => {
  const source = 'a🐢\r\nb\rc\n\n'
  const index = sourcePositions(source)
  for (const offset of [0, 1, 3, 5, 6, 7, 8, 9, 10])
    expect(index.offset(index.position(offset))).toBe(offset)
  for (const offset of [-1, 2, 4, 11, NaN]) expect(() => index.position(offset)).toThrow()
  expect(index.span({ start: { line: 0, character: 1 }, end: { line: 0, character: 3 } })).toEqual({
    start: 1,
    length: 2,
  })
  expect(() => index.offset({ line: 0, character: 4 })).toThrow()
  expect(() => index.offset({ line: 8, character: 0 })).toThrow()
})

it('filters external navigation but refuses any external or version-mismatched rename', () => {
  const root = resolve('language-fixture')
  const uri = pathToFileURL(resolve(root, 'main.py')).href
  const external = pathToFileURL(resolve(root, '../other.py')).href
  const range = { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } }
  const mapper = languageResultMapper(
    root,
    { revision: 1, files: { 'main.py': { version: 2, source: 'x = 1\n' } } },
    'main.py',
  )
  expect(
    mapper('definitions', [
      { uri: external, range },
      { uri, range },
    ]),
  ).toEqual([{ path: 'main.py', span: { start: 0, length: 1 } }])
  expect(() =>
    mapper('renameSymbol', {
      changes: { [uri]: [{ range, newText: 'y' }], [external]: [{ range, newText: 'y' }] },
    }),
  ).toThrow('outside')
  expect(() =>
    mapper('renameSymbol', {
      documentChanges: [{ textDocument: { uri, version: 1 }, edits: [{ range, newText: 'y' }] }],
    }),
  ).toThrow('version')
  expect(() => mapper('renameSymbol', { documentChanges: [{ kind: 'delete', uri }] })).toThrow(
    'Resource',
  )
  expect(() =>
    mapper('renameSymbol', {
      changes: {
        [uri]: [
          { range, newText: 'y' },
          { range, newText: 'z' },
        ],
      },
    }),
  ).toThrow('Overlapping')
  expect(() =>
    mapper('symbols', [
      {
        name: 'x',
        kind: 13,
        range,
        selectionRange: { start: { line: 0, character: 0 }, end: { line: 99, character: 0 } },
      },
    ]),
  ).toThrow()
})

it('checks complete and fragmented LSP frames before upstream allocation', async () => {
  const frame = Buffer.from('Content-Length: 2\r\n\r\n{}Content-Length: 4\r\n\r\nnull')
  for (const split of [1, 2, 7, 22, frame.length]) {
    const stream = new BoundedLspStream(5)
    const output: Buffer[] = []
    stream.on('data', (value) => output.push(value))
    const done = new Promise<void>((resolve, reject) => {
      stream.on('end', resolve)
      stream.on('error', reject)
    })
    for (let offset = 0; offset < frame.length; offset += split)
      stream.write(frame.subarray(offset, offset + split))
    stream.end()
    await done
    expect(Buffer.concat(output).equals(frame)).toBe(true)
  }
  for (const input of [
    'Content-Length: 6\r\n\r\n',
    'Content-Length: 2\r\nContent-Length: 2\r\n\r\n{}',
    'x'.repeat(4096),
    'Content-Length: 4\r\n\r\na',
  ]) {
    const stream = new BoundedLspStream(5)
    stream.resume()
    const failed = new Promise<Error>((resolve) => stream.once('error', resolve))
    stream.end(Buffer.from(input))
    expect(await failed).toBeInstanceOf(Error)
  }
})
