import { expect, test } from 'bun:test'
import {
  type CourseObjectCopyInput,
  type CourseObjectStorage,
  courseObjectDestination,
  createCourseObjectCopier,
  type StoredCourseObject,
} from '../src/server/course-object-copy'

function fixture(mode: 'ok' | 'lost-ack' | 'wrong-version' | 'corrupt' = 'ok') {
  const objects = new Map<string, StoredCourseObject>([
    [
      'stage/source.pdf',
      {
        etag: '"source-v1"',
        bytes: 42,
        metadata: { original: 'preserved' },
        contentType: 'application/pdf',
      },
    ],
  ])
  let copies = 0
  const storage: CourseObjectStorage = {
    head: async (bucket, key) => objects.get(`${bucket}/${key}`) ?? null,
    async copy(input) {
      copies++
      const current = objects.get(`${input.source.bucket}/${input.source.key}`)!
      if (mode === 'wrong-version' || current.etag !== input.source.etag)
        throw new Error('412 source changed')
      objects.set(`${input.destination.bucket}/${input.destination.key}`, {
        ...current,
        bytes: mode === 'corrupt' ? 41 : current.bytes,
        etag: '"copy-v1"',
        metadata: { ...current.metadata, 'course-source': input.fingerprint },
      })
      if (mode === 'lost-ack') throw new Error('connection reset after copy')
      return { etag: '"copy-v1"' }
    },
  }
  const input: CourseObjectCopyInput = {
    source: { bucket: 'stage', key: 'source.pdf', etag: '"source-v1"', bytes: 42 },
    destination: { bucket: 'production', kind: 'file' },
  }
  return {
    objects,
    copy: createCourseObjectCopier(storage),
    count: () => copies,
    input,
    key: `production/${courseObjectDestination(input).key}`,
  }
}
test('copia a versão preparada e reaproveita a confirmação mesmo se a origem já mudou', async () => {
  const f = fixture()
  expect(await f.copy(f.input)).toMatchObject({ bytes: 42, reused: false })
  f.objects.delete('stage/source.pdf')
  expect(await f.copy(f.input)).toMatchObject({ bytes: 42, reused: true })
  expect(f.count()).toBe(1)
})
test('recupera resposta perdida sem criar outro arquivo', async () => {
  const f = fixture('lost-ack')
  expect(await f.copy(f.input)).toMatchObject({ reused: true })
  expect(await f.copy(f.input)).toMatchObject({ reused: true })
  expect(f.count()).toBe(1)
})
test('não sobrescreve arquivo alheio nem copia uma origem diferente', async () => {
  const f = fixture()
  f.objects.set(f.key, { etag: 'other', bytes: 42, metadata: {} })
  await expect(f.copy(f.input)).rejects.toThrow('outra versão')
  expect(f.count()).toBe(0)
  f.objects.delete(f.key)
  await expect(f.copy({ ...f.input, source: { ...f.input.source, etag: 'old' } })).rejects.toThrow(
    'origem mudou',
  )
  expect(f.count()).toBe(0)
})
test('a mudança entre HEAD e CopyObject e a divergência de tamanho não viram sucesso', async () => {
  const changed = fixture('wrong-version')
  await expect(changed.copy(changed.input)).rejects.toThrow('412')
  expect(changed.objects.has(changed.key)).toBe(false)
  const corrupt = fixture('corrupt')
  await expect(corrupt.copy(corrupt.input)).rejects.toThrow('cópia íntegra')
})
test('versões diferentes usam destinos distintos e a animação mantém os caminhos do exportador', () => {
  const f = fixture()
  const other = courseObjectDestination({ ...f.input, source: { ...f.input.source, etag: '"v2"' } })
  expect(other.key).not.toBe(courseObjectDestination(f.input).key)
  expect(
    courseObjectDestination({
      ...f.input,
      destination: { bucket: 'production', kind: 'module-animation' },
    }).key,
  ).toMatch(/^admin\/module-animation\/[a-f0-9-]{36}\/animation\.edi-animation\.json$/)
})
