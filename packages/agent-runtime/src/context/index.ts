import { type FSWatcher, watch } from 'node:fs'
import { join } from 'node:path'
import type { Processes } from '../process/manager'
import { protectedName, readBounded } from '../tools/paths'
export class ProjectIndex {
  private entries = new Map<
    string,
    { generation: number; watcher: FSWatcher | null; files: string[] | null; warning?: string }
  >()
  constructor(
    private processes: Processes,
    private directory: string,
  ) {}
  observe(workspace: string) {
    let entry = this.entries.get(workspace)
    if (!entry) {
      if (this.entries.size >= 8) {
        const oldest = this.entries.keys().next().value
        if (oldest !== undefined) {
          this.entries.get(oldest)?.watcher?.close()
          this.entries.delete(oldest)
        }
      }
      entry = { generation: 0, watcher: null, files: null }
      this.entries.set(workspace, entry)
    } else {
      this.entries.delete(workspace)
      this.entries.set(workspace, entry)
    }
    if (!entry.watcher) {
      const current = entry
      current.files = null
      current.generation++
      try {
        current.watcher = watch(workspace, { recursive: true }, (_event, path) => {
          if (
            !path ||
            !/(^|[\\/])(node_modules|\.git|dist|\.next|\.cache)([\\/]|$)/.test(String(path))
          ) {
            current.generation++
            current.files = null
          }
        })
        current.watcher.on('error', (error) => {
          current.warning = error.message
          current.generation++
          current.files = null
          current.watcher?.close()
          current.watcher = null
        })
      } catch (error) {
        current.warning = error instanceof Error ? error.message : String(error)
      }
    }
    return entry
  }
  async find(workspace: string, query: string, signal: AbortSignal) {
    const entry = this.observe(workspace)
    if (!entry.files) {
      const generation = entry.generation
      const result = await this.processes.run(
        {
          executable: 'rg',
          args: [
            '--files',
            '--hidden',
            '--glob',
            '!.git/**',
            '--glob',
            '!node_modules/**',
            '--glob',
            '!.env*',
          ],
          cwd: workspace,
          maxBytes: 2_000_000,
          timeoutMs: 30000,
        },
        signal,
      )
      if (result.code !== 0 && result.code !== 1)
        throw new Error(`Project index failed: ${result.output}`)
      if (result.reason !== 'exited') throw new Error('Project index exceeded limits')
      const files = (await readBounded(join(this.directory, 'logs', result.log), 2_000_000))
        .toString('utf8')
        .split(/\r?\n/)
        .filter((path) => path && !path.split(/[\\/]/).some(protectedName))
      if (entry.generation !== generation) throw new Error('Project changed during indexing; retry')
      entry.files = files
    }
    const matches = entry.files.filter((path) => path.toLowerCase().includes(query.toLowerCase()))
    return {
      files: matches.slice(0, 200),
      total: matches.length,
      generation: entry.generation,
      warning: entry.warning,
    }
  }
  close() {
    for (const entry of this.entries.values()) entry.watcher?.close()
    this.entries.clear()
  }
}
