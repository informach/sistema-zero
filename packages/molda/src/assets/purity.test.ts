/**
 * `@sistemazero/molda/assets` e `./studio-library` são faces SEM UI: o host
 * kids e o Estúdio os importam dinamicamente fora do app. Este teste anda o
 * grafo de módulos a partir de cada entrada e reprova qualquer import de
 * React, zustand, three, lucide ou de `components/`.
 */
import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

const SRC = resolve(import.meta.dir, '..')
const FORBIDDEN_BARE = ['react', 'react-dom', 'zustand', 'three', 'lucide-react', 'clsx']
const IMPORT_RE = /(?:import|export)\s+(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]/g

function resolveRelative(from: string, spec: string): string | null {
  const base = resolve(dirname(from), spec)
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, join(base, 'index.ts')]) {
    if (existsSync(candidate) && !candidate.endsWith(SRC)) {
      try {
        readFileSync(candidate)
        return candidate
      } catch {
        // diretório
      }
    }
  }
  return null
}

function walk(entry: string): { files: Set<string>; bare: Set<string> } {
  const files = new Set<string>()
  const bare = new Set<string>()
  const queue = [entry]
  while (queue.length > 0) {
    const file = queue.pop()
    if (!file || files.has(file)) continue
    files.add(file)
    const source = readFileSync(file, 'utf8')
    for (const match of source.matchAll(IMPORT_RE)) {
      const spec = match[1]
      if (!spec) continue
      if (spec.startsWith('.')) {
        const next = resolveRelative(file, spec)
        if (next) queue.push(next)
      } else {
        bare.add(spec)
      }
    }
  }
  return { files, bare }
}

describe('pureza das faces sem UI', () => {
  for (const entry of ['assets/index.ts', 'export/studioLibrary.ts']) {
    test(`${entry} não puxa React, zustand, three nem components/`, () => {
      const { files, bare } = walk(join(SRC, entry))
      const offending = [...bare].filter((spec) =>
        FORBIDDEN_BARE.some((f) => spec === f || spec.startsWith(`${f}/`)),
      )
      expect(offending).toEqual([])
      const ui = [...files].filter(
        (file) => file.includes(`${SRC}${'/'}components`) || file.includes('components\\'),
      )
      expect(ui).toEqual([])
      expect(files.size).toBeGreaterThan(3)
    })
  }

  test('assets/index.ts não importa idb-keyval (só o studio-library lê o banco)', () => {
    const { bare } = walk(join(SRC, 'assets/index.ts'))
    expect([...bare]).not.toContain('idb-keyval')
  })
})
