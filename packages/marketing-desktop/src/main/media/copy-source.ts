import { createHash } from 'node:crypto'
import { open, unlink } from 'node:fs/promises'
export type ExpectedSource = { sha256: string; size: number }
/** Copy one open original within its reserved size; never publish a partial or changed source. */
export async function copySource(
  source: string,
  destination: string,
  reserve: (bytes: number) => Promise<() => void>,
  options: { expected?: ExpectedSource; signal?: AbortSignal } = {},
) {
  const input = await open(source, 'r')
  try {
    const info = await input.stat()
    if (!info.isFile() || info.size === 0 || info.size > 2_000_000_000)
      throw new Error('Arquivo vazio ou maior que o limite local de 2 GB.')
    if (options.expected && info.size !== options.expected.size)
      throw new Error('O tamanho do original mudou desde o inventário')
    options.signal?.throwIfAborted()
    const release = await reserve(info.size)
    let created = false,
      completed = false
    try {
      const output = await open(destination, 'wx', 0o600)
      created = true
      try {
        const buffer = Buffer.alloc(1024 * 1024),
          sha = createHash('sha256')
        let position = 0
        while (position < info.size) {
          options.signal?.throwIfAborted()
          const { bytesRead } = await input.read(
            buffer,
            0,
            Math.min(buffer.length, info.size - position),
            position,
          )
          if (!bytesRead) throw new Error('O original foi truncado durante a cópia')
          const chunk = buffer.subarray(0, bytesRead)
          sha.update(chunk)
          await output.writeFile(chunk)
          position += bytesRead
        }
        const after = await input.stat(),
          sha256 = sha.digest('hex')
        if (
          after.size !== info.size ||
          after.mtimeMs !== info.mtimeMs ||
          after.ctimeMs !== info.ctimeMs ||
          (options.expected && sha256 !== options.expected.sha256)
        )
          throw new Error('O original mudou desde o inventário ou durante a cópia')
        options.signal?.throwIfAborted()
        await output.sync()
      } finally {
        await output.close()
      }
      completed = true
    } finally {
      try {
        if (created && !completed) await unlink(destination)
      } finally {
        release()
      }
    }
  } finally {
    await input.close()
  }
}
