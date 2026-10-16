import { lstat, readdir, realpath } from 'node:fs/promises'
import { join } from 'node:path'
import { canonical } from '@sistemazero/agent-core'
import { hash, inside, readBounded, workspacePath } from '../tools/paths'

const excluded = new Set([
  '.git',
  'node_modules',
  '.next',
  '.turbo',
  '.cache',
  'dist',
  'build',
  'coverage',
  '.sistemazero',
  '.ssh',
  '.aws',
])
// Recomputed only on verification, never on a UI timer. A revision is content, not mtime.
export async function sourceRevision(root: string, signal: AbortSignal) {
  const canonicalRoot = await realpath(root)
  const files: { path: string; hash: string }[] = []
  let bytes = 0
  let entries = 0
  async function visit(path: string, prefix: string, depth: number) {
    if (depth > 30) throw new Error('Source tree exceeds 30 levels')
    if (!inside(canonicalRoot, await realpath(path)))
      throw new Error('Source directory escaped workspace')
    const children = await readdir(path, { withFileTypes: true })
    children.sort((a, b) => a.name.localeCompare(b.name, 'en'))
    for (const child of children) {
      signal.throwIfAborted()
      if (++entries > 30000) throw new Error('Source tree exceeds 30000 entries')
      if (excluded.has(child.name) || child.name === '.env' || child.name.startsWith('.env.'))
        continue
      const name = prefix + child.name
      const absolute = join(path, child.name)
      const metadata = await lstat(absolute)
      if (metadata.isSymbolicLink())
        throw new Error(`Preview revision cannot certify symlink: ${name}`)
      if (metadata.isDirectory()) await visit(absolute, `${name}/`, depth + 1)
      else if (metadata.isFile()) {
        const data = await readBounded(await workspacePath(canonicalRoot, name), 8_000_000)
        bytes += data.length
        if (bytes > 128_000_000) throw new Error('Source revision exceeds 128 MB')
        files.push({ path: name, hash: hash(data) })
      } else throw new Error(`Unsupported source entry: ${name}`)
    }
  }
  await visit(root, '', 0)
  return { digest: hash(canonical(files)), files: files.length, bytes }
}
