import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import {
  createStudioProRevision,
  type StudioProBuilderCommand,
  type StudioProBuilderRepository,
} from '@sistemazero/core/studio'
import { capturePythonProRevisionPayload } from '../../../studio/src/state/pythonProRevision'
import { StudioBuilderService } from '../../src/application/studio-pro/studio-builder.service'
import { PNG } from '../fakes/gallery-python-source'
import { authoringFixture } from '../fakes/studio-authoring-policy'

const actor = { userId: randomUUID(), accountId: randomUUID(), privileged: false }
const runtimeRelease = (await authoringFixture('python', 'pro')).configuration.catalog.releases[0]
if (!runtimeRelease) throw new Error('Missing fixture release')
function repository() {
  const commands: StudioProBuilderCommand[] = []
  const port: StudioProBuilderRepository = {
    purgeExpired: async () => 0,
    list: async () => ({ jobs: [], nextCursor: null }),
    execute: async (_actor, command) => {
      commands.push(command)
      return null
    },
  }
  return { port, commands }
}
async function python(proPath?: string) {
  const { project } = await authoringFixture('python', 'pro')
  if (project.programmingLanguage !== 'python' || project.kind !== 'pro')
    throw new Error('Expected Python Pro')
  project.assets = [
    {
      id: 'drawing',
      name: 'heroi',
      kind: 'image',
      source: 'upload',
      dataUrl: PNG,
      ...(proPath ? { proPath } : {}),
    },
  ]
  project.tree.empty = { kind: 'dir' }
  return capturePythonProRevisionPayload(project)
}
function command(payload: Awaited<ReturnType<typeof python>>) {
  return {
    operation: 'create',
    id: randomUUID(),
    objective: 'Desenhe uma nave',
    model: 'test/model',
    parentOrigin: 'https://kids.test',
    ...payload,
  }
}

test.each([
  'assets/sprite.png',
  'dist/sprite.png',
])('Python admission preserves the canonical v2 environment, real asset bytes at %s and empty directories', async (path) => {
  const payload = await python(path),
    repo = repository()
  let authorizations = 0
  const service = new StudioBuilderService(
    repo.port,
    () => new Date(),
    true,
    false,
    async (owner, base) => {
      authorizations++
      expect(owner).toEqual(actor)
      expect(base).toEqual(payload.base)
      return { runtimeRelease }
    },
  )
  expect(Object.keys(payload.binaries)).toHaveLength(1)
  expect(Object.keys(payload.binaries)).toEqual([path])
  expect(Object.keys(payload.binaries)[0]).not.toStartWith('public/')
  await service.execute(actor, command(payload))
  expect(authorizations).toBe(1)
  expect(repo.commands).toHaveLength(1)
  const admitted = repo.commands[0]
  if (admitted?.operation !== 'create') throw new Error('Missing create')
  expect(admitted.base).toEqual(payload.base)
  expect(admitted.base.directories).toContain('empty')
  expect(admitted.binaries).toEqual(payload.binaries)
})

test.each([
  'missing',
  'denied',
] as const)('Python admission with %s host authorization never enqueues', async (mode) => {
  const repo = repository(),
    payload = await python()
  const service = new StudioBuilderService(
    repo.port,
    () => new Date(),
    true,
    false,
    mode === 'denied'
      ? async () => {
          throw new Error('Revoked host')
        }
      : undefined,
  )
  const outcome = await service.execute(actor, command(payload)).then(
    () => null,
    (error: Error) => error.message,
  )
  expect(outcome).toContain(mode === 'denied' ? 'Revoked host' : 'construtor Python')
  expect(repo.commands).toEqual([])
})

test.each([
  'source',
  'binary',
  'configuration',
] as const)('tampered Python %s is rejected before authorization or enqueue', async (mode) => {
  const payload = await python(),
    repo = repository()
  let authorizations = 0
  if (mode === 'source')
    payload.base.files[
      payload.base.configuration.programmingLanguage === 'python'
        ? payload.base.configuration.python.entrypoint
        : 'main.py'
    ] = 'print(999)'
  else if (mode === 'binary')
    Object.values(payload.binaries)[0]!.base64 = Buffer.from('altered').toString('base64')
  else payload.base.configuration.runtime.manifestSha256 = 'f'.repeat(64)
  const service = new StudioBuilderService(
    repo.port,
    () => new Date(),
    true,
    false,
    async () => {
      authorizations++
      return { runtimeRelease }
    },
  )
  const outcome = await service.execute(actor, command(payload)).then(
    () => null,
    (error: { code?: string }) => error.code,
  )
  expect(outcome).toBe('VALIDATION_ERROR')
  expect(authorizations).toBe(0)
  expect(repo.commands).toEqual([])
})

test('JavaScript v1 remains admissible without a Python host authorizer', async () => {
  const repo = repository(),
    service = new StudioBuilderService(
      repo.port,
      () => new Date(),
      true,
      false,
      undefined,
      async () => {},
    )
  const base = await createStudioProRevision({
    projectId: 'legacy',
    templateId: 'vanilla-vite',
    devScript: 'dev',
    files: { 'index.html': '<main>Play</main>' },
    directories: [],
    assets: '[]',
    assetFiles: {},
  })
  await service.execute(actor, {
    operation: 'create',
    id: randomUUID(),
    objective: 'Melhore o jogo',
    model: 'test/model',
    parentOrigin: 'https://kids.test',
    base,
    binaries: {},
  })
  expect(repo.commands).toHaveLength(1)
  const admitted = repo.commands[0]
  if (admitted?.operation !== 'create') throw new Error('Missing create')
  expect(admitted.base).toEqual(base)
})
