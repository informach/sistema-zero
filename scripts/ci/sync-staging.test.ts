import { afterEach, expect, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { syncStaging } from './sync-staging.mjs'

const temporary: string[] = []
afterEach(() => {
  for (const directory of temporary.splice(0)) rmSync(directory, { recursive: true, force: true })
})

function fixture() {
  const directory = mkdtempSync(join(tmpdir(), 'sz-sync-staging-'))
  temporary.push(directory)
  const remote = join(directory, 'remote.git')
  const cwd = join(directory, 'local')
  const run = (at: string, ...args: string[]) => {
    const result = spawnSync('git', args, { cwd: at, encoding: 'utf8' })
    if (result.status !== 0) throw new Error(result.stderr)
    return result.stdout.trim()
  }
  run(directory, 'init', '--bare', remote)
  run(directory, 'clone', remote, cwd)
  const git = (...args: string[]) => run(cwd, ...args)
  git('config', 'user.email', 'test@example.invalid')
  git('config', 'user.name', 'Branch sync test')
  git('checkout', '-b', 'main')
  writeFileSync(join(cwd, 'base.txt'), 'base')
  git('add', '.')
  git('commit', '-m', 'base')
  git('branch', 'staging')
  git('push', 'origin', 'main', 'staging')
  const base = git('rev-parse', 'HEAD')
  const head = (branch: string) => run(remote, 'rev-parse', branch)
  const commit = (branch: string, file: string) => {
    git('checkout', branch)
    writeFileSync(join(cwd, file), branch)
    git('add', file)
    git('commit', '-m', file)
    git('push', 'origin', branch)
    return git('rev-parse', 'HEAD')
  }
  return { cwd, git, head, commit, base }
}

test('branches já iguais não precisam de deploy', () => {
  const f = fixture()
  expect(syncStaging(f.cwd)).toEqual({
    status: 'current',
    before: f.base,
    sha: f.base,
    contentChanged: false,
  })
})

test('a promoção devolve o merge para staging sem repetir o deploy do mesmo conteúdo', () => {
  const f = fixture()
  const staged = f.commit('staging', 'feature.txt')
  f.git('checkout', 'main')
  f.git('merge', '--no-ff', 'staging', '-m', 'promotion')
  f.git('push', 'origin', 'main')
  const promoted = f.head('main')
  expect(syncStaging(f.cwd)).toEqual({
    status: 'updated',
    before: staged,
    sha: promoted,
    contentChanged: false,
  })
  expect(f.head('staging')).toBe(promoted)
})

test('hotfix em main avança staging e pede CI com o intervalo anterior', () => {
  const f = fixture()
  const fixed = f.commit('main', 'hotfix.txt')
  expect(syncStaging(f.cwd)).toEqual({
    status: 'updated',
    before: f.base,
    sha: fixed,
    contentChanged: true,
  })
  expect(f.head('staging')).toBe(fixed)
})

test('trabalho de staging que já contém main é preservado', () => {
  const f = fixture()
  const next = f.commit('staging', 'next.txt')
  expect(syncStaging(f.cwd)).toEqual({
    status: 'current',
    before: next,
    sha: next,
    contentChanged: false,
  })
  expect(f.head('staging')).toBe(next)
})

test('branches divergentes falham sem sobrescrever nenhum commit', () => {
  const f = fixture()
  const next = f.commit('staging', 'next.txt')
  const fixed = f.commit('main', 'hotfix.txt')
  expect(() => syncStaging(f.cwd)).toThrow('Staging recebeu trabalho novo')
  expect(f.head('staging')).toBe(next)
  expect(f.head('main')).toBe(fixed)
})

test('um push concorrente não é apagado entre a comparação e a atualização', () => {
  const f = fixture()
  const next = f.commit('staging', 'next.txt')
  f.git('--git-dir', '../remote.git', 'update-ref', 'refs/heads/staging', f.base, next)
  const fixed = f.commit('main', 'hotfix.txt')
  const hook = join(f.cwd, '.git', 'hooks', 'pre-push')
  writeFileSync(
    hook,
    `#!/bin/sh\ngit --git-dir=../remote.git update-ref refs/heads/staging ${next} ${f.base}\n`,
  )
  chmodSync(hook, 0o755)
  expect(() => syncStaging(f.cwd)).toThrow('git push:')
  expect(f.head('staging')).toBe(next)
  expect(f.head('main')).toBe(fixed)
})
