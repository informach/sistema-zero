import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

export async function hashSources() {
  const hashes: Record<string, string> = {}
  for (const directory of ['', 'web', 'fixtures', 'corpus']) {
    for (const entry of (
      await readdir(resolve(import.meta.dirname, directory), { withFileTypes: true })
    ).sort((a, b) => a.name.localeCompare(b.name))) {
      if (!entry.isFile() || !/\.(ts|mjs|cjs|py|json|ps1)$/.test(entry.name)) continue
      const name = directory ? `${directory}/${entry.name}` : entry.name
      hashes[name] = createHash('sha256')
        .update(await readFile(resolve(import.meta.dirname, name)))
        .digest('hex')
    }
  }
  return hashes
}
