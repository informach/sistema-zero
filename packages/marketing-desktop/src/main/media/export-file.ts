import { createHash, randomUUID } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { open, rename, statfs, unlink } from 'node:fs/promises'
import path from 'node:path'

/** Existing destination stays intact until the copied bytes match the confirmed manifest. */
export async function exportVerifiedFile(
  source: string,
  destination: string,
  identity: { sha256: string; size: number },
  signal: AbortSignal,
) {
  signal.throwIfAborted()
  const directory = path.dirname(destination)
  const free = await statfs(directory, { bigint: true })
  if (free.bavail * free.bsize < BigInt(identity.size))
    throw new Error('Não há espaço suficiente no destino escolhido')
  const temporary = path.join(directory, `.${path.basename(destination)}.${randomUUID()}.partial`)
  let created = false
  try {
    const handle = await open(temporary, 'wx')
    created = true
    const hash = createHash('sha256')
    let size = 0
    try {
      for await (const chunk of createReadStream(source, { signal })) {
        size += chunk.length
        if (size > identity.size)
          throw new Error('O arquivo de origem excedeu o tamanho confirmado')
        hash.update(chunk)
        let offset = 0
        while (offset < chunk.length) {
          const result = await handle.write(chunk, offset, chunk.length - offset)
          if (!result.bytesWritten) throw new Error('Não foi possível gravar o arquivo exportado')
          offset += result.bytesWritten
        }
      }
      if (size !== identity.size || hash.digest('hex') !== identity.sha256)
        throw new Error(
          'O arquivo copiado diverge do manifesto confirmado; o destino anterior foi preservado',
        )
      await handle.sync()
    } finally {
      await handle.close()
    }
    signal.throwIfAborted()
    await rename(temporary, destination)
    created = false
  } finally {
    if (created) await unlink(temporary)
  }
}
