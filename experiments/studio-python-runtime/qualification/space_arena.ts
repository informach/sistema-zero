import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { PythonProProjectDocument } from '../../../packages/studio/src/core/editableProject'
import { preparePythonExecutionSnapshot } from '../../../packages/studio/src/runtime/python/snapshot'
import { refinePythonProjectDocument } from '../../../packages/studio/src/state/pythonProjectValidation'

export const spaceDigest = (value: string | Uint8Array) =>
  createHash('sha256').update(value).digest('hex')
export const spaceScenarios = ['Q02', 'Q03', 'Q04', 'Q05', 'Q06', 'Q07'] as const
export type SpaceScenario = (typeof spaceScenarios)[number] | 'input-lifecycle'

interface Http {
  get(path: string): Promise<{ ok(): boolean; json(): Promise<unknown> }>
}

/** Verify source/media against the frozen corpus; not execution evidence. */
export async function prepareSpaceQualification(http: Http) {
  const authorityPath = process.env.SZ_GAMES_HOST_AUTHORITY
  assert(authorityPath, 'Current host authority required')
  const authority = JSON.parse(await readFile(authorityPath, 'utf8'))
  const response = await http.get('/project/spaceArenaPortable')
  assert(response.ok())
  const refined = await refinePythonProjectDocument(await response.json())
  if (refined.kind !== 'pro') throw new Error('Space Arena requires Pro')
  const project: PythonProProjectDocument = refined
  assert.deepEqual(project.runtime, authority.configuration.runtime)
  assert.equal(project.python.entrypoint, 'space_arena.py')
  assert.deepEqual(
    project.installedExtensions.map(({ id, version }) => ({ id, version })),
    [{ id: 'python-turtle', version: '1.0.0' }],
    'Canonical Turtle extension mismatch',
  )
  const raw = await readFile(
    resolve(import.meta.dirname, '../../studio-python-l0/corpus/space-arena.json'),
  )
  const manifest = JSON.parse(raw.toString('utf8')) as {
    files: { path: string; sha256: string; bytes: number }[]
    portableVariant: { entrypointSha256: string; version: string }
  }
  assert.equal(manifest.portableVariant.version, 'portable-audio-1.2.0')
  assert.equal(
    manifest.portableVariant.entrypointSha256,
    'd9934ba00b889e0f714aa6e117b62b123f2303476c2543b57d2486457da264f3',
  )
  const sourceNames: string[] = []
  const assetNames: string[] = []
  const files: { name: string; originalSha256: string }[] = []
  const assets = project.assets ?? []
  for (const file of manifest.files) {
    assert(file.path === 'LICENSE' || file.path.startsWith('Space Arena/'))
    const name = file.path === 'LICENSE' ? file.path : file.path.slice('Space Arena/'.length)
    if (/\.(gif|wav)$/i.test(name)) {
      assetNames.push(name)
      const matches = assets.filter((asset) => asset.proPath === name)
      assert.equal(matches.length, 1)
      const data = Buffer.from(matches[0]!.dataUrl.split(',')[1]!, 'base64')
      assert.equal(data.length, file.bytes)
      assert.equal(spaceDigest(data), file.sha256)
    } else {
      sourceNames.push(name)
      const entry = project.tree[name]
      assert(entry?.kind === 'file')
      const content = entry.content.replaceAll('\r\n', '\n')
      const expected: string =
        name === 'space_arena.py' ? manifest.portableVariant.entrypointSha256 : file.sha256
      assert.equal(spaceDigest(content), expected, name)
    }
    files.push({ name, originalSha256: file.sha256 })
  }
  assert.equal(assetNames.length, 9)
  assert.deepEqual(Object.keys(project.tree).sort(), sourceNames.sort())
  assert.deepEqual(assets.map((asset) => asset.proPath).sort(), assetNames.sort())
  await preparePythonExecutionSnapshot(project)
  return {
    project,
    evidence: {
      corpusManifestSha256: spaceDigest(raw),
      files,
      variant: manifest.portableVariant,
      runtime: project.runtime,
    },
  }
}

/** Two QA modules added; every original game module and media byte preserved. */
export async function prepareSpaceScenario(
  project: PythonProProjectDocument,
  scenario: SpaceScenario,
) {
  assert(scenario === 'input-lifecycle' || spaceScenarios.includes(scenario))
  const observer = await readFile(resolve(import.meta.dirname, 'space_arena_observer.py'), 'utf8')
  const input = scenario === 'input-lifecycle'
  const driver = await readFile(
    resolve(import.meta.dirname, input ? 'space_arena_input.py' : 'space_arena_browser.py'),
    'utf8',
  )
  const marker = input
    ? 'CONFIG = {"scenario": "input-lifecycle", "seed": 2026}'
    : 'CONFIG = {"scenario": "Q02", "seed": 2026}'
  assert.equal(driver.split(marker).length, 2)
  const entry = driver.replace(marker, `CONFIG = ${JSON.stringify({ scenario, seed: 2026 })}`)
  const candidate = structuredClone(project)
  assert(!candidate.tree['_qa_space_observer.py'] && !candidate.tree['qa_space_entry.py'])
  candidate.tree['_qa_space_observer.py'] = { kind: 'file', content: observer }
  candidate.tree['qa_space_entry.py'] = { kind: 'file', content: entry }
  candidate.python.entrypoint = 'qa_space_entry.py'
  await preparePythonExecutionSnapshot(candidate)
  return {
    project: candidate,
    evidence: {
      scenario,
      observerSha256: spaceDigest(observer),
      driverSha256: spaceDigest(entry),
      scope: input
        ? 'No state injection or QA key invocation; browser input and real Stop required, not full game or physical-device acceptance'
        : 'Declared causal fixtures/QA binding invocation, not physical input, full game or Tk canvas parity',
    },
  }
}
