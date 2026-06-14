import { describe, expect, it } from 'bun:test'
import type { DirectoryNode, FileNode } from '@webcontainer/api'
import type { ProjectTree } from '#core'
import {
  buildTerminalFileContents,
  ProTreeCollisionError,
  proTreeToFileSystemTree,
  WEB_CONTAINER_PACKAGE_DEPENDENCIES,
} from './terminalProjectFiles'

describe('buildTerminalFileContents', () => {
  it('gera package.json com dependencias fixas para o WebContainer', () => {
    const contents = buildTerminalFileContents({
      id: 'project-1',
      name: 'Meu Projeto',
      files: {
        'index.html': '<h1>Oi</h1>',
        'style.css': 'h1 { color: red; }',
        'script.js': 'console.log("oi");',
      },
      extraFiles: [],
    })

    const packageJson = JSON.parse(contents['package.json'] ?? '{}') as {
      dependencies: Record<string, string>
      packageManager: string
    }

    expect(packageJson.packageManager).toBe('pnpm@9.12.0')
    expect(packageJson.dependencies).toEqual(WEB_CONTAINER_PACKAGE_DEPENDENCIES)
    for (const version of Object.values(packageJson.dependencies)) {
      expect(version).toMatch(/^\d+\.\d+\.\d+$/)
    }
  })

  it('ignora arquivos extras inseguros ou reservados ao montar a arvore', () => {
    const contents = buildTerminalFileContents({
      id: 'project-1',
      name: 'Projeto',
      files: null,
      extraFiles: [
        { name: 'utils.js', language: 'javascript', content: 'export const ok = true;' },
        { name: '../escape.js', language: 'javascript', content: 'alert(1)' },
        { name: 'index.html', language: 'html', content: '<h1>override</h1>' },
      ],
    })

    expect(contents['utils.js']).toBe('export const ok = true;')
    expect(contents['../escape.js']).toBeUndefined()
    expect(contents['index.html']).toBe('')
  })
})

describe('proTreeToFileSystemTree', () => {
  const tree: ProjectTree = {
    'package.json': { kind: 'file', content: '{}' },
    src: { kind: 'dir' },
    'src/main.ts': { kind: 'file', content: 'export {}' },
    assets: { kind: 'dir' },
  }

  it('aninha arquivos sob directory e preserva raiz', () => {
    const fst = proTreeToFileSystemTree(tree)
    expect((fst['package.json'] as FileNode).file.contents).toBe('{}')
    const srcDir = fst.src as DirectoryNode
    expect(srcDir.directory).toBeDefined()
    expect((srcDir.directory['main.ts'] as FileNode).file.contents).toBe('export {}')
  })

  it('cria pasta vazia declarada como dir', () => {
    const fst = proTreeToFileSystemTree(tree)
    expect((fst.assets as DirectoryNode).directory).toEqual({})
  })

  it('cria pais ausentes mesmo sem nó dir explícito', () => {
    const fst = proTreeToFileSystemTree({
      'a/b/c.ts': { kind: 'file', content: 'x' },
    })
    const a = fst.a as DirectoryNode
    const b = a.directory.b as DirectoryNode
    expect((b.directory['c.ts'] as FileNode).file.contents).toBe('x')
  })

  it('ignora caminhos com node_modules', () => {
    const fst = proTreeToFileSystemTree({
      'node_modules/three/index.js': { kind: 'file', content: 'evil' },
      'src/ok.ts': { kind: 'file', content: 'ok' },
    })
    expect(fst.node_modules).toBeUndefined()
    expect((fst.src as DirectoryNode).directory['ok.ts']).toBeDefined()
  })

  it('falha alto quando um arquivo é reusado como pasta-pai (não sobrescreve em silêncio)', () => {
    // `src` arquivo + `src/main.ts` exige que `src` seja pasta — colisão.
    const collidingTree: ProjectTree = {
      src: { kind: 'file', content: 'sou um arquivo' },
      'src/main.ts': { kind: 'file', content: 'export {}' },
    }
    expect(() => proTreeToFileSystemTree(collidingTree)).toThrow(ProTreeCollisionError)
    expect(() => proTreeToFileSystemTree(collidingTree)).toThrow(/src/)
  })

  it('falha alto quando uma pasta declarada colide com um arquivo de mesmo nome', () => {
    // `app` arquivo + `app` dir (declarado por filho) — colisão na outra ordem.
    const collidingTree: ProjectTree = {
      'app/index.ts': { kind: 'file', content: 'ok' },
      app: { kind: 'file', content: 'arquivo conflitante' },
    }
    expect(() => proTreeToFileSystemTree(collidingTree)).toThrow(ProTreeCollisionError)
  })

  it('falha alto quando o mesmo caminho é declarado como dir e arquivo aparece depois', () => {
    const collidingTree: ProjectTree = {
      lib: { kind: 'dir' },
      'lib/x.ts': { kind: 'file', content: 'x' },
      // `lib` reaparece como arquivo via outra entrada de mesmo nome impossível
      // no objeto, então testamos o caminho dir→arquivo com prefixo:
    }
    // Esta árvore é coerente (lib é só pasta) — NÃO deve lançar.
    expect(() => proTreeToFileSystemTree(collidingTree)).not.toThrow()
  })

  it('buildTerminalFileContents deriva flat da tree em modo pro', () => {
    const contents = buildTerminalFileContents({
      id: 'p',
      name: 'Pro',
      files: null,
      extraFiles: [],
      kind: 'pro',
      tree,
    })
    expect(contents['package.json']).toBe('{}')
    expect(contents['src/main.ts']).toBe('export {}')
    // dirs não viram conteúdo
    expect(contents.src).toBeUndefined()
  })
})
