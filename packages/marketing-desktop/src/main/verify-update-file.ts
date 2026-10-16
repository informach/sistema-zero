import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { lstat } from 'node:fs/promises'
import { verifyWindowsSignature } from './clients/windows-signature'

export async function verifyUpdateFile(
  file: string,
  expected: { size: number; sha512: string },
  publishers: string[],
  signature: typeof verifyWindowsSignature = verifyWindowsSignature,
) {
  const stat = await lstat(file)
  if (!stat.isFile() || stat.size !== expected.size)
    throw new Error('O instalador difere do manifesto da atualização.')
  const rejection = await signature(publishers, file)
  if (rejection) throw new Error('Assinatura da atualização inválida.')
  // The publisher alone does not identify the selected version. Recheck its
  // exact bytes after signature verification, including immediately before install.
  const hash = createHash('sha512')
  let size = 0
  for await (const chunk of createReadStream(file)) {
    size += chunk.length
    if (size > expected.size) throw new Error('O instalador difere do manifesto da atualização.')
    hash.update(chunk)
  }
  if (size !== expected.size || hash.digest('base64') !== expected.sha512)
    throw new Error('O instalador difere do manifesto da atualização.')
}
