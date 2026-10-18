import { expect, test } from 'bun:test'
import { pythonEnvironmentFixture } from '../state/fixtures/pythonEnvironment'
import { createStudioRuntimeCapture } from './capture'
import { preparePythonExecutionSnapshot } from './python/snapshot'
import type { StudioRuntimeSnapshot } from './types'

async function fixture() {
  const { project } = await pythonEnvironmentFixture('classic')
  const snapshot = await preparePythonExecutionSnapshot(project)
  const image: StudioRuntimeSnapshot = {
    dataUrl:
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aUioAAAAASUVORK5CYII=',
    width: 1,
    height: 1,
    frameSequence: 1,
    identity: {
      projectId: project.id,
      revision: snapshot.revision,
      runtimeManifestSha256: project.runtime.manifestSha256,
      instanceId: 'editor',
      runId: 'run',
      writerEpoch: null,
    },
  }
  return { project, image }
}

test('cover images belong to the executed content and a single Studio instance', async () => {
  const { project, image } = await fixture()
  const cache = createStudioRuntimeCapture()
  const detach = cache.register({ identity: () => image.identity, capture: async () => image })
  expect(await cache.capture(project)).toBe(image.dataUrl)
  expect(await createStudioRuntimeCapture().capture(project)).toBeNull()
  expect(await cache.capture({ ...project, name: 'Novo nome' })).toBe(image.dataUrl)
  if (project.kind !== 'classic') throw new Error('Fixture')
  expect(
    await cache.capture({ ...project, files: { ...project.files, 'main.py': 'print(2)\n' } }),
  ).toBeNull()
  expect(await cache.capture({ ...project, id: 'other-project' })).toBeNull()
  detach()
  expect(await cache.capture(project)).toBe(image.dataUrl)
  cache.clear()
  expect(await cache.capture(project)).toBeNull()
})

test('late captures, older frames and malformed PNGs cannot replace a valid cover', async () => {
  const { project, image } = await fixture()
  const cache = createStudioRuntimeCapture()
  let resolve!: (value: StudioRuntimeSnapshot) => void
  let started!: () => void
  const entered = new Promise<void>((done) => {
    started = done
  })
  const pending = new Promise<StudioRuntimeSnapshot>((done) => {
    resolve = done
  })
  const detach = cache.register({
    identity: () => image.identity,
    capture: () => {
      started()
      return pending
    },
  })
  expect(() =>
    cache.register({ identity: () => image.identity, capture: async () => null }),
  ).toThrow()
  expect(cache.remember({ ...image, frameSequence: 5 })).toBe(true)
  expect(cache.remember(image)).toBe(false)
  expect(cache.remember({ ...image, width: 2 })).toBe(false)
  const capture = cache.capture(project)
  await entered
  detach()
  cache.clear()
  cache.register({
    identity: () => ({ ...image.identity, runId: 'other-run' }),
    capture: async () => null,
  })
  resolve({ ...image, frameSequence: 10 })
  expect(await capture).toBeNull()
})

test('a recent stopped frame can be reused but expires without extending its lifetime', async () => {
  const { project, image } = await fixture()
  let now = 0
  const cache = createStudioRuntimeCapture(() => now)
  const detach = cache.register({ identity: () => image.identity, capture: async () => null })
  expect(cache.remember(image)).toBe(true)
  detach()
  now = 4 * 60_000
  expect(await cache.capture(project)).toBe(image.dataUrl)
  now = 5 * 60_000 + 1
  expect(await cache.capture(project)).toBeNull()
})

test('clear alone revokes a capture in flight even when the owner has not changed', async () => {
  const { project, image } = await fixture()
  const cache = createStudioRuntimeCapture()
  let resolve!: (value: StudioRuntimeSnapshot) => void
  let started!: () => void
  const entered = new Promise<void>((done) => {
    started = done
  })
  const pending = new Promise<StudioRuntimeSnapshot>((done) => {
    resolve = done
  })
  const detach = cache.register({
    identity: () => image.identity,
    capture: () => {
      started()
      return pending
    },
  })
  const capture = cache.capture(project)
  await entered
  cache.clear()
  resolve(image)
  expect(await capture).toBeNull()
  detach()
  expect(await cache.capture(project)).toBeNull()
})
