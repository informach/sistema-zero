import { createHash } from 'node:crypto'
import { open, realpath, stat } from 'node:fs/promises'
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path'

export const hash = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex')
export function inside(root: string, target: string) {
  const path = relative(root, target)
  return path === '' || (!isAbsolute(path) && path !== '..' && !path.startsWith(`..${sep}`))
}
export function protectedName(name: string) {
  const part = process.platform === 'win32' ? name.toLowerCase().replace(/[ .]+$/, '') : name
  return (
    part === '.git' ||
    part === '.env' ||
    part.startsWith('.env.') ||
    part === '.ssh' ||
    part === '.aws'
  )
}
function checkSegments(root: string, target: string) {
  for (const part of relative(root, target).split(sep)) {
    if (protectedName(part))
      throw new Error('Protected path; use a dedicated credential or Git operation')
    if (
      process.platform === 'win32' &&
      (/[:<>"|?*]/.test(part) ||
        [...part].some((character) => character.charCodeAt(0) < 32) ||
        /[ .]$/.test(part) ||
        /^(con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])(?:\.|$)/i.test(part))
    )
      throw new Error('Unsupported Windows device, stream or path alias')
  }
}
export async function workspacePath(workspace: string, input: string, create = false) {
  const root = await realpath(workspace)
  const candidate = resolve(root, input)
  if (!inside(root, candidate)) throw new Error('Path escapes workspace')
  checkSegments(root, candidate)
  let actual: string
  try {
    actual = await realpath(candidate)
  } catch (error) {
    if (!create || !(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT')
      throw error
    let parent = dirname(candidate)
    while (!(await exists(parent))) {
      const next = dirname(parent)
      if (next === parent) throw new Error('No existing path ancestor')
      parent = next
    }
    actual = resolve(await realpath(parent), relative(parent, candidate))
  }
  if (!inside(root, actual)) throw new Error('Symbolic link escapes workspace')
  checkSegments(root, actual)
  return actual
}
export async function readBounded(path: string, maxBytes = 1_000_000): Promise<Buffer> {
  const file = await open(path, 'r')
  try {
    const metadata = await file.stat()
    if (!metadata.isFile() || metadata.size > maxBytes)
      throw new Error(`Expected a regular file of at most ${maxBytes} bytes`)
    const buffer = Buffer.alloc(Math.min(maxBytes + 1, metadata.size + 1))
    let length = 0
    while (length < buffer.length) {
      const chunk = await file.read(buffer, length, buffer.length - length, length)
      if (!chunk.bytesRead) break
      length += chunk.bytesRead
    }
    if (length > maxBytes || (await file.stat()).size !== metadata.size)
      throw new Error('File changed or exceeded the read limit')
    return buffer.subarray(0, length)
  } finally {
    await file.close()
  }
}
export async function exists(path: string) {
  try {
    await stat(path)
    return true
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return false
    throw error
  }
}
