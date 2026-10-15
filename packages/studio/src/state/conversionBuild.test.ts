import { expect, test } from 'bun:test'
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createEmptyProject } from '#core'
import { buildProFileMap } from '../export/fileMap'
import { convertClassicToProTree } from './convertToPro'

test('converted Three project builds real npm modules and keeps typed extras and asset paths', async () => {
  const root = await mkdtemp(join(tmpdir(), 'studio-conversion-build-'))
  const dependencies = fileURLToPath(
    new URL('../../../studio-runtime/runtime/node_modules', import.meta.url),
  )
  try {
    const source = createEmptyProject('source', 'Conversão')
    source.files['script.js'] =
      'import { color } from "./util.js"; window.convertedColor = color; console.log(window.SZGame3D)'
    source.extraFiles = [
      { name: 'util.ts', language: 'typescript', content: 'export const color: string = "green"' },
    ]
    source.installedExtensions = [{ id: 'game-3d', version: '1.0.0', installedAt: 0 }]
    const tree = await convertClassicToProTree(source)
    const { files } = await buildProFileMap({ ...source, kind: 'pro', mode: 'code', tree })
    for (const [path, content] of Object.entries(files)) {
      await mkdir(dirname(join(root, path)), { recursive: true })
      await writeFile(join(root, path), content)
    }
    await symlink(dependencies, join(root, 'node_modules'), 'junction')
    const child = Bun.spawn(['node', join(dependencies, 'vite/bin/vite.js'), 'build'], {
      cwd: root,
      stdout: 'pipe',
      stderr: 'pipe',
    })
    const [exit, stdout, stderr] = await Promise.all([
      child.exited,
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
    ])
    expect({ exit, error: exit ? `${stdout}\n${stderr}` : '' }).toEqual({ exit: 0, error: '' })
    const html = await readFile(join(root, 'dist', 'index.html'), 'utf8')
    expect(html).not.toContain('importmap')
    expect(html).not.toContain('esm.sh')
    expect(files['src/converted/util.ts']).toContain(': string')
    expect(files['public/util.js']).toBeUndefined()
    expect(files['public/sw.js']).toBeUndefined()
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}, 30_000)

test('conversion rejects lossy exports before altering the project', async () => {
  const source = createEmptyProject('source', 'Original')
  source.files['script.js'] = 'console.log("original")'
  source.extraFiles = [
    { name: 'script.ts', language: 'typescript', content: 'console.log("different")' },
  ]
  await expect(convertClassicToProTree(source)).rejects.toThrow('sem perder conteúdo')
  expect(source.files['script.js']).toBe('console.log("original")')
  source.extraFiles = [{ name: 'invalid.ts', language: 'typescript', content: 'const x = (' }]
  await expect(convertClassicToProTree(source)).rejects.toThrow('sem perder conteúdo')
})
