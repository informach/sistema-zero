/**
 * Files a Python program writes with open() (a score table, a record, a level it edited) are
 * kept with the project, as they would stay on a computer.
 *
 * They travel apart from the execution snapshot's files (they are not the program, and they do
 * not change its revision): the host reads them from the project's game storage before a run,
 * the interpreter puts them in place, and every file the program closes after writing comes back
 * to the host at once (a game is usually stopped, not ended, so there is no "end of run").
 */
import {
  isStudioPortablePath,
  studioPortableFileConflict,
} from '@sistemazero/core/studio/project-environment'

export const PYTHON_SAVED_FILE_LIMITS = Object.freeze({
  files: 16,
  fileBytes: 64 * 1024,
  totalBytes: 256 * 1024,
  pathChars: 200,
})

/** Game storage keys of saved files (the same record as a JavaScript game's localStorage). */
export const PYTHON_SAVED_FILE_KEY_PREFIX = 'py-file:'

export interface PythonSavedFile {
  path: string
  bytes: Uint8Array<ArrayBuffer>
}

/** What the program did to a kept file: wrote it (its bytes) or deleted it (null). */
export interface PythonSavedFileChange {
  path: string
  bytes: Uint8Array<ArrayBuffer> | null
}

export function isPythonSavedFilePath(path: unknown): path is string {
  return (
    typeof path === 'string' &&
    path.length > 0 &&
    path.length <= PYTHON_SAVED_FILE_LIMITS.pathChars &&
    isStudioPortablePath(path)
  )
}

/** A change the program may send: a saved file, or a deleted one (bytes null). */
export function isPythonSavedFileChange(path: unknown, bytes: unknown): boolean {
  return bytes === null ? isPythonSavedFilePath(path) : isPythonSavedFile(path, bytes)
}

export function isPythonSavedFile(path: unknown, bytes: unknown): boolean {
  return (
    isPythonSavedFilePath(path) &&
    bytes instanceof Uint8Array &&
    bytes.buffer instanceof ArrayBuffer &&
    bytes.byteLength <= PYTHON_SAVED_FILE_LIMITS.fileBytes
  )
}

function toBase64(bytes: Uint8Array) {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000)
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(binary)
}

function fromBase64(text: string): Uint8Array<ArrayBuffer> | undefined {
  try {
    const binary = atob(text)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return bytes
  } catch {
    return undefined
  }
}

/** The saved files kept in a project's game storage record (bounded, invalid ones skipped). */
export function readPythonSavedFiles(record: Record<string, string>): PythonSavedFile[] {
  const files: PythonSavedFile[] = []
  let total = 0
  for (const [key, value] of Object.entries(record)) {
    if (!key.startsWith(PYTHON_SAVED_FILE_KEY_PREFIX)) continue
    const path = key.slice(PYTHON_SAVED_FILE_KEY_PREFIX.length)
    const bytes = fromBase64(value)
    if (!bytes || !isPythonSavedFile(path, bytes)) continue
    if (files.length >= PYTHON_SAVED_FILE_LIMITS.files) break
    if (total + bytes.byteLength > PYTHON_SAVED_FILE_LIMITS.totalBytes) break
    total += bytes.byteLength
    files.push({ path, bytes })
  }
  return files.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
}

/**
 * The record with this file written into it, or undefined when it would not fit (too many
 * files, too many bytes): what was saved before stays and the program keeps going.
 */
export function withPythonSavedFile(
  record: Record<string, string>,
  file: PythonSavedFile,
): Record<string, string> | undefined {
  if (!isPythonSavedFile(file.path, file.bytes)) return undefined
  const key = PYTHON_SAVED_FILE_KEY_PREFIX + file.path
  const others = readPythonSavedFiles(record).filter((entry) => entry.path !== file.path)
  const total = others.reduce((sum, entry) => sum + entry.bytes.byteLength, file.bytes.byteLength)
  if (others.length + 1 > PYTHON_SAVED_FILE_LIMITS.files) return undefined
  if (total > PYTHON_SAVED_FILE_LIMITS.totalBytes) return undefined
  return { ...record, [key]: toBase64(file.bytes) }
}

/** The record without this file: the program deleted it (or renamed it to another name). */
export function withoutPythonSavedFile(
  record: Record<string, string>,
  path: string,
): Record<string, string> {
  const key = PYTHON_SAVED_FILE_KEY_PREFIX + path
  if (!(key in record)) return record
  const { [key]: _deleted, ...rest } = record
  return rest
}

/**
 * The saved files a run gets, with the ones that cannot come back taken out of the record: a
 * project file or folder with the same path (even only by letter case) wins, and of two saved
 * files that differ only by letter case the first one stays. A dropped copy would only take
 * room in the limits.
 */
export function prunePythonSavedFiles(
  record: Record<string, string>,
  projectPaths: readonly string[],
  directories: readonly string[],
): PythonSavedFile[] {
  const kept: string[] = []
  return readPythonSavedFiles(record).filter((file) => {
    if (!studioPortableFileConflict([...projectPaths, ...kept, file.path], directories)) {
      kept.push(file.path)
      return true
    }
    delete record[PYTHON_SAVED_FILE_KEY_PREFIX + file.path]
    return false
  })
}
