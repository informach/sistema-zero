import { expect, test } from 'bun:test'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Processes } from '../src/process/manager'
import { Store } from '../src/store/client'
import { Workspaces } from '../src/workspace/snapshot'

test('fork includes staged, unstaged and untracked WIP without changing source', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'zero-wip-'))
  const profile = await mkdtemp(join(tmpdir(), 'zero-profile-'))
  const store = new Store(join(profile, 'state.sqlite'))
  const processes = new Processes(profile)
  const workspaces = new Workspaces(store, processes, profile)
  const signal = new AbortController().signal
  try {
    await workspaces.git(directory, ['init'], signal)
    await workspaces.git(directory, ['config', 'user.name', 'Fixture'], signal)
    await workspaces.git(directory, ['config', 'user.email', 'fixture@example.invalid'], signal)
    await writeFile(join(directory, 'tracked.txt'), 'base')
    await workspaces.git(directory, ['add', 'tracked.txt'], signal)
    await workspaces.git(directory, ['commit', '-m', 'fixture'], signal)
    await writeFile(join(directory, 'tracked.txt'), 'staged')
    await workspaces.git(directory, ['add', 'tracked.txt'], signal)
    await writeFile(join(directory, 'tracked.txt'), 'unstaged')
    await writeFile(join(directory, 'new.txt'), 'untracked')
    const before = await workspaces.git(directory, ['status', '--porcelain'], signal)
    const snapshot = await workspaces.capture(directory, signal)
    const fork = await workspaces.branch(snapshot.id, 'fixture', signal)
    expect(await readFile(join(fork.path, 'tracked.txt'), 'utf8')).toBe('unstaged')
    expect(await readFile(join(fork.path, 'new.txt'), 'utf8')).toBe('untracked')
    expect(await workspaces.git(directory, ['status', '--porcelain'], signal)).toBe(before)
    expect(await workspaces.git(directory, ['show', ':tracked.txt'], signal)).toBe('staged')
  } finally {
    await store.close()
  }
}, 90000)
