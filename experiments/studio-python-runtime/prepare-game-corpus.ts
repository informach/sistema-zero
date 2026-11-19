import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

/** Download only the pinned, licensed qualification inputs into ignored local cache.
 * Never refresh the manifests from upstream or package these inputs as product assets.
 */
const root = resolve(import.meta.dirname, '../..')
for (const [name, checkout] of [
  ['pacman', 'pacman-upstream'],
  ['space-arena', 'space-arena-upstream'],
] as const) {
  const manifest = JSON.parse(
    await readFile(resolve(root, `experiments/studio-python-l0/corpus/${name}.json`), 'utf8'),
  ) as {
    repository: string
    commit: string
    files: { path: string; sha256: string; bytes: number }[]
  }
  assert.match(manifest.repository, /^https:\/\/github\.com\/[\w-]+\/[\w-]+$/)
  assert.match(manifest.commit, /^[a-f0-9]{40}$/)
  const repository = manifest.repository.slice('https://github.com/'.length)
  let cursor = 0
  await Promise.all(
    Array.from({ length: 4 }, async () => {
      while (cursor < manifest.files.length) {
        const file = manifest.files[cursor++]!
        assert(file.path.split('/').every((part) => part && part !== '..' && part !== '.'))
        assert(!/[\\:\0]/.test(file.path))
        assert.match(file.sha256, /^[a-f0-9]{64}$/)
        assert(Number.isSafeInteger(file.bytes) && file.bytes >= 0)
        const path = resolve(root, '.cache/studio-python-l0', checkout, file.path)
        const matches = (bytes: Uint8Array) =>
          bytes.byteLength === file.bytes &&
          createHash('sha256').update(bytes).digest('hex') === file.sha256
        const existing = await readFile(path).catch((error: NodeJS.ErrnoException) => {
          if (error.code !== 'ENOENT') throw error
          return undefined
        })
        if (existing && matches(existing)) continue
        const source = `https://raw.githubusercontent.com/${repository}/${manifest.commit}/${file.path.split('/').map(encodeURIComponent).join('/')}`
        const response = await fetch(source, { signal: AbortSignal.timeout(30_000) })
        assert(response.ok, `${name}: failed to fetch ${file.path}: HTTP ${response.status}`)
        const bytes = new Uint8Array(await response.arrayBuffer())
        assert(matches(bytes), `${name}: pinned content mismatch for ${file.path}`)
        await mkdir(dirname(path), { recursive: true })
        await writeFile(path, bytes)
      }
    }),
  )
  console.log(`${name}: ${manifest.files.length} pinned corpus files verified (${manifest.commit})`)
}
