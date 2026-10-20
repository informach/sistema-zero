import { expect, test } from 'bun:test'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { STUDIO_PRO_REMOTE_PACKAGES } from '@sistemazero/core/studio'
import { parseBuildRequest } from '../src/contracts'
import { prepareRuntimeDependencyLock } from '../src/dependency-lock'

test('dependency preparation uses the installed exact graph and rejects arbitrary versions, registries and workspaces', () => {
  for (const manifest of [
    { dependencies: { unknown: '1.0.0' } },
    { devDependencies: { vite: '8.0.16' } },
    { dependencies: { three: 'latest' } },
    { dependencies: { three: 'https://untrusted.test/pkg.tgz' } },
    { dependencies: { three: '0.180.0' }, workspaces: ['../outside'] },
  ])
    expect(() => prepareRuntimeDependencyLock(JSON.stringify(manifest))).toThrow()
  const packageJson = JSON.stringify({
    name: 'review-game',
    dependencies: { three: '^0.180.0' },
    devDependencies: { vite: '8.1.6', '@types/three': '0.180.0', typescript: '5.9.3' },
  })
  const lock = prepareRuntimeDependencyLock(packageJson),
    packages = JSON.parse(lock).packages
  expect(packages['node_modules/three'].dev).toBeUndefined()
  expect(packages['node_modules/typescript'].dev).toBe(true)
  expect(packages['node_modules/playwright-core']).toBeUndefined()
  expect(() =>
    parseBuildRequest({
      executionId: 'builder-1234567890abcdef',
      parentOrigin: 'https://kids.test',
      templateId: 'vanilla-vite',
      files: {
        'package.json': packageJson,
        'package-lock.json': lock,
        'index.html': '<main>Game</main>',
      },
    }),
  ).not.toThrow()
  const incomplete = JSON.parse(lock)
  delete incomplete.packages['node_modules/rolldown']
  expect(() =>
    parseBuildRequest({
      executionId: 'builder-1234567890abcdef',
      parentOrigin: 'https://kids.test',
      templateId: 'vanilla-vite',
      files: {
        'package.json': packageJson,
        'package-lock.json': JSON.stringify(incomplete),
        'index.html': '<main>Game</main>',
      },
    }),
  ).toThrow('lock está incompleto')
})

test('generated graph installs independently with npm ci and npm ls without changing the lock', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sz-builder-lock-'))
  try {
    const packageJson = JSON.stringify(
      {
        name: 'studio-builder-lock-review',
        private: true,
        type: 'module',
        dependencies: {
          three: STUDIO_PRO_REMOTE_PACKAGES.three,
          react: STUDIO_PRO_REMOTE_PACKAGES.react,
          'react-dom': STUDIO_PRO_REMOTE_PACKAGES['react-dom'],
          phaser: STUDIO_PRO_REMOTE_PACKAGES.phaser,
        },
        devDependencies: Object.fromEntries(
          Object.entries(STUDIO_PRO_REMOTE_PACKAGES).filter(
            ([name]) => !['three', 'react', 'react-dom', 'phaser'].includes(name),
          ),
        ),
      },
      null,
      2,
    )
    const lock = prepareRuntimeDependencyLock(packageJson)
    await writeFile(join(root, 'package.json'), packageJson)
    await writeFile(join(root, 'package-lock.json'), lock)
    for (const args of [
      ['ci', '--ignore-scripts', '--no-audit', '--no-fund'],
      ['ls', '--all'],
    ]) {
      const child = Bun.spawn(['npm', ...args], { cwd: root, stdout: 'pipe', stderr: 'pipe' })
      const [code, stdout, stderr] = await Promise.all([
        child.exited,
        new Response(child.stdout).text(),
        new Response(child.stderr).text(),
      ])
      expect({ code, failure: code ? `${stdout}\n${stderr}` : '' }).toEqual({
        code: 0,
        failure: '',
      })
    }
    expect(await readFile(join(root, 'package-lock.json'), 'utf8')).toBe(lock)
    expect(await readFile(join(root, 'node_modules/three/package.json'), 'utf8')).toContain(
      '0.180.0',
    )
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}, 120000)
