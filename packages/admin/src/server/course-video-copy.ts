import { createHash } from 'node:crypto'
import {
  CourseTransferPendingError,
  type CourseTransferResult,
  CourseTransferResultSchema,
} from '@sistemazero/core/course/publication'
import { z } from 'zod'

export interface CourseVideoSnapshot {
  id: string
  name: string
  modifiedAt: string
  available: boolean
  /** Duration, dimensions, file sizes/formats and text-track hashes, never expiring URLs. */
  contentHash: string
}
export interface CourseVideoCopyProvider {
  inspect(id: string): Promise<CourseVideoSnapshot>
  copy(sourceId: string, marker: string): Promise<string>
  find(marker: string): Promise<string[]>
  configure(id: string): Promise<void>
  verifyConfiguration(id: string): Promise<void>
  embedUrl(id: string): Promise<string>
}
export interface CourseVideoCopyJournal {
  read(key: string): Promise<unknown | null>
  reserve(key: string, value: unknown): Promise<boolean>
  save(key: string, value: unknown): Promise<void>
}
const receipt = z.strictObject({
  version: z.literal(1),
  sourceId: z.string().regex(/^\d+$/),
  sourceVersion: z.string().regex(/^[a-f0-9]{64}$/),
  profileHash: z.string().regex(/^[a-f0-9]{64}$/),
  marker: z.string().max(128),
  videoId: z.string().regex(/^\d+$/).nullable(),
  result: CourseTransferResultSchema.nullable(),
})
const sha = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')

/** Append-only phase records: delayed replicas cannot overwrite completed copies. */
export function createCourseVideoCopyJournal(storage: {
  read(key: string): Promise<unknown | null>
  create(key: string, value: unknown): Promise<boolean>
}): CourseVideoCopyJournal {
  const putOnce = async (key: string, value: z.infer<typeof receipt>) => {
    let created: boolean
    try {
      created = await storage.create(key, value)
    } catch (error) {
      const recovered = await storage.read(key)
      if (recovered === null) throw error
      if (JSON.stringify(receipt.parse(recovered)) !== JSON.stringify(value))
        throw new Error('Registro Vimeo concorrente com outro resultado')
      return
    }
    if (!created) {
      const current = receipt.parse(await storage.read(key))
      if (JSON.stringify(current) !== JSON.stringify(value))
        throw new Error('Registro Vimeo concorrente com outro resultado')
    }
  }
  return {
    async read(key) {
      for (const suffix of ['.complete', '.video', '']) {
        const current = await storage.read(key + suffix)
        if (current !== null) {
          const parsed = receipt.parse(current)
          if (
            (suffix === '.complete' && !parsed.result) ||
            (suffix === '.video' && !parsed.videoId)
          )
            throw new Error('Fase Vimeo incompleta')
          return parsed
        }
      }
      return null
    },
    reserve: (key, value) => storage.create(key, receipt.parse(value)),
    async save(key, value) {
      const next = receipt.parse(value)
      const original = receipt.parse(await storage.read(key))
      if (
        !next.videoId ||
        original.sourceId !== next.sourceId ||
        original.sourceVersion !== next.sourceVersion ||
        original.profileHash !== next.profileHash ||
        original.marker !== next.marker
      )
        throw new Error('Registro Vimeo sem a reserva correspondente')
      await putOnce(`${key}.video`, { ...next, result: null })
      if (next.result) await putOnce(`${key}.complete`, next)
    },
  }
}
export function courseVideoSourceVersion(source: CourseVideoSnapshot) {
  return sha([source.id, source.name, source.modifiedAt, source.contentHash])
}

/** Reserve before the non-idempotent native copy. A lost acknowledgement is reconciled, never repeated. */
export function createCourseVideoCopier(
  provider: CourseVideoCopyProvider,
  journal: CourseVideoCopyJournal,
) {
  const checkSource = async (sourceId: string, expected: string) => {
    const source = await provider.inspect(sourceId)
    if (!source.available || courseVideoSourceVersion(source) !== expected)
      throw new Error('O vídeo de staging mudou desde a cópia')
    return source
  }
  const verify = async (result: Extract<CourseTransferResult, { kind: 'vimeo-copy' }>) => {
    const source = await checkSource(result.sourceVideoId, result.sourceVersion)
    const destination = await provider.inspect(result.videoId)
    if (
      !destination.available ||
      source.contentHash !== destination.contentHash ||
      result.destinationVersion !== sha([destination.id, destination.contentHash])
    )
      throw new Error('Vídeo copiado incompleto ou alterado')
    await provider.verifyConfiguration(result.videoId)
    if ((await provider.embedUrl(result.videoId)) !== result.embedUrl)
      throw new Error('O endereço do vídeo copiado mudou')
  }
  return {
    verify: async (
      result: Extract<CourseTransferResult, { kind: 'vimeo-copy' }>,
      profileHash: string,
    ) => {
      const fingerprint = sha([
        'course-video-copy-v1',
        result.sourceVideoId,
        result.sourceVersion,
        profileHash,
      ])
      const saved = receipt.parse(
        await journal.read(`admin/course-publication/videos/${fingerprint}.json`),
      )
      if (
        saved.profileHash !== profileHash ||
        JSON.stringify(saved.result) !== JSON.stringify(CourseTransferResultSchema.parse(result))
      )
        throw new Error('O vídeo não pertence ao perfil da preparação')
      await verify(result)
    },
    async copy(
      sourceId: string,
      profileHash: string,
    ): Promise<Extract<CourseTransferResult, { kind: 'vimeo-copy' }>> {
      const source = await provider.inspect(sourceId)
      if (!source.available) throw new Error('O vídeo de staging ainda não está pronto')
      const sourceVersion = courseVideoSourceVersion(source)
      const fingerprint = sha(['course-video-copy-v1', sourceId, sourceVersion, profileHash])
      const key = `admin/course-publication/videos/${fingerprint}.json`
      const marker = `SZ-${fingerprint}`
      let record = receipt.parse(
        (await journal.read(key)) ?? {
          version: 1,
          sourceId,
          sourceVersion,
          profileHash,
          marker,
          videoId: null,
          result: null,
        },
      )
      if (
        record.sourceId !== sourceId ||
        record.sourceVersion !== sourceVersion ||
        record.profileHash !== profileHash ||
        record.marker !== marker
      )
        throw new Error('Registro de vídeo pertence a outra preparação')
      if (record.result) {
        if (
          record.result.kind !== 'vimeo-copy' ||
          record.result.sourceVideoId !== sourceId ||
          record.result.sourceVersion !== sourceVersion ||
          record.result.videoId !== record.videoId
        )
          throw new Error('Recibo de outro vídeo')
        await verify(record.result)
        return record.result
      }
      if (!record.videoId) {
        // An existing reservation may be from a crashed process. Only its original owner may POST.
        let owner = false
        try {
          owner = await journal.reserve(key, record)
        } catch (error) {
          if (!(await journal.read(key))) throw error
        }
        if (owner) {
          try {
            record.videoId = await provider.copy(sourceId, marker)
          } catch {
            // Reconciliation below covers both a failed call and a response lost after success.
          }
        }
        if (!record.videoId) {
          const matches = await provider.find(marker)
          if (matches.length > 1) throw new Error('Mais de uma cópia Vimeo usa o mesmo registro')
          record.videoId = matches[0] ?? null
        }
        if (!record.videoId)
          throw new CourseTransferPendingError('Aguardando confirmação da cópia Vimeo')
        if (record.videoId === sourceId) throw new Error('A cópia Vimeo não pode ser a origem')
        await journal.save(key, record)
      }
      const destination = await provider.inspect(record.videoId)
      if (!destination.available)
        throw new CourseTransferPendingError('Aguardando processamento do Vimeo')
      if (destination.contentHash !== source.contentHash)
        throw new Error('A cópia Vimeo não preservou os vídeos e as transcrições')
      await checkSource(sourceId, sourceVersion)
      await provider.configure(destination.id)
      const result = {
        kind: 'vimeo-copy' as const,
        sourceVideoId: sourceId,
        sourceVersion,
        videoId: destination.id,
        destinationVersion: sha([destination.id, destination.contentHash]),
        embedUrl: await provider.embedUrl(destination.id),
      }
      await verify(result)
      record = { ...record, result }
      await journal.save(key, record)
      return result
    },
  }
}
