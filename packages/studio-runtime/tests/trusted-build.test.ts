import { expect, test } from 'bun:test'
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { STUDIO_PRO_REMOTE_PACKAGES } from '@sistemazero/core/studio/pro-dependencies'
import {
  parseBuildRequest,
  trustedPackageJson,
  trustedViteConfig,
  undeclaredDependencyMessage,
} from '../src/contracts'

const dependencies = fileURLToPath(new URL('../runtime/node_modules', import.meta.url))

test('build real ignora PostCSS executável fornecido pelo projeto e preserva CSS/TS', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sz-trusted-build-'))
  try {
    const input = parseBuildRequest({
      executionId: 'lesson-1234567890abcdef',
      parentOrigin: 'https://kids.test',
      templateId: 'vanilla-vite',
      files: {
        'index.html':
          '<html><head></head><body><script type="module" src="/src/main.ts"></script></body></html>',
        'src/main.ts':
          'import "./style.css"; const count: number = 1; document.body.textContent = String(count)',
        'src/style.css': 'body { color: rgb(1, 2, 3) }',
        'postcss.config.cjs': 'throw new Error("UNTRUSTED_POSTCSS_EXECUTED")',
      },
    })
    await mkdir(join(root, 'src'))
    for (const [path, content] of Object.entries(input.files))
      await writeFile(join(root, path), content)
    await writeFile(join(root, 'package.json'), trustedPackageJson('vanilla-vite'))
    await writeFile(join(root, 'vite.config.mjs'), trustedViteConfig('vanilla-vite'))
    await symlink(dependencies, join(root, 'node_modules'), 'junction')
    const child = Bun.spawn(
      [
        'node',
        join(dependencies, 'vite/bin/vite.js'),
        'build',
        '--config',
        './vite.config.mjs',
        '--configLoader',
        'native',
      ],
      { cwd: root, stdout: 'pipe', stderr: 'pipe' },
    )
    const [status, stdout, stderr] = await Promise.all([
      child.exited,
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
    ])
    expect({ status, failure: status === 0 ? '' : `${stdout}\n${stderr}` }).toEqual({
      status: 0,
      failure: '',
    })
    const html = await readFile(join(root, 'dist/index.html'), 'utf8')
    expect(html).toContain('assets/')
    expect(`${stdout}\n${stderr}`).not.toContain('UNTRUSTED_POSTCSS_EXECUTED')
  } finally {
    // root is exclusively the directory returned by mkdtemp; rm does not follow junctions.
    await rm(root, { recursive: true, force: true })
  }
}, 30_000)

/**
 * O import de uma biblioteca que o projeto não declarou (revisão do lote 4 da conclusão,
 * 22/11/2026): o `nanoid` está na imagem por ser dependência do postcss, e o Vite do Rodar comum o
 * empacotava. O plugin do catálogo recusa com o recado da criança; o que o projeto declarou monta.
 */
async function montar(templateId: 'vanilla-vite' | 'three-ts', main: string, packageJson?: string) {
  const root = await mkdtemp(join(tmpdir(), 'sz-catalog-build-'))
  try {
    const input = parseBuildRequest({
      executionId: 'lesson-1234567890abcdef',
      parentOrigin: 'https://kids.test',
      templateId,
      files: {
        'index.html':
          '<html><head></head><body><script type="module" src="/src/main.ts"></script></body></html>',
        'src/main.ts': main,
        ...(packageJson ? { 'package.json': packageJson } : {}),
      },
    })
    await mkdir(join(root, 'src'))
    for (const [path, content] of Object.entries(input.files))
      await writeFile(join(root, path), content)
    await writeFile(join(root, 'package.json'), trustedPackageJson(templateId, input.dependencies))
    await writeFile(
      join(root, 'vite.config.mjs'),
      trustedViteConfig(templateId, input.dependencies),
    )
    await symlink(dependencies, join(root, 'node_modules'), 'junction')
    const child = Bun.spawn(
      [
        'node',
        join(dependencies, 'vite/bin/vite.js'),
        'build',
        '--config',
        './vite.config.mjs',
        '--configLoader',
        'native',
      ],
      { cwd: root, stdout: 'pipe', stderr: 'pipe' },
    )
    const [status, stdout, stderr] = await Promise.all([
      child.exited,
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
    ])
    return { status, output: `${stdout}\n${stderr}` }
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}

test('o import de uma biblioteca não declarada é recusado com o recado da criança', async () => {
  const { status, output } = await montar(
    'vanilla-vite',
    'import { nanoid } from "nanoid"; document.body.textContent = nanoid()',
  )
  expect(status).not.toBe(0)
  expect(undeclaredDependencyMessage(output)).toBe(
    'A biblioteca nanoid não está no package.json deste jogo. Se ela é uma das bibliotecas do modelo, escreva ela no package.json; se não, tire o import.',
  )
}, 30_000)

test('a biblioteca declarada monta (e a subpasta dela também)', async () => {
  const { status, output } = await montar(
    'three-ts',
    'import { Vector3 } from "three"; import { MathUtils } from "three/src/math/MathUtils.js"; document.body.textContent = String(new Vector3(1, 2, MathUtils.clamp(3, 0, 1)).x)',
    JSON.stringify({ dependencies: { three: STUDIO_PRO_REMOTE_PACKAGES.three } }),
  )
  expect({ status, failure: status === 0 ? '' : output }).toEqual({ status: 0, failure: '' })
}, 60_000)
