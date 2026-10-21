import { expect, test } from 'bun:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { isAbsolute, relative, resolve } from 'node:path'
import { TURTLE_EXTENSION } from '../../../packages/studio/src/runtime/python/turtle/contract'
import { documentFixture } from '../../../packages/studio/src/state/fixtures/projectDocuments'
import { prepareSpaceQualification, prepareSpaceScenario, spaceScenarios } from './space_arena'

for (const scenario of [...spaceScenarios, 'input-lifecycle'] as const) {
  test(`${scenario} preserves all source/media/runtime while adding two explicit QA modules`, async () => {
    const project = documentFixture('python', 'pro')
    if (project.programmingLanguage !== 'python' || project.kind !== 'pro')
      throw new Error('fixture')
    project.assets = []
    delete project.coverAssetName
    const original = structuredClone(project)
    const result = await prepareSpaceScenario(project, scenario)
    expect(project).toEqual(original)
    const {
      '_qa_space_observer.py': observer,
      'qa_space_entry.py': driver,
      ...rest
    } = result.project.tree
    expect(rest).toEqual(original.tree)
    expect(result.project.assets).toEqual(original.assets)
    expect(result.project.runtime).toEqual(original.runtime)
    expect(result.project.python.entrypoint).toBe('qa_space_entry.py')
    expect(observer?.kind).toBe('file')
    expect(driver?.kind).toBe('file')
    if (driver?.kind !== 'file') throw new Error('missing driver')
    expect(driver.content).toContain(`CONFIG = ${JSON.stringify({ scenario, seed: 2026 })}`)
    expect(driver.content).not.toContain('.getcanvas(')
    expect(result.evidence.scope).toContain(
      scenario === 'input-lifecycle'
        ? 'No state injection or QA key invocation'
        : 'not physical input',
    )
  })
}

test('an existing QA entry is refused without changing the project', async () => {
  const project = documentFixture('python', 'pro')
  if (project.programmingLanguage !== 'python' || project.kind !== 'pro') throw new Error('fixture')
  project.tree['qa_space_entry.py'] = { kind: 'file', content: 'preserve prior QA' }
  const original = structuredClone(project)
  await expect(prepareSpaceScenario(project, 'Q02')).rejects.toThrow()
  expect(project).toEqual(original)
})

test('source inspector refuses missing or wrong-version canonical Turtle before game preparation', async () => {
  const directory = await mkdtemp(resolve(tmpdir(), 'sz-space-metadata-'))
  const previous = process.env.SZ_GAMES_HOST_AUTHORITY
  try {
    const project = documentFixture('python', 'pro')
    if (project.programmingLanguage !== 'python' || project.kind !== 'pro')
      throw new Error('fixture')
    project.assets = []
    delete project.coverAssetName
    project.python.entrypoint = 'space_arena.py'
    project.tree = { 'space_arena.py': { kind: 'file', content: 'import turtle\n' } }
    const authority = resolve(directory, 'authority.json')
    await writeFile(authority, JSON.stringify({ configuration: { runtime: project.runtime } }))
    process.env.SZ_GAMES_HOST_AUTHORITY = authority
    const transport = {
      get: async (path: string) => {
        expect(path).toBe('/project/spaceArenaPortable')
        return { ok: () => true, json: async () => project }
      },
    }
    for (const extensions of [[], [{ ...TURTLE_EXTENSION, version: '9.9.9', installedAt: 10 }]]) {
      project.installedExtensions = extensions
      await expect(prepareSpaceQualification(transport)).rejects.toThrow(
        'Canonical Turtle extension mismatch',
      )
    }
  } finally {
    if (previous === undefined) delete process.env.SZ_GAMES_HOST_AUTHORITY
    else process.env.SZ_GAMES_HOST_AUTHORITY = previous
    const child = relative(tmpdir(), directory)
    assert(!isAbsolute(child) && !child.startsWith('..') && child.startsWith('sz-space-metadata-'))
    await rm(directory, { recursive: true })
  }
})
