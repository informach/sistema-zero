import { realpathSync } from 'node:fs'
import { resolve } from 'node:path'

/** Filesystem aliases must not create a second supervisor or a second credential identity. */
export function profileIdentity(directory: string) {
  let path = resolve(directory)
  try {
    path = realpathSync.native(path)
  } catch (error) {
    if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT') throw error
  }
  return process.platform === 'win32' ? path.toLowerCase() : path
}
