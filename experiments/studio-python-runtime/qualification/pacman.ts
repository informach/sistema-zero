import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { canonicalJson } from '../../../packages/core/src/creations/content-fingerprint'
import { StudioRuntimeSelectionSchema } from '../../../packages/core/src/studio/project-environment'
import { StudioPythonDistributionSchema } from '../../../packages/core/src/studio/python-runtime-distribution'
import { StudioRuntimeReleaseSchema } from '../../../packages/core/src/studio/runtime-catalog'
import type { PythonProProjectDocument } from '../../../packages/studio/src/core/editableProject'
import { preparePythonExecutionSnapshot } from '../../../packages/studio/src/runtime/python/snapshot'
import { refinePythonProjectDocument } from '../../../packages/studio/src/state/pythonProjectValidation'

// The parent experiment is CommonJS under Node; Bun also supports this require boundary.
const { portableGameRecipes, portableGameSource }: typeof import('../gameVariants') = createRequire(
  import.meta.url,
)('../gameVariants.ts')

const root = resolve(import.meta.dirname, '../../..')
export const pacmanDistribution = '19de08fbe232d293e833dc3097f880a129e651f14fd539380869031d06369b1c'
export const pacmanDigest = (value: string | Uint8Array) =>
  createHash('sha256').update(value).digest('hex')

interface Http {
  get(path: string): Promise<{ ok(): boolean; json(): Promise<unknown> }>
}
function assertRecord(value: unknown): asserts value is Record<string, unknown> {
  assert(value !== null && typeof value === 'object' && !Array.isArray(value))
}

/** Reads and verifies the exact QA corpus. Does not start Python or install dependencies. */
export async function preparePacmanQualification(
  http: Http,
  expectedDistribution = pacmanDistribution,
) {
  assert(/^[a-f0-9]{64}$/.test(expectedDistribution), 'Pinned QA distribution hash required')
  const manifestBytes = await readFile(
    resolve(root, 'experiments/studio-python-l0/corpus/pacman.json'),
  )
  assert.equal(
    pacmanDigest(manifestBytes),
    'b0d575be9cf6571b750fdf27af75055f51d92e00b73b37c52d3cdb4aa1c56289',
  )
  const manifest = portableGameRecipes.pacman.manifest
  assert.equal(manifest.commit, '2a4eb7f5963f905b1b80ebf4f3c8eaa50da50103')
  const prefix = 'episodes/episode09/'
  const original: Record<string, Buffer> = {}
  const evidence = []
  for (const file of manifest.files) {
    assert(file.path === 'LICENSE' || file.path.startsWith(prefix))
    const raw = await readFile(resolve(root, '.cache/studio-python-l0/pacman-upstream', file.path))
    let bytes = raw
    if (pacmanDigest(raw) !== file.sha256) {
      assert(/\.(py|md|txt)$/.test(file.path) || file.path === 'LICENSE')
      bytes = Buffer.from(raw.toString('utf8').replaceAll('\r\n', '\n'))
    }
    assert.equal(bytes.length, file.bytes)
    assert.equal(pacmanDigest(bytes), file.sha256)
    const path = file.path === 'LICENSE' ? file.path : file.path.slice(prefix.length)
    original[path] = bytes
    evidence.push({
      path,
      rawSha256: pacmanDigest(raw),
      sha256: file.sha256,
      normalizedLF: !raw.equals(bytes),
    })
  }
  const main = original['main.py']
  assert(main)
  const variant = portableGameSource('pacman', main.toString('utf8'))
  assert.equal(
    pacmanDigest(variant.content),
    '8bd915293088b0fa85a2313e046711d861f43c481aa691d88ba07402485819d8',
  )
  const get = async (path: string) => {
    const response = await http.get(path)
    assert(response.ok(), `QA host unavailable: ${path}`)
    return response.json()
  }
  const configuration = await get('/configuration')
  const envelope = await get('/distribution')
  assertRecord(configuration)
  assertRecord(envelope)
  const parsed = StudioPythonDistributionSchema.parse(envelope.manifest)
  const release = StudioRuntimeReleaseSchema.parse(envelope.release)
  const distribution = { hash: envelope.hash, manifest: parsed, release }
  assert.equal(envelope.hash, expectedDistribution)
  assert.equal(pacmanDigest(canonicalJson(parsed)), expectedDistribution)
  assert.equal(pacmanDigest(canonicalJson(release.manifest)), release.manifestSha256)
  const runtime = {
    profileId: release.profileId,
    releaseId: release.releaseId,
    manifestSha256: release.manifestSha256,
  }
  const project = await refinePythonProjectDocument(await get('/project/pacmanPortable'))
  assert.equal(project.kind, 'pro')
  if (project.kind !== 'pro') throw new Error('The reference corpus requires a Pro workspace')
  assert.deepEqual(StudioRuntimeSelectionSchema.parse(configuration.runtime), runtime)
  assert.deepEqual(project.runtime, runtime)
  assert.deepEqual(
    release.manifest.artifacts,
    parsed.files.map(({ path, sha256 }) => ({ path, sha256 })),
  )
  assert.deepEqual(release.manifest.python?.providedModules, parsed.providedModules)
  assert.equal(release.manifest.python?.version, parsed.pythonVersion)
  assert.equal(project.python.entrypoint, 'main.py')
  assert.deepEqual(
    project.installedExtensions.map(({ id, version }) => ({ id, version })),
    [{ id: 'python-turtle', version: '1.0.0' }],
  )
  const sources = Object.keys(original).filter((path) => !/\.(gif|wav)$/.test(path))
  assert.deepEqual(Object.keys(project.tree).sort(), sources.sort())
  for (const path of sources) {
    const entry: PythonProProjectDocument['tree'][string] | undefined = project.tree[path]
    const source = original[path]
    assert(entry?.kind === 'file' && source)
    assert.equal(entry.content, path === 'main.py' ? variant.content : source.toString('utf8'))
  }
  const assets = Object.keys(original).filter((path) => /\.(gif|wav)$/.test(path))
  const materials = project.assets ?? []
  assert.equal(assets.length, 12)
  assert.deepEqual(materials.map((asset) => asset.proPath).sort(), assets.sort())
  for (const asset of materials) {
    const source = asset.proPath ? original[asset.proPath] : undefined
    assert(source)
    const binary = asset.dataUrl.split(',')[1]
    assert(binary)
    assert.equal(pacmanDigest(Buffer.from(binary, 'base64')), pacmanDigest(source))
  }
  const snapshot = await preparePythonExecutionSnapshot(project)
  return {
    project,
    evidence: {
      corpus: evidence,
      variant: variant.receipt,
      distribution,
      runtime,
      snapshotRevision: snapshot.revision,
      scope: 'verified source only; not a game execution',
    },
  }
}

export type PacmanScenario =
  | 'observe'
  | 'pellet'
  | 'power'
  | 'death'
  | 'victory-near-end'
  | 'defeat-near-end'

/** Explicit instrumented cases never count as full natural victory/defeat or baseline performance. */
export async function preparePacmanScenario(
  project: PythonProProjectDocument,
  scenario: PacmanScenario,
  seed = 2026,
) {
  assert(
    ['observe', 'pellet', 'power', 'death', 'victory-near-end', 'defeat-near-end'].includes(
      scenario,
    ),
  )
  assert(Number.isSafeInteger(seed))
  const source = await readFile(resolve(import.meta.dirname, 'pacman_observer.py'), 'utf8')
  const marker = 'CONFIG = {"scenario": "observe", "seed": 2026}'
  assert.equal(source.split(marker).length, 2)
  const content = source.replace(marker, `CONFIG = ${JSON.stringify({ scenario, seed })}`)
  const candidate = structuredClone(project)
  assert.equal(candidate.tree['qa_entry.py'], undefined)
  candidate.tree['qa_entry.py'] = { kind: 'file', content }
  candidate.python.entrypoint = 'qa_entry.py'
  await preparePythonExecutionSnapshot(candidate)
  return {
    project: candidate,
    evidence: {
      instrumented: true,
      scenario,
      seed,
      observerSha256: pacmanDigest(content),
      mainSha256: portableGameRecipes.pacman.manifest.portableVariant.entrypointSha256,
      scope:
        'one added observer module and explicit state injection; original five modules preserved',
    },
  }
}
