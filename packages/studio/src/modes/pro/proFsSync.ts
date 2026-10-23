import type { ProjectTree } from '#core'
import { fileSystemErrorCode } from '../../components/terminal/fileSystemError'
import {
  type ProFileSystem,
  ProFsChangedError,
  readProFileSystem,
  writeProFileSystem,
} from './proFileSystem'
import { reconcileProTree } from './reconcileProTree'

export interface ProFsSync {
  pending(): boolean
  changed(path?: string): void
  flush(): Promise<void>
  dispose(): Promise<void>
}

/** One serialized queue owns both directions. Filesystem events never write directly to the store. */
export function createProFsSync(
  fs: ProFileSystem,
  initial: ProjectTree,
  options: {
    getTree(): ProjectTree | null
    applyTree(expected: ProjectTree, next: ProjectTree): string | null
    active(): boolean
    report(message: string): void
    prepare?(changes: ReadonlySet<string>): Promise<void>
    ingest?(paths: readonly string[]): Promise<string[]>
    ignore?(path: string): boolean
    delayMs?: number
  },
): ProFsSync {
  let base = initial
  let diskCache = initial
  let dirty = new Set<string>()
  let disposed = false
  let timer: ReturnType<typeof setTimeout> | null = null
  let running: Promise<void> | null = null
  const active = () => !disposed && options.active()
  const clearTimer = () => {
    if (timer) clearTimeout(timer)
    timer = null
  }
  const run = (): Promise<void> => {
    clearTimer()
    if (running) return running
    const work = async () => {
      let retries = 0
      let passes = 0
      while (dirty.size && active()) {
        if (++passes > 12)
          throw new Error(
            'O terminal ainda está alterando arquivos. Aguarde o comando terminar para salvar.',
          )
        const changes = dirty
        dirty = new Set()
        try {
          await options.prepare?.(changes)
          const disk = await readProFileSystem(fs, {
            cached: diskCache,
            changed: changes,
            active,
            ignore: options.ignore,
          })
          if (!active()) return
          const unsupported = options.ingest
            ? await options.ingest(disk.unsupported)
            : disk.unsupported
          if (unsupported.length)
            throw new Error(
              `Estes arquivos ainda não podem ser guardados: ${unsupported.slice(0, 5).join(', ')}. Imagens, áudio, GLB e HDR devem ficar em public/. Importe outros materiais pela biblioteca ou remova os arquivos temporários antes de salvar.`,
            )
          if (!active()) return
          const editor = options.getTree()
          if (!editor) return
          const result = reconcileProTree(base, editor, disk.tree)
          const error = options.applyTree(editor, result.tree)
          if (error) throw new Error(error)
          // The store now durably represents this observed disk revision (including
          // any recovery copies). A partial write must retry against that revision,
          // not interpret the same shell edit as a new conflict on every pass.
          base = disk.tree
          diskCache = disk.tree
          if (result.conflicts.length)
            options.report(
              `Edições simultâneas em ${result.conflicts.join(', ')}. As versões do terminal foram preservadas em ${result.recoveryDirectory}.`,
            )
          await writeProFileSystem(fs, disk.tree, result.tree, active)
          if (!active()) return
          base = result.tree
          diskCache = result.tree
        } catch (error) {
          dirty.add('*')
          if (!active()) return
          const moved = ['ENOENT', 'ENOTDIR', 'EISDIR'].includes(fileSystemErrorCode(error) ?? '')
          if ((error instanceof ProFsChangedError || moved) && retries++ < 3) continue
          throw error
        }
      }
    }
    running = work().finally(() => {
      running = null
    })
    return running
  }
  return {
    pending: () => !!running || dirty.size > 0,
    changed(path = '*') {
      if (!active()) return
      dirty.add(path)
      if (running || timer) return
      // Bounded trailing work: an endless stream of terminal events cannot postpone a save.
      timer = setTimeout(() => {
        void run().catch((error: unknown) => {
          if (active()) options.report(error instanceof Error ? error.message : String(error))
        })
      }, options.delayMs ?? 200)
    },
    async flush() {
      if (!active()) return
      dirty.add('*')
      await run()
      // A request can arrive between the loop finishing and its finally callback.
      if (dirty.size && active()) await run()
    },
    async dispose() {
      disposed = true
      clearTimer()
      await running?.catch(() => undefined)
    },
  }
}
