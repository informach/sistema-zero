import { expect, test } from 'bun:test'
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseBuildRequest, trustedPackageJson, trustedViteConfig } from '../src/contracts'

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
