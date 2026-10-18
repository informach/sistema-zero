import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { documentFixture } from '../../packages/studio/src/state/fixtures/projectDocuments'
import { TURTLE_EXTENSION } from './turtleFixtures'

const root = resolve(import.meta.dirname, '../..')
const definitions = {
  pacmanOriginal: {
    manifest: 'pacman',
    checkout: 'pacman-upstream',
    prefix: 'episodes/episode09/',
    entrypoint: 'main.py',
  },
  spaceArenaOriginal: {
    manifest: 'space-arena',
    checkout: 'space-arena-upstream',
    prefix: 'Space Arena/',
    entrypoint: 'space_arena.py',
  },
} as const
export function isGameFixture(name: string): name is keyof typeof definitions {
  return Object.hasOwn(definitions, name)
}

/** External, licensed test corpus stays in ignored cache. Every input blob is pinned. */
export async function gameFixtureProject(name: keyof typeof definitions) {
  const definition = definitions[name]
  const pinned = JSON.parse(
    await readFile(
      resolve(root, `experiments/studio-python-l0/corpus/${definition.manifest}.json`),
      'utf8',
    ),
  ) as { files: { path: string; sha256: string; bytes: number }[] }
  const project = documentFixture('python', 'pro')
  assert.ok(project.programmingLanguage === 'python' && project.kind === 'pro')
  project.id = name
  project.name = `${name} — unchanged external qualification corpus`
  project.tree = {}
  project.assets = []
  project.python.entrypoint = definition.entrypoint
  project.installedExtensions = [{ ...TURTLE_EXTENSION, installedAt: project.createdAt }]
  for (const file of pinned.files) {
    assert.ok(file.path === 'LICENSE' || file.path.startsWith(definition.prefix))
    const path = file.path === 'LICENSE' ? file.path : file.path.slice(definition.prefix.length)
    const bytes = await readFile(
      resolve(root, '.cache/studio-python-l0', definition.checkout, file.path),
    )
    const hash = (data: Uint8Array) => createHash('sha256').update(data).digest('hex')
    if (hash(bytes) !== file.sha256) {
      assert.ok(/\.(py|md|txt)$/i.test(path) || path === 'LICENSE')
      const lf = Buffer.from(bytes.toString('utf8').replace(/\r\n/g, '\n'))
      assert.equal(hash(lf), file.sha256)
      assert.equal(lf.byteLength, file.bytes)
    } else assert.equal(bytes.byteLength, file.bytes)
    if (/\.(gif|wav)$/i.test(path)) {
      const image = path.toLowerCase().endsWith('.gif')
      const id = `corpus-${project.assets.length}`
      project.assets.push({
        id,
        name: id,
        kind: image ? 'image' : 'audio',
        proPath: path,
        dataUrl: `data:${image ? 'image/gif' : 'audio/wav'};base64,${bytes.toString('base64')}`,
        source: 'upload',
      })
    } else project.tree[path] = { kind: 'file', content: bytes.toString('utf8') }
  }
  return project
}
