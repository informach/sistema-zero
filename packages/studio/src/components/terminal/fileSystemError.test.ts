import { expect, test } from 'bun:test'
import { fileSystemErrorCode } from './fileSystemError'

test('recognizes Node errors and the actual WebContainer RPC error envelope', () => {
  expect(fileSystemErrorCode({ code: 'ENOENT' })).toBe('ENOENT')
  expect(
    fileSystemErrorCode(
      new Error("ENOENT: no such file or directory, open '/home/project/public/missing.png'"),
    ),
  ).toBe('ENOENT')
  expect(fileSystemErrorCode(new Error('EACCES: permission denied'))).toBe('EACCES')
  expect(fileSystemErrorCode(new Error('unexpected text containing ENOENT'))).toBeNull()
  expect(fileSystemErrorCode(null)).toBeNull()
})
