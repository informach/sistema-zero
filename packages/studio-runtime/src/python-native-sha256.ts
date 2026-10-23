import { createHash } from 'node:crypto'

/** Native digest boundary: its emitted public declaration has no Node imports or globals. */
export interface PythonNativeSha256 {
  update(bytes: Uint8Array): void
  digestHex(): string
}

export function createPythonNativeSha256(): PythonNativeSha256 {
  const hash = createHash('sha256')
  return {
    update(bytes) {
      hash.update(bytes)
    },
    digestHex() {
      return hash.digest('hex')
    },
  }
}
