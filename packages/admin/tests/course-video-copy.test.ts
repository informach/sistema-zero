import { expect, test } from 'bun:test'
import { CourseTransferPendingError } from '@sistemazero/core/course/publication'
import {
  type CourseVideoSnapshot,
  createCourseVideoCopier,
  createCourseVideoCopyJournal,
} from '../src/server/course-video-copy'

function fixture(mode: 'normal' | 'lost-copy' | 'not-ready' | 'lost-reserve' = 'normal') {
  let copies = 0
  let configured = false
  let sourceVersion = 'v1'
  let destinationReady = mode !== 'not-ready'
  const names = new Map<string, string>()
  const journal = new Map<string, unknown>()
  const snapshot = (id: string): CourseVideoSnapshot => ({
    id,
    name: id === '10' ? 'aula' : (names.get(id) ?? ''),
    modifiedAt: id === '10' ? sourceVersion : 'destination',
    available: id === '10' || destinationReady,
    contentHash: 'same-files-and-transcripts',
  })
  const copier = createCourseVideoCopier(
    {
      inspect: async (id) => snapshot(id),
      async copy(_id, marker) {
        copies++
        names.set('20', marker)
        if (mode === 'lost-copy') throw new Error('lost response')
        return '20'
      },
      find: async (marker) => [...names].filter(([, name]) => name === marker).map(([id]) => id),
      configure: async () => {
        configured = true
      },
      verifyConfiguration: async () => {
        if (!configured) throw new Error('privacy')
      },
      embedUrl: async (id) => `https://player.vimeo.com/video/${id}?h=copied`,
    },
    createCourseVideoCopyJournal({
      read: async (key) => structuredClone(journal.get(key) ?? null),
      async create(key, value) {
        if (journal.has(key)) return false
        journal.set(key, structuredClone(value))
        if (mode === 'lost-reserve') throw new Error('lost reservation response')
        return true
      },
    }),
  )
  return {
    copier,
    copies: () => copies,
    journal,
    sourceChanged: () => {
      sourceVersion = 'v2'
    },
    ready: () => {
      destinationReady = true
    },
  }
}
const profile = 'a'.repeat(64)
test('cópia nativa preserva recursos e só configura o novo vídeo', async () => {
  const { copier, copies } = fixture()
  const result = await copier.copy('10', profile)
  expect(result.videoId).toBe('20')
  expect(result.embedUrl).toContain('/20?')
  expect(await copier.copy('10', profile)).toEqual(result)
  await copier.verify(result, profile)
  await expect(copier.verify(result, 'b'.repeat(64))).rejects.toThrow()
  expect(copies()).toBe(1)
})
test('uma resposta de cópia perdida é reconciliada sem outro POST', async () => {
  const { copier, copies } = fixture('lost-copy')
  const result = await copier.copy('10', profile)
  expect(result.videoId).toBe('20')
  expect(copies()).toBe(1)
})
test('reinício durante transcode usa o id durável e não cria outro vídeo', async () => {
  const { copier, copies, ready } = fixture('not-ready')
  await expect(copier.copy('10', profile)).rejects.toBeInstanceOf(CourseTransferPendingError)
  expect(copies()).toBe(1)
  ready()
  expect((await copier.copy('10', profile)).videoId).toBe('20')
  expect(copies()).toBe(1)
})
test('reserva sem confirmação não autoriza repetir a operação não idempotente', async () => {
  const { copier, copies } = fixture('lost-reserve')
  await expect(copier.copy('10', profile)).rejects.toBeInstanceOf(CourseTransferPendingError)
  await expect(copier.copy('10', profile)).rejects.toBeInstanceOf(CourseTransferPendingError)
  expect(copies()).toBe(0)
})
test('a conferência final rejeita mudança no vídeo original', async () => {
  const { copier, sourceChanged } = fixture()
  const result = await copier.copy('10', profile)
  sourceChanged()
  await expect(copier.verify(result, profile)).rejects.toThrow('staging mudou')
})
test('um processo atrasado não apaga o recibo concluído por outra réplica', async () => {
  const saved = {
    version: 1,
    sourceId: '10',
    sourceVersion: 'a'.repeat(64),
    profileHash: profile,
    marker: 'qa-marker',
    videoId: '20',
    result: {
      kind: 'vimeo-copy',
      sourceVideoId: '10',
      sourceVersion: 'a'.repeat(64),
      videoId: '20',
      destinationVersion: 'b'.repeat(64),
      embedUrl: 'https://player.vimeo.com/video/20',
    },
  }
  const entries = new Map<string, unknown>()
  const journal = createCourseVideoCopyJournal({
    read: async (key) => entries.get(key) ?? null,
    create: async (key, value) => {
      if (entries.has(key)) return false
      entries.set(key, structuredClone(value))
      return true
    },
  })
  await journal.reserve('video', { ...saved, videoId: null, result: null })
  await journal.save('video', saved)
  await journal.save('video', { ...saved, result: null })
  expect(await journal.read('video')).toEqual(saved)
  await expect(journal.save('video', { ...saved, videoId: '30' })).rejects.toThrow('concorrente')
})
