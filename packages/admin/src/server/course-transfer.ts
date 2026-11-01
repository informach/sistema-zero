import { createHash } from 'node:crypto'
import type {
  CourseTransferContext,
  CourseTransferResult,
  CourseTransferTask,
} from '@sistemazero/core/course/publication'
import { inventoryCourseMedia } from '@sistemazero/core/course/publication-media'
import { readWebAnimation } from '@sistemazero/edisvg/data'
import {
  type CourseObjectCopyInput,
  courseObjectDestination,
  type StoredCourseObject,
} from './course-object-copy'

export interface CourseTransferConfiguration {
  origin: CourseTransferContext['origin']
  destination: { publicBaseUrl: string; publicBucket: string; privateBucket: string }
  sales: { staging: string; production: string }
  mediaProfileHash: string
}
export interface CourseTransferProviders {
  head(bucket: string, key: string): Promise<StoredCourseObject | null>
  read(bucket: string, key: string, etag: string, maxBytes: number): Promise<Uint8Array>
  copy(input: CourseObjectCopyInput): Promise<{ key: string; etag: string; bytes: number }>
  video: {
    copy(
      videoId: string,
      profileHash: string,
    ): Promise<Extract<CourseTransferResult, { kind: 'vimeo-copy' }>>
    verify(
      result: Extract<CourseTransferResult, { kind: 'vimeo-copy' }>,
      profileHash: string,
    ): Promise<void>
  }
}
const sha = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex')
const publicBase = (value: string) => {
  const url = new URL(value)
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash)
    throw new Error('Origem pública inválida')
  return url.href.replace(/\/+$/, '')
}

/** Bucket selection and target URLs come exclusively from the production deployment configuration. */
export function createCourseTransferService(
  config: CourseTransferConfiguration,
  providers: CourseTransferProviders,
) {
  const profileHash = sha(JSON.stringify(['course-transfer-v1', config]))
  const sourceBase = publicBase(config.origin.publicBaseUrl)
  const targetBase = publicBase(config.destination.publicBaseUrl)
  if (
    sourceBase === targetBase ||
    config.origin.publicBucket === config.destination.publicBucket ||
    config.origin.privateBucket === config.destination.privateBucket
  )
    throw new Error('Staging e produção precisam de espaços de mídia distintos')
  const context = (salesPageUrl?: string): CourseTransferContext => {
    let target: string | undefined
    if (salesPageUrl) {
      const source = new URL(salesPageUrl)
      const expected = new URL(config.sales.staging)
      const destination = new URL(publicBase(config.sales.production))
      if (
        ![expected.origin, destination.origin].includes(source.origin) ||
        !source.pathname.startsWith('/kids/') ||
        source.username ||
        source.password
      )
        throw new Error('Página Kids fora do funil de staging')
      target = new URL(
        source.pathname + source.search + source.hash,
        publicBase(config.sales.production),
      ).href
    }
    return {
      version: 1,
      profileHash,
      origin: config.origin,
      ...(target ? { salesPageUrl: target } : {}),
    }
  }
  const assertTask = (task: CourseTransferTask) => {
    if (
      task.kind === 'r2-copy' &&
      (!task.sources.length || (task.visibility === 'private' && task.destinationKind !== 'file'))
    )
      throw new Error('Referências do arquivo ausentes ou papel privado inválido')
    for (const source of task.sources) {
      const resources = inventoryCourseMedia(source, config.origin)
      if (resources.length !== 1 || resources[0]!.source !== source)
        throw new Error('Referência de origem não canônica')
      const entry = resources[0]!
      if (
        task.kind === 'vimeo-copy'
          ? entry.kind !== 'vimeo' || entry.videoId !== task.videoId
          : entry.kind !== `r2-${task.visibility}` || entry.key !== task.key
      )
        throw new Error('A referência pertence a outro recurso')
    }
  }
  const objectInput = (
    task: Extract<CourseTransferTask, { kind: 'r2-copy' }>,
    etag: string,
    bytes: number,
  ): CourseObjectCopyInput => ({
    source: {
      bucket:
        task.visibility === 'public' ? config.origin.publicBucket : config.origin.privateBucket,
      key: task.key,
      etag,
      bytes,
    },
    destination: {
      bucket:
        task.visibility === 'public'
          ? config.destination.publicBucket
          : config.destination.privateBucket,
      kind: task.destinationKind,
    },
  })
  const objectUrl = (task: Extract<CourseTransferTask, { kind: 'r2-copy' }>, key: string) =>
    task.visibility === 'private'
      ? `r2priv:${key}`
      : `${targetBase}/${key.split('/').map(encodeURIComponent).join('/')}`
  const inspectArt = async (
    task: Extract<CourseTransferTask, { kind: 'r2-copy' }>,
    bucket: string,
    key: string,
    etag: string,
  ) => {
    if (!task.sha256 && task.destinationKind === 'file') return
    const bytes = await providers.read(
      bucket,
      key,
      etag,
      task.destinationKind === 'module-animation' ? 10_000_000 : 5_000_000,
    )
    if (task.sha256 && sha(bytes) !== task.sha256)
      throw new Error('A arte não confere com o hash publicado')
    if (task.destinationKind === 'module-animation')
      readWebAnimation(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
  }
  return {
    context,
    profileHash,
    async execute(task: CourseTransferTask): Promise<CourseTransferResult> {
      assertTask(task)
      if (task.kind === 'vimeo-copy') return providers.video.copy(task.videoId, profileHash)
      const bucket =
        task.visibility === 'public' ? config.origin.publicBucket : config.origin.privateBucket
      const original = await providers.head(bucket, task.key)
      if (!original) throw new Error('Arquivo de origem não encontrado')
      await inspectArt(task, bucket, task.key, original.etag)
      const saved = await providers.copy(objectInput(task, original.etag, original.bytes))
      return {
        kind: 'r2-copy',
        visibility: task.visibility,
        sourceKey: task.key,
        sourceEtag: original.etag,
        bytes: saved.bytes,
        destinationKey: saved.key,
        destinationEtag: saved.etag,
        url: objectUrl(task, saved.key),
      }
    },
    async verify(task: CourseTransferTask, result: CourseTransferResult): Promise<void> {
      assertTask(task)
      if (task.kind === 'vimeo-copy' && result.kind === 'vimeo-copy') {
        if (task.videoId !== result.sourceVideoId) throw new Error('Vídeo de outra origem')
        return providers.video.verify(result, profileHash)
      }
      if (
        task.kind !== 'r2-copy' ||
        result.kind !== 'r2-copy' ||
        task.key !== result.sourceKey ||
        task.visibility !== result.visibility
      )
        throw new Error('Resultado de outro arquivo')
      const input = objectInput(task, result.sourceEtag, result.bytes)
      const expected = courseObjectDestination(input)
      if (expected.key !== result.destinationKey || objectUrl(task, expected.key) !== result.url)
        throw new Error('Destino do arquivo não confere')
      const [original, saved] = await Promise.all([
        providers.head(input.source.bucket, input.source.key),
        providers.head(expected.bucket, expected.key),
      ])
      if (
        !original ||
        original.etag !== result.sourceEtag ||
        original.bytes !== result.bytes ||
        !saved ||
        saved.etag !== result.destinationEtag ||
        saved.bytes !== result.bytes ||
        saved.metadata['course-source'] !== expected.fingerprint
      )
        throw new Error('Arquivo alterado ou cópia incompleta')
      await inspectArt(task, expected.bucket, expected.key, saved.etag)
    },
  }
}
