import { expect, it } from 'bun:test'
import { proSourceInstructions } from '../proSourceInstructions'

it('uses real scripts, Node requirements and the declared package manager', () => {
  const result = proSourceInstructions(
    {
      'package.json': JSON.stringify({
        packageManager: 'pnpm@10.2.0',
        engines: { node: '>=22' },
        scripts: { play: 'vite', build: 'vite build', preview: 'vite preview' },
      }),
      'pnpm-lock.yaml': 'lockfileVersion: 9',
    },
    'play',
  )
  expect(result.text).toContain('pnpm install --frozen-lockfile')
  expect(result.text).toContain('pnpm run play')
  expect(result.text).toContain('>=22')
  expect(result.text).not.toContain('npm run dev')
  expect(result.warnings).toEqual([])
})

it('does not invent runnable commands for absent scripts, invalid manifests or conflicting lockfiles', () => {
  const result = proSourceInstructions({
    'package.json': JSON.stringify({ scripts: { test: 'vitest' }, packageManager: 'pnpm@10.2.0' }),
    'package-lock.json': '{}',
  })
  expect(result.warnings.length).toBe(3)
  expect(result.text).not.toContain('pnpm run dev')
  expect(result.text).not.toContain('pnpm install')
  expect(result.text).not.toContain('Dockerfile')
  expect(proSourceInstructions({ 'package.json': 'null' }).warnings[0]).toContain('inválido')
  expect(proSourceInstructions({ 'package.json': '{' }).text).not.toContain(
    'dependências: npm install',
  )
  const badLock = proSourceInstructions({
    'package.json': '{"scripts":{"dev":"vite","build":"vite build"}}',
    'package-lock.json': '{',
  })
  expect(badLock.warnings[0]).toContain('JSON válido')
  expect(badLock.text).not.toContain('dependências: npm ci')
})

it('selects Yarn frozen installation flags by the declared major version', () => {
  for (const [version, flag] of [
    ['1.22.22', '--frozen-lockfile'],
    ['4.6.0', '--immutable'],
  ]) {
    const result = proSourceInstructions({
      'package.json': JSON.stringify({
        packageManager: `yarn@${version}`,
        scripts: { start: 'vite', build: 'vite build' },
      }),
      'yarn.lock': '# lock',
    })
    expect(result.text).toContain(`yarn install ${flag}`)
    expect(result.text).toContain('yarn run start')
  }
})
