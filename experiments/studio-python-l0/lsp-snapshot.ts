import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve, sep } from 'node:path'

export function sourceLineCount(source: string) {
  if (source.length === 0) return 0
  return source.split(/\r\n|\r|\n/).length - Number(/[\r\n]$/.test(source))
}

// The language service receives sources, never the entire Pro project tree.
// In particular Pyright auto-loads .pnp.cjs through its bundled Yarn resolver.
// This is an L0 boundary proof; the authenticated production gateway is L5.
export async function materializeSources(
  root: string,
  entries: readonly { path: string; source: string }[],
) {
  const targetRoot = resolve(root)
  const accepted: { path: string; source: string }[] = []
  const omitted: string[] = []
  const seen = new Set<string>()
  for (const entry of entries) {
    assert.ok(entry.path.length <= 256 && entry.path.length > 0, 'Invalid source path length')
    const segments = entry.path.split('/')
    assert.ok(
      segments.every(
        (part) =>
          part &&
          part !== '.' &&
          part !== '..' &&
          !/[\\:]/.test(part) &&
          [...part].every((character) => character.charCodeAt(0) >= 32),
      ),
      'Unsafe source path',
    )
    assert.ok(!seen.has(entry.path.toLowerCase()), 'Duplicate source path')
    seen.add(entry.path.toLowerCase())
    if (
      !/\.pyi?$/.test(entry.path) ||
      segments.some((part) => ['node_modules', '.venv', '.git', '__pycache__'].includes(part))
    ) {
      omitted.push(entry.path)
      continue
    }
    assert.ok(Buffer.byteLength(entry.source) <= 1024 * 1024, 'Source size limit exceeded')
    const path = resolve(targetRoot, ...segments)
    assert.ok(path.startsWith(`${targetRoot}${sep}`), 'Source escaped snapshot')
    accepted.push({ path, source: entry.source })
  }
  assert.ok(accepted.length <= 50, 'Source file limit exceeded')
  assert.ok(
    accepted.reduce((sum, file) => sum + sourceLineCount(file.source), 0) <= 20000,
    'Line limit exceeded',
  )
  // Validate the entire candidate before creating any snapshot files.
  for (const file of accepted) {
    await mkdir(dirname(file.path), { recursive: true })
    await writeFile(file.path, file.source, { flag: 'wx' })
  }
  return { accepted, omitted }
}
