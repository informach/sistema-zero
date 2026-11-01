import { expect, test } from 'bun:test'
import type { CourseTransferTask } from '@sistemazero/core/course/publication'
import { CourseTransferPendingError } from '@sistemazero/core/course/publication'
import { createCourseObjectCopier, type StoredCourseObject } from '../src/server/course-object-copy'
import { createCourseTransferService } from '../src/server/course-transfer'
import { handleCourseTransfer } from '../src/server/course-transfer-endpoint'

function fixture() {
  const objects = new Map<string, StoredCourseObject>([
    ['stage-private/manual.pdf', { etag: 'v1', bytes: 42, metadata: {} }],
  ])
  let copies = 0
  const storage = {
    head: async (bucket: string, key: string) => objects.get(`${bucket}/${key}`) ?? null,
    copy: async (input: Parameters<Parameters<typeof createCourseObjectCopier>[0]['copy']>[0]) => {
      copies++
      const original = objects.get(`${input.source.bucket}/${input.source.key}`)!
      if (original.etag !== input.source.etag) throw new Error('412')
      objects.set(`${input.destination.bucket}/${input.destination.key}`, {
        ...original,
        etag: 'dest-v1',
        metadata: { 'course-source': input.fingerprint },
      })
      return { etag: 'dest-v1' }
    },
  }
  const service = createCourseTransferService(
    {
      origin: {
        publicBaseUrl: 'https://stage.cdn.example',
        publicBucket: 'stage',
        privateBucket: 'stage-private',
      },
      destination: {
        publicBaseUrl: 'https://cdn.example',
        publicBucket: 'prod',
        privateBucket: 'prod-private',
      },
      sales: { staging: 'https://stage.funnel.example', production: 'https://funnel.example' },
      mediaProfileHash: 'a'.repeat(64),
    },
    {
      head: storage.head,
      copy: createCourseObjectCopier(storage),
      read: async () => new Uint8Array(),
      video: {
        copy: async () => {
          throw new Error('not called')
        },
        verify: async () => {
          throw new Error('not called')
        },
      },
    },
  )
  return { service, objects, copies: () => copies }
}
const task: CourseTransferTask = {
  kind: 'r2-copy',
  visibility: 'private',
  key: 'manual.pdf',
  destinationKind: 'file',
  sources: ['r2priv:manual.pdf'],
}
test('copia privado para privado e reutiliza a versão, sem URL pública', async () => {
  const { service, copies } = fixture()
  const result = await service.execute(task)
  expect(result.kind).toBe('r2-copy')
  expect(
    result.kind === 'r2-copy' && result.url.startsWith('r2priv:admin/course-publication/'),
  ).toBe(true)
  await service.verify(task, result)
  expect(await service.execute(task)).toEqual(result)
  expect(copies()).toBe(1)
})
test('recusa aliases de outra origem antes de escrever', async () => {
  const { service, copies } = fixture()
  await expect(
    service.execute({ ...task, sources: ['https://outro.example/manual.pdf'] }),
  ).rejects.toThrow()
  await expect(service.execute({ ...task, sources: ['r2priv:outro.pdf'] })).rejects.toThrow()
  expect(copies()).toBe(0)
})
test('a conferência final detecta a origem alterada e o destino adulterado', async () => {
  const { service, objects } = fixture()
  const result = await service.execute(task)
  objects.get('stage-private/manual.pdf')!.etag = 'v2'
  await expect(service.verify(task, result)).rejects.toThrow('Arquivo alterado')
  objects.get('stage-private/manual.pdf')!.etag = 'v1'
  if (result.kind !== 'r2-copy') throw new Error('fixture')
  await expect(
    service.verify(task, { ...result, url: 'https://outro.example/manual.pdf' }),
  ).rejects.toThrow('Destino')
  objects.get(`prod-private/${result.destinationKey}`)!.metadata = {}
  await expect(service.verify(task, result)).rejects.toThrow('Arquivo alterado')
})
test('transforma apenas a página Kids do funil configurado', () => {
  const { service } = fixture()
  expect(
    service.context('https://stage.funnel.example/kids/curso?origem=trilha').salesPageUrl,
  ).toBe('https://funnel.example/kids/curso?origem=trilha')
  expect(() => service.context('https://outro.example/kids/curso')).toThrow()
  expect(() => service.context('https://stage.funnel.example/pro/curso')).toThrow()
  expect(service.context().salesPageUrl).toBeUndefined()
  expect(service.context('https://funnel.example/kids/curso').salesPageUrl).toBe(
    'https://funnel.example/kids/curso',
  )
})
test('a porta privada recusa origem e perfil trocados antes de acessar o provedor', async () => {
  const { service, copies } = fixture()
  const token = 'production-transfer-qa-token-123456789'
  const deps = { token, environment: 'production', service }
  const request = (headers = {}, body: unknown = { action: 'execute', task }) =>
    new Request('http://local/transfer', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-course-publication-token': token,
        'x-course-environment': 'production',
        'x-course-transfer-profile': service.profileHash,
        ...headers,
      },
      body: JSON.stringify(body),
    })
  expect(
    (await handleCourseTransfer(request({ 'x-course-publication-token': 'wrong' }), deps)).status,
  ).toBe(401)
  expect(
    (await handleCourseTransfer(request({ 'x-course-environment': 'staging' }), deps)).status,
  ).toBe(401)
  expect(
    (await handleCourseTransfer(request({ 'x-course-transfer-profile': 'wrong' }), deps)).status,
  ).toBe(409)
  expect(copies()).toBe(0)
  const copied = await handleCourseTransfer(request(), deps)
  expect(copied.status).toBe(200)
  const result = ((await copied.json()) as { result: unknown }).result
  expect(
    (await handleCourseTransfer(request({}, { action: 'verify', task, result }), deps)).status,
  ).toBe(200)
  expect(
    (
      await handleCourseTransfer(request(), {
        ...deps,
        service: {
          ...service,
          execute: async () => {
            throw new CourseTransferPendingError('pending')
          },
        },
      })
    ).status,
  ).toBe(202)
  expect((await handleCourseTransfer(request(), { ...deps, environment: 'staging' })).status).toBe(
    503,
  )
})
