import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { normalizeAssetName, type ProjectAsset } from '../../packages/studio/src/core/project'
import { buildPythonAssetBundle } from '../../packages/studio/src/core/pythonAssets'
import { documentFixture } from '../../packages/studio/src/state/fixtures/projectDocuments'
import { refinePythonProProjectDocument } from '../../packages/studio/src/state/pythonProProjectValidation'
import { capturePythonProRevisionPayload } from '../../packages/studio/src/state/pythonProRevision'

const root = resolve(import.meta.dirname, '../..')
const cache = resolve(root, '.cache/studio-python-l0')
const output = resolve(cache, 'l2-pacman-document-evidence.json')
await mkdir(cache, { recursive: true })
await writeFile(
  output,
  `${JSON.stringify({ status: 'running', startedAt: new Date().toISOString() })}\n`,
)
const upstream = resolve(cache, 'pacman-upstream')
const episode = resolve(upstream, 'episodes/episode09')
const base = documentFixture('python', 'pro')
assert.ok(base.programmingLanguage === 'python' && base.kind === 'pro')

const digest = (bytes: Uint8Array | string) => createHash('sha256').update(bytes).digest('hex')
const original = new Map<string, Buffer>()
for (const path of (await readdir(episode)).sort())
  original.set(path, await readFile(resolve(episode, path)))
original.set('LICENSE', await readFile(resolve(upstream, 'LICENSE')))
const pinned = JSON.parse(
  await readFile(resolve(root, 'experiments/studio-python-l0/corpus/pacman.json'), 'utf8'),
) as { commit: string; files: { path: string; bytes: number; sha256: string }[] }
const checkoutLineEndings: string[] = []
assert.equal(original.size, pinned.files.length)
for (const file of pinned.files) {
  assert.ok(file.path === 'LICENSE' || file.path.startsWith('episodes/episode09/'))
  const path = file.path.replace('episodes/episode09/', '')
  const bytes = original.get(path)
  assert.ok(bytes, `Missing pinned corpus file: ${file.path}`)
  if (digest(bytes) === file.sha256) assert.equal(bytes.byteLength, file.bytes)
  else {
    // Git on Windows may check out textual blobs with CRLF. Record this explicitly;
    // the reader probe below must preserve the actual checkout bytes unchanged.
    assert.ok(path.endsWith('.py') || path.endsWith('.md') || path === 'LICENSE')
    const lf = Buffer.from(bytes.toString('utf8').replace(/\r\n/g, '\n'), 'utf8')
    assert.equal(digest(lf), file.sha256, `Corpus differs from pinned upstream: ${file.path}`)
    assert.equal(lf.byteLength, file.bytes)
    checkoutLineEndings.push(path)
  }
}

const tree: typeof base.tree = {}
const assets: ProjectAsset[] = []
for (const [path, bytes] of original) {
  if (path.endsWith('.gif') || path.endsWith('.wav')) {
    const image = path.endsWith('.gif')
    const name = normalizeAssetName(path.replace(/\.[^.]+$/, ''))
    assert.ok(name)
    assets.push({
      id: `corpus-${name}`,
      name,
      kind: image ? 'image' : 'audio',
      dataUrl: `data:${image ? 'image/gif' : 'audio/wav'};base64,${bytes.toString('base64')}`,
      source: 'upload',
      proPath: path,
    })
  } else tree[path] = { kind: 'file', content: bytes.toString('utf8') }
}

const document = {
  ...base,
  id: 'pacman-episode09',
  name: 'Pac-Man Episode 09 — document preservation probe',
  tree,
  assets,
  proMeta: { templateId: 'python-import' },
  python: { ...base.python, entrypoint: 'main.py' },
}
const inputJson = JSON.stringify(document)
const project = await refinePythonProProjectDocument(document)
assert.equal(JSON.stringify(document), inputJson)
assert.equal('files' in project, false)
assert.equal('extraFiles' in project, false)

const materialized = new Map<string, Uint8Array>()
for (const [path, node] of Object.entries(project.tree))
  if (node.kind === 'file') materialized.set(path, Buffer.from(node.content, 'utf8'))
const bundle = await buildPythonAssetBundle(project.assets, { files: [...materialized.keys()] })
for (const [path, bytes] of bundle.files) {
  assert.equal(materialized.has(path), false)
  materialized.set(path, bytes)
}
assert.equal(materialized.size, original.size)
// The wire representation must retain the same source strings and binary bytes.
const payload = JSON.parse(JSON.stringify(await capturePythonProRevisionPayload(project)))
assert.equal(payload.base.version, 2)
assert.equal(payload.base.configuration.programmingLanguage, 'python')
assert.equal(payload.base.configuration.python.entrypoint, 'main.py')
const files: { path: string; bytes: number; sha256: string }[] = []
for (const [path, before] of original) {
  const after = materialized.get(path)
  assert.ok(after, `Missing file: ${path}`)
  assert.equal(digest(after), digest(before), `Changed file: ${path}`)
  const serialized = payload.binaries[path]
    ? Buffer.from(payload.binaries[path].base64, 'base64')
    : Buffer.from(payload.base.files[path], 'utf8')
  assert.equal(digest(serialized), digest(before), `Changed revision file: ${path}`)
  if (payload.binaries[path]) {
    assert.equal(payload.binaries[path].sha256, digest(before))
    assert.equal(payload.base.assetFiles[path], digest(before))
  }
  files.push({ path, bytes: after.byteLength, sha256: digest(after) })
}

const sourceHashes: Record<string, string> = {}
for (const path of [
  'experiments/studio-python-documents/corpus.ts',
  'experiments/studio-python-l0/corpus/pacman.json',
  'packages/core/src/studio/project-document.ts',
  'packages/core/src/studio/project-environment.ts',
  'packages/core/src/studio/project-format.ts',
  'packages/studio/src/core/project.ts',
  'packages/studio/src/core/assetBinary.ts',
  'packages/studio/src/core/pythonAssets.ts',
  'packages/studio/src/state/pythonProProjectValidation.ts',
  'packages/studio/src/state/pythonProRevision.ts',
  'packages/core/src/studio/pro-revision.ts',
  'packages/core/src/studio/pro-revision-configuration.ts',
])
  sourceHashes[path] = digest(await readFile(resolve(root, path)))

const report = {
  createdAt: new Date().toISOString(),
  status: 'passed',
  scope:
    'Document validation, binary materialization and serialized Pro revision only: no game execution, media rendering, product export or publication.',
  runtime: 'Structural test fixture; not an approved or executable runtime release.',
  corpus: 'TheWannabeCoder92/pacman-turtle-python, episode09',
  upstreamCommit: pinned.commit,
  checkoutLineEndings: { crlf: checkoutLineEndings, preservedWithoutConversion: true },
  sources: sourceHashes,
  sourceFiles: Object.values(tree).filter((node) => node.kind === 'file').length,
  pythonModules: files.filter((file) => file.path.endsWith('.py')).length,
  images: assets.filter((asset) => asset.kind === 'image').length,
  sounds: assets.filter((asset) => asset.kind === 'audio').length,
  materialManifest: bundle.manifest,
  revision: { version: payload.base.version, hash: payload.base.hash },
  totalBytes: files.reduce((sum, file) => sum + file.bytes, 0),
  files,
}
await writeFile(output, `${JSON.stringify(report, null, 2)}\n`)
console.log(
  JSON.stringify(
    { output, ...report, sources: undefined, files: undefined, materialManifest: undefined },
    null,
    2,
  ),
)
