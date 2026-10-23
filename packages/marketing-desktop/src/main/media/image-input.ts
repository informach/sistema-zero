import { open } from 'node:fs/promises'

/** Node owns filesystem access; native image decoders receive bounded bytes, including on long Windows paths. */
export async function readImageInput(file: string) {
  const handle = await open(file, 'r')
  try {
    const before = await handle.stat()
    if (!before.isFile() || before.size < 1 || before.size > 64 * 1024 * 1024)
      throw new Error('A imagem precisa ser um arquivo de até 64 MB')
    const bytes = Buffer.allocUnsafe(before.size)
    let offset = 0
    while (offset < bytes.length) {
      const read = await handle.read(
        bytes,
        offset,
        Math.min(1024 * 1024, bytes.length - offset),
        offset,
      )
      if (!read.bytesRead) throw new Error('A imagem foi truncada durante a leitura')
      offset += read.bytesRead
    }
    const after = await handle.stat()
    if (
      after.size !== before.size ||
      after.mtimeMs !== before.mtimeMs ||
      after.ctimeMs !== before.ctimeMs
    )
      throw new Error('A imagem mudou durante a leitura')
    return bytes
  } finally {
    await handle.close()
  }
}
