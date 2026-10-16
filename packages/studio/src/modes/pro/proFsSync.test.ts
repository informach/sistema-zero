import { afterEach, describe, expect, it } from 'bun:test'
import type { Dirent } from 'node:fs'
import { mkdir, mkdtemp, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import type { ProjectTree } from '#core'
import {
  type ProFileSystem,
  ProFsChangedError,
  readProFileSystem,
  writeProFileSystem,
} from './proFileSystem'
import { createProFsSync } from './proFsSync'

const roots: string[] = []
afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true })
})

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'studio-fs-sync-'))
  roots.push(root)
  function readDirectory(path: string): Promise<string[]>
  function readDirectory(path: string, options: { withFileTypes: true }): Promise<Dirent<string>[]>
  function readDirectory(path: string, options?: { withFileTypes: true }) {
    return options ? readdir(join(root, path), options) : readdir(join(root, path))
  }
  const fs: ProFileSystem = {
    readdir: readDirectory,
    readFile: (path, encoding) => readFile(join(root, path), encoding),
    writeFile: async (path, content) => {
      await writeFile(join(root, path), content)
    },
    mkdir: (path, options) => mkdir(join(root, path), options),
    rm: async (path, options) => {
      await rm(join(root, path), options)
    },
  }
  const put = async (path: string, content: string) => {
    await mkdir(dirname(join(root, path)), { recursive: true })
    await writeFile(join(root, path), content)
  }
  await put('package.json', '{}')
  await put('src/main.ts', 'base')
  let tree = (await readProFileSystem(fs)).tree
  const messages: string[] = []
  let active = true
  const sync = createProFsSync(fs, tree, {
    getTree: () => tree,
    applyTree: (expected, next) => {
      expect(expected).toBe(tree)
      tree = next
      return null
    },
    active: () => active,
    report: (message) => messages.push(message),
  })
  return {
    root,
    fs,
    put,
    sync,
    messages,
    get tree() {
      return tree
    },
    set tree(value: ProjectTree) {
      tree = value
    },
    deactivate: () => {
      active = false
    },
  }
}

describe('fila de sincronização com filesystem real', () => {
  it('flush importa manifesto/lock e arquivos do terminal antes de persistir', async () => {
    const f = await fixture()
    await f.put('package.json', '{"dependencies":{"mitt":"3.0.1"}}')
    await f.put('package-lock.json', '{"lockfileVersion":3}')
    await f.put('node_modules/mitt/index.d.ts', 'não deve entrar no documento')
    await f.put('.env', 'segredo')
    await f.put('src/terminal.ts', 'export const novo = 1')
    await f.sync.flush()
    expect(f.tree['package-lock.json']).toEqual({ kind: 'file', content: '{"lockfileVersion":3}' })
    expect(f.tree['src/terminal.ts']).toBeDefined()
    expect(JSON.stringify(f.tree)).not.toContain('node_modules')
    expect(JSON.stringify(f.tree)).not.toContain('segredo')
    expect(f.messages).toEqual([])
    await f.sync.dispose()
  })
  it('renomeação/exclusão pelo shell e edição no editor convergem nas duas direções', async () => {
    const f = await fixture()
    await rename(join(f.root, 'src/main.ts'), join(f.root, 'src/moved.ts'))
    f.tree = { ...f.tree, 'package.json': { kind: 'file', content: '{"name":"updated"}' } }
    await f.sync.flush()
    expect(f.tree['src/main.ts']).toBeUndefined()
    expect(f.tree['src/moved.ts']).toEqual({ kind: 'file', content: 'base' })
    expect(await readFile(join(f.root, 'package.json'), 'utf8')).toBe('{"name":"updated"}')
    await rm(join(f.root, 'src/moved.ts'))
    await f.sync.flush()
    expect(f.tree['src/moved.ts']).toBeUndefined()
    await f.sync.dispose()
  })
  it('editores concorrentes preservam recuperação no disco e no documento', async () => {
    const f = await fixture()
    await f.put('src/main.ts', 'terminal')
    f.tree = { ...f.tree, 'src/main.ts': { kind: 'file', content: 'editor' } }
    await f.sync.flush()
    expect(await readFile(join(f.root, 'src/main.ts'), 'utf8')).toBe('editor')
    expect(
      await readFile(join(f.root, 'studio-terminal-conflict-1/files/src/main.ts'), 'utf8'),
    ).toBe('terminal')
    expect(f.messages[0]).toContain('preservadas')
    await f.sync.flush()
    expect(Object.keys(f.tree).some((path) => path.startsWith('studio-terminal-conflict-2'))).toBe(
      false,
    )
    await f.sync.dispose()
  })
  it('uma escrita tardia do terminal é detectada antes de sobrescrever', async () => {
    const f = await fixture()
    const before = f.tree
    await f.put('src/main.ts', 'late terminal')
    await expect(
      writeProFileSystem(
        f.fs,
        before,
        { ...before, 'src/main.ts': { kind: 'file', content: 'editor' } },
        () => true,
      ),
    ).rejects.toBeInstanceOf(ProFsChangedError)
    expect(await readFile(join(f.root, 'src/main.ts'), 'utf8')).toBe('late terminal')
    await f.sync.dispose()
  })

  it('retries a partial write without duplicating recovery or discarding editor content', async () => {
    const f = await fixture()
    f.tree = { ...f.tree, 'src/main.ts': { kind: 'file', content: 'editor' } }
    await f.put('src/main.ts', 'terminal')
    const write = f.fs.writeFile
    let failed = false
    f.fs.writeFile = async (path, content) => {
      if (!failed && path.includes('conflict-1/files/src/main.ts')) {
        failed = true
        throw new Error('storage unavailable')
      }
      await write(path, content)
    }
    await expect(f.sync.flush()).rejects.toThrow('storage unavailable')
    await f.sync.flush()
    expect(f.tree['src/main.ts']).toEqual({ kind: 'file', content: 'editor' })
    expect(Object.keys(f.tree).filter((path) => /conflict-.*main.ts$/.test(path))).toHaveLength(1)
    expect(
      await readFile(join(f.root, 'studio-terminal-conflict-1/files/src/main.ts'), 'utf8'),
    ).toBe('terminal')
    await f.sync.dispose()
  })
  it('troca de projeto cancela aplicação e escrita pendentes', async () => {
    const f = await fixture()
    f.deactivate()
    await f.put('src/main.ts', 'outro projeto')
    f.sync.changed()
    await f.sync.flush()
    expect(f.tree['src/main.ts']).toEqual({ kind: 'file', content: 'base' })
    await f.sync.dispose()
  })
  it('não remove dados ignorados que estavam dentro de pasta excluída', async () => {
    const f = await fixture()
    await f.put('src/.env', 'manter')
    f.tree = { 'package.json': f.tree['package.json']! }
    await f.sync.flush()
    expect(await readFile(join(f.root, 'src/.env'), 'utf8')).toBe('manter')
    await f.sync.dispose()
  })

  it('does not acknowledge a save that would lose an unsupported terminal file', async () => {
    const f = await fixture()
    await f.put('src/untracked.bin', 'binary output')
    await expect(f.sync.flush()).rejects.toThrow('ainda não podem ser guardados')
    expect(f.sync.pending()).toBe(true)
    expect(await readFile(join(f.root, 'src/untracked.bin'), 'utf8')).toBe('binary output')
    await rm(join(f.root, 'src/untracked.bin'))
    await f.sync.flush()
    expect(f.sync.pending()).toBe(false)
    await f.sync.dispose()
  })
  it('does not publish duplicate recovery files when an unsupported file blocks retries', async () => {
    const f = await fixture()
    f.tree = { ...f.tree, 'src/main.ts': { kind: 'file', content: 'editor' } }
    await f.put('src/main.ts', 'terminal')
    await f.put('src/untracked.bin', 'binary output')
    await expect(f.sync.flush()).rejects.toThrow('ainda não podem ser guardados')
    await expect(f.sync.flush()).rejects.toThrow('ainda não podem ser guardados')
    expect(Object.keys(f.tree).some((path) => path.startsWith('studio-terminal-conflict'))).toBe(
      false,
    )
    await rm(join(f.root, 'src/untracked.bin'))
    await f.sync.flush()
    expect(Object.keys(f.tree).filter((path) => /conflict-.*main.ts$/.test(path))).toHaveLength(1)
    await f.sync.dispose()
  })
})
