import { expect, test } from 'bun:test'
import { BbmodelInputError } from './bbmodelInput'
import { bbmodelLocalFilePath, bbmodelResourcePath } from './bbmodelResourcePath'
import { LocalFilePathError } from './localFilePath'

function failure(read: () => string, reason: BbmodelInputError['reason'], path: string) {
  let error: unknown
  try {
    read()
  } catch (caught) {
    error = caught
  }
  expect(error).toBeInstanceOf(BbmodelInputError)
  expect((error as BbmodelInputError).reason).toBe(reason)
  expect((error as BbmodelInputError).path).toBe(path)
  expect((error as Error).cause).toBeInstanceOf(LocalFilePathError)
}

test('resolves published version bases without basename, case or URI-decoding guesses', () => {
  for (const version of ['4.9', '4.10', '5.0'] as const) {
    const base = version === '4.9' ? 'folder/' : ''
    expect(
      bbmodelResourcePath('..\\Texture%20%2f%2e%2e.png', 'folder/model.bbmodel', version, 'ref'),
    ).toBe(`${base}Texture%20%2f%2e%2e.png`)
    expect(bbmodelResourcePath('./texture.png', 'folder/model.bbmodel', version, 'ref')).toBe(
      version === '4.9' ? 'folder/model.bbmodel/texture.png' : 'folder/texture.png',
    )
  }
  expect(bbmodelLocalFilePath('./folder/../Color%20.png')).toBe('Color%20.png')
  expect(bbmodelResourcePath('../__proto__', 'folder/model.bbmodel', '5.0', 'ref')).toBe(
    '__proto__',
  )
  expect(bbmodelLocalFilePath('texture.png?raw#1')).toBe('texture.png?raw#1')
})

test('rejects absolute, protocol, root-escaping and malformed paths with original provenance', () => {
  for (const path of [
    '/private/a.png',
    'C:\\private\\a.png',
    '\\\\server\\a.png',
    'https://example.test/a.png',
    'data:image/png,',
    '../../a.png',
  ])
    failure(
      () => bbmodelResourcePath(path, 'folder/model.bbmodel', '5.0', 'ref'),
      'unsupported',
      'ref',
    )
  for (const path of ['', 'a//b.png', 'a/', '.', '..', 'a\u0000.png', 'a\u007f.png'])
    failure(() => bbmodelResourcePath(path, 'folder/model.bbmodel', '5.0', 'ref'), 'invalid', 'ref')
  failure(
    () => bbmodelResourcePath('.././https:evil.png', 'folder/model.bbmodel', '5.0', 'ref'),
    'unsupported',
    'ref',
  )
  failure(() => bbmodelLocalFilePath('./http:evil.png', 'chosen'), 'unsupported', 'chosen')
  failure(() => bbmodelLocalFilePath('folder\\image.png', 'chosen'), 'invalid', 'chosen')
  failure(
    () => bbmodelResourcePath('image.png', '../model.bbmodel', '5.0', 'ref'),
    'unsupported',
    'entryPath',
  )
})

test('bounds both the input and resolved path, without lowercasing or truncation', () => {
  expect(bbmodelLocalFilePath('A'.repeat(4096)).length).toBe(4096)
  expect(bbmodelResourcePath('A'.repeat(4096), 'model.bbmodel', '5.0', 'ref').length).toBe(4096)
  failure(() => bbmodelLocalFilePath('A'.repeat(4097)), 'budget', 'files.path')
  failure(
    () => bbmodelResourcePath('A'.repeat(4096), 'folder/model.bbmodel', '5.0', 'ref'),
    'budget',
    'ref',
  )
  failure(
    () => bbmodelResourcePath('A'.repeat(4097), 'model.bbmodel', '5.0', 'ref'),
    'budget',
    'ref',
  )
})
