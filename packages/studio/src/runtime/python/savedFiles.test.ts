import { expect, test } from 'bun:test'
import {
  isPythonSavedFile,
  isPythonSavedFileChange,
  PYTHON_SAVED_FILE_KEY_PREFIX,
  PYTHON_SAVED_FILE_LIMITS,
  readPythonSavedFiles,
  withoutPythonSavedFile,
  withPythonSavedFile,
} from './savedFiles'

const bytes = (text: string) => new TextEncoder().encode(text) as Uint8Array<ArrayBuffer>
const filled = (size: number) => new Uint8Array(size) as Uint8Array<ArrayBuffer>

test('a saved file goes into the game storage record and comes back with the same bytes', () => {
  const record = withPythonSavedFile({}, { path: 'dados/placar.txt', bytes: bytes('Ana;30\n') })
  expect(record).toBeDefined()
  expect(Object.keys(record!)).toEqual([`${PYTHON_SAVED_FILE_KEY_PREFIX}dados/placar.txt`])
  const files = readPythonSavedFiles(record!)
  expect(files.map((file) => file.path)).toEqual(['dados/placar.txt'])
  expect(new TextDecoder().decode(files[0]!.bytes)).toBe('Ana;30\n')
})

test('saving the same file again replaces it, and other keys of the record stay', () => {
  let record: Record<string, string> = { 'outra-chave': 'x' }
  record = withPythonSavedFile(record, { path: 'recorde.txt', bytes: bytes('10') })!
  record = withPythonSavedFile(record, { path: 'recorde.txt', bytes: bytes('25') })!
  expect(record['outra-chave']).toBe('x')
  const files = readPythonSavedFiles(record)
  expect(files).toHaveLength(1)
  expect(new TextDecoder().decode(files[0]!.bytes)).toBe('25')
})

test('the limits refuse one file too many, a file too big and a total too big', () => {
  let record: Record<string, string> = {}
  for (let index = 0; index < PYTHON_SAVED_FILE_LIMITS.files; index++)
    record = withPythonSavedFile(record, { path: `f${index}.txt`, bytes: bytes('1') })!
  expect(readPythonSavedFiles(record)).toHaveLength(PYTHON_SAVED_FILE_LIMITS.files)
  expect(withPythonSavedFile(record, { path: 'mais.txt', bytes: bytes('1') })).toBeUndefined()
  // Rewriting one that is already there still fits.
  expect(withPythonSavedFile(record, { path: 'f0.txt', bytes: bytes('2') })).toBeDefined()

  const big = filled(PYTHON_SAVED_FILE_LIMITS.fileBytes + 1)
  expect(withPythonSavedFile({}, { path: 'grande.bin', bytes: big })).toBeUndefined()

  let full: Record<string, string> = {}
  for (let index = 0; index < 4; index++)
    full = withPythonSavedFile(full, {
      path: `p${index}.bin`,
      bytes: filled(PYTHON_SAVED_FILE_LIMITS.fileBytes),
    })!
  expect(withPythonSavedFile(full, { path: 'um-byte.bin', bytes: filled(1) })).toBeUndefined()
})

test('only portable project paths are kept', () => {
  for (const path of ['', '../fora.txt', '/abs.txt', 'a//b.txt', 'nome com espaço.txt', 7])
    expect(isPythonSavedFile(path, bytes('x'))).toBe(false)
  expect(isPythonSavedFile('placar.txt', 'texto')).toBe(false)
  expect(isPythonSavedFile('placar.txt', bytes('x'))).toBe(true)
})

test('a tampered record is read without the bad entries and within the limits', () => {
  const record: Record<string, string> = {
    [`${PYTHON_SAVED_FILE_KEY_PREFIX}bom.txt`]: btoa('ok'),
    [`${PYTHON_SAVED_FILE_KEY_PREFIX}ruim.txt`]: '%%%não é base64',
    [`${PYTHON_SAVED_FILE_KEY_PREFIX}../fora.txt`]: btoa('x'),
    'py-outra': btoa('x'),
  }
  expect(readPythonSavedFiles(record).map((file) => file.path)).toEqual(['bom.txt'])
})

test('a file the program deleted leaves the record, and the other keys stay', () => {
  let record: Record<string, string> = { 'outra-chave': 'x' }
  record = withPythonSavedFile(record, { path: 'recorde.txt', bytes: bytes('10') })!
  record = withPythonSavedFile(record, { path: 'mapa.txt', bytes: bytes('#') })!
  const without = withoutPythonSavedFile(record, 'recorde.txt')
  expect(readPythonSavedFiles(without).map((file) => file.path)).toEqual(['mapa.txt'])
  expect(without['outra-chave']).toBe('x')
  // Nothing to forget: the same record, so nothing is written again.
  expect(withoutPythonSavedFile(without, 'recorde.txt')).toBe(without)
})

test('a deletion carries only a portable path', () => {
  expect(isPythonSavedFileChange('recorde.txt', null)).toBe(true)
  expect(isPythonSavedFileChange('../recorde.txt', null)).toBe(false)
  expect(isPythonSavedFileChange('recorde.txt', undefined)).toBe(false)
  expect(isPythonSavedFileChange('recorde.txt', bytes('1'))).toBe(true)
})
