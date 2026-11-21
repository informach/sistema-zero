import { afterEach, describe, expect, it } from 'bun:test'
import type { Dirent } from 'node:fs'
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { dependencyIndexIssue, readDependencyDeclarations } from './dependencyDeclarations'

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

// Lote 6 da missão (21/11/2026): o "ENOENT … scandir node_modules" aparecia cru no alto do editor
// Pro enquanto a oficina preparava (visto no staging em 20/11).
describe('dependências ainda não instaladas', () => {
  it('sem a pasta node_modules, o índice sai vazio, sem erro', async () => {
    const fs = await fixture({ 'src/main.ts': 'export {}' })
    await expect(readDependencyDeclarations(fs, () => true)).resolves.toEqual({
      files: {},
      availableFiles: [],
    })
  })

  it('um pacote que some no meio da leitura (instalação em andamento) é pulado', async () => {
    const fs = await fixture({
      'node_modules/fica/package.json': '{"name":"fica"}',
      'node_modules/some/package.json': '{"name":"some"}',
    })
    const gone = Object.assign(new Error("ENOENT: no such file or directory, scandir 'x'"), {
      code: 'ENOENT',
    })
    const flaky = {
      ...fs,
      readdir: ((path: string, options?: { withFileTypes: true }) =>
        path === 'node_modules/some'
          ? Promise.reject(gone)
          : options
            ? fs.readdir(path, options)
            : fs.readdir(path)) as typeof fs.readdir,
    }
    const { files } = await readDependencyDeclarations(flaky, () => true)
    expect(Object.keys(files)).toEqual(['node_modules/fica/package.json'])
  })

  it('outro erro do sistema de arquivos vira frase; os limites seguem com a frase deles', () => {
    const denied = Object.assign(new Error("EACCES: permission denied, scandir 'node_modules'"), {
      code: 'EACCES',
    })
    const original = console.warn
    console.warn = () => {}
    try {
      expect(dependencyIndexIssue(denied)).toBe(
        'Não consegui ler as bibliotecas instaladas agora. Elas voltam a ser lidas quando a instalação terminar.',
      )
    } finally {
      console.warn = original
    }
    expect(
      dependencyIndexIssue(
        new Error('As dependências ultrapassaram o limite de indexação do editor.'),
      ),
    ).toBe('As dependências ultrapassaram o limite de indexação do editor.')
  })
})
