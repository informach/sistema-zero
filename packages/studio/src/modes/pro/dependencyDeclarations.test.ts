import { afterEach, describe, expect, it } from 'bun:test'
import type { Dirent } from 'node:fs'
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { readDependencyDeclarations } from './dependencyDeclarations'

const roots: string[] = []
afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true })
})
async function fixture(files: Record<string, string>) {
  const root = await mkdtemp(join(tmpdir(), 'studio-declarations-'))
  roots.push(root)
  for (const [path, value] of Object.entries(files)) {
    await mkdir(dirname(join(root, path)), { recursive: true })
    await writeFile(join(root, path), value)
  }
  function readDirectory(path: string): Promise<string[]>
  function readDirectory(path: string, options: { withFileTypes: true }): Promise<Dirent<string>[]>
  function readDirectory(path: string, options?: { withFileTypes: true }) {
    return options ? readdir(join(root, path), options) : readdir(join(root, path))
  }
  return {
    readdir: readDirectory,
    readFile: (path: string, encoding: 'utf-8') => readFile(join(root, path), encoding),
  }
}

describe('índice das dependências instaladas', () => {
  it('aceita a dimensão real dos tipos Phaser sem carregar o catálogo JSON nem scripts', async () => {
    const phaser = `/*${' '.repeat(6_211_003)}*/\nexport class Scene {}`
    const fs = await fixture({
      'node_modules/phaser/package.json': '{"types":"types/index.d.ts"}',
      'node_modules/phaser/types/index.d.ts': 'export * from "./phaser"',
      'node_modules/phaser/types/phaser.d.ts': phaser,
      'node_modules/phaser/types/phaser.json': 'metadata not needed by TypeScript',
      'node_modules/phaser/src/main.js': 'throw new Error("must never execute")',
      'node_modules/typescript/lib/lib.dom.d.ts': 'standard libs already bundled',
    })
    const { files: index, availableFiles } = await readDependencyDeclarations(fs, () => true)
    expect(index['node_modules/phaser/types/phaser.d.ts']).toBe(phaser)
    expect(Object.keys(index)).toHaveLength(3)
    expect(availableFiles).toEqual(['node_modules/phaser/src/main.js'])
  })
  it('recusa arquivo excessivo e cancela ao trocar de projeto', async () => {
    const fs = await fixture({ 'node_modules/oversized/index.d.ts': ' '.repeat(8_000_001) })
    await expect(readDependencyDeclarations(fs, () => true)).rejects.toThrow('limite de memória')
    await expect(readDependencyDeclarations(fs, () => false)).rejects.toThrow('cancelada')
  })
})
