import { mkdir, readdir, stat, statfs } from 'node:fs/promises'
import path from 'node:path'
import { SerialQueue } from '../serial-queue'

const GiB = 1024 ** 3
/** One budget for all accounts/projects on a device. Pending files are never evicted implicitly. */
export class DiskBudget {
  private reserved = 0
  private readonly queue = new SerialQueue()
  constructor(
    private readonly root: string,
    private readonly limit = 20 * GiB,
    private readonly minimumFree = 2 * GiB,
  ) {}
  async usage() {
    await mkdir(this.root, { recursive: true })
    let used = 0,
      files = 0
    const directories = [this.root]
    while (directories.length) {
      const directory = directories.pop()
      if (!directory) break
      for (const entry of await readdir(directory, { withFileTypes: true })) {
        if (entry.isSymbolicLink()) continue
        const location = path.join(directory, entry.name)
        if (entry.isDirectory()) directories.push(location)
        else if (entry.isFile()) {
          try {
            used += (await stat(location)).size
          } catch (error) {
            if (!(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT'))
              throw error
          }
          if (++files > 200000)
            throw new Error('O cache possui arquivos demais; revise o armazenamento local')
        }
      }
    }
    const volume = await statfs(this.root)
    return {
      used,
      limit: this.limit,
      available: volume.bavail * volume.bsize,
      reserved: this.reserved,
    }
  }
  async reserve(bytes: number) {
    if (!Number.isSafeInteger(bytes) || bytes < 0) throw new Error('Reserva de disco inválida')
    await this.queue.run(async () => {
      const current = await this.usage()
      if (current.used + this.reserved + bytes > this.limit)
        throw new Error(
          'O cache atingiu o limite de armazenamento. Libere cópias já confirmadas no servidor; arquivos pendentes serão preservados.',
        )
      if (current.available - this.reserved - bytes < this.minimumFree)
        throw new Error(
          'O disco precisa manter espaço livre para o app e o sistema. Libere espaço antes de continuar.',
        )
      this.reserved += bytes
    })
    let released = false
    return () => {
      if (!released) {
        released = true
        this.reserved -= bytes
      }
    }
  }
}
