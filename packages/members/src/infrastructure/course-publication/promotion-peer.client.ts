import {
  type CoursePublicationJobView,
  CoursePublicationJobViewSchema,
} from '@sistemazero/core/course/publication'
import { ValidationError } from '@sistemazero/core/errors'
import { readJsonBodyWithLimit } from '@sistemazero/core/http'
import { z } from 'zod'
import { ContentNotFoundError } from '../../domain/course/course.errors'
import type { CourseSnapshot } from '../../domain/course-publication/course-sync'
import { CoursePublicationConflictError } from '../../domain/course-publication/jobs'
import {
  CoursePromotionBindingSchema,
  type CoursePromotionPeerPort,
  type CoursePromotionSourcePort,
} from '../../domain/course-publication/peer'
import { DomainError } from '../../domain/shared/errors'
import type { PublicationHttpFetch } from './http-fetch'

export class CoursePromotionPeerUnavailableError extends DomainError {
  readonly code = 'COURSE_PUBLICATION_PEER_UNAVAILABLE'
}
function connection(
  config: {
    url: string
    token: string
    environment: 'staging' | 'production'
    header: 'x-course-promotion-token' | 'x-course-source-token'
  },
  fetcher: PublicationHttpFetch,
) {
  const base = new URL(config.url)
  if (
    !['http:', 'https:'].includes(base.protocol) ||
    base.username ||
    base.password ||
    base.search ||
    base.hash ||
    config.token.length < 32
  )
    throw new Error('Configuração da publicação entre ambientes inválida')
  return async (path: string, body?: unknown, signal?: AbortSignal) => {
    let response: Response
    try {
      response = await fetcher(new URL(path, base), {
        method: body === undefined ? 'GET' : 'POST',
        redirect: 'error',
        signal: AbortSignal.any([AbortSignal.timeout(60_000), ...(signal ? [signal] : [])]),
        headers: { 'content-type': 'application/json', [config.header]: config.token },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      })
    } catch {
      throw new CoursePromotionPeerUnavailableError(
        'O serviço de publicação do outro ambiente está indisponível',
      )
    }
    if (response.status === 404)
      throw new ContentNotFoundError('Trabalho de publicação não encontrado no destino')
    if (response.status === 409)
      throw new CoursePublicationConflictError(
        'O curso ou o trabalho mudou. Confira o destino novamente',
      )
    if (response.status === 400 || response.status === 422)
      throw new ValidationError(
        'Não foi possível preparar o curso. Confira o conteúdo publicado e o destino',
      )
    if (!response.ok)
      throw new CoursePromotionPeerUnavailableError(
        'O serviço de publicação do outro ambiente não concluiu o pedido',
      )
    const envelope = z
      .strictObject({ environment: z.literal(config.environment), result: z.unknown() })
      .parse(await readJsonBodyWithLimit(response, 64_000_000, signal))
    return envelope.result
  }
}
const id = (value: string) => z.uuid().parse(value)
function promotionView(value: unknown): CoursePublicationJobView {
  const view = CoursePublicationJobViewSchema.parse(value)
  if (
    view.operation !== 'promote-kids' ||
    view.preview.source.environment !== 'staging' ||
    view.preview.target.environment !== 'production' ||
    view.preview.target.audience !== 'kids'
  )
    throw new CoursePublicationConflictError('O trabalho recebido não é uma promoção do Kids')
  return view
}
export function createCoursePromotionPeerClient(
  config: { url: string; token: string; throughAdmin?: boolean },
  fetcher: PublicationHttpFetch = fetch,
): CoursePromotionPeerPort {
  const call = connection(
    { ...config, environment: 'production', header: 'x-course-promotion-token' },
    fetcher,
  )
  const root = config.throughAdmin
    ? '/api/internal/course-publication/peer'
    : '/members/internal/course-promotions'
  return {
    available: async () =>
      z.strictObject({ available: z.boolean() }).parse(await call(`${root}/capabilities`))
        .available,
    prepare: async (input) =>
      promotionView(await call(`${root}/preview`, { version: 1, ...input })),
    view: async (jobId) => promotionView(await call(`${root}/jobs/${id(jobId)}`)),
    binding: async (jobId) =>
      CoursePromotionBindingSchema.parse(await call(`${root}/bindings/${id(jobId)}`)),
    command: async (jobId, command, version, planHash) =>
      promotionView(await call(`${root}/jobs/${id(jobId)}/${command}`, { version, planHash })),
    latest: async (sourceCourseId) => {
      const result = z
        .strictObject({ jobs: z.array(CoursePublicationJobViewSchema).max(20) })
        .parse(await call(`${root}/jobs?sourceCourseId=${id(sourceCourseId)}`))
      const jobs = result.jobs.map(promotionView)
      if (jobs.some((job) => job.preview.source.id !== sourceCourseId))
        throw new CoursePublicationConflictError('O histórico recebido pertence a outro curso')
      return jobs
    },
  }
}
export function createCoursePromotionSourceClient(
  config: {
    url: string
    token: string
    throughAdmin?: boolean
    decodeSource(value: unknown): CourseSnapshot
  },
  fetcher: PublicationHttpFetch = fetch,
): CoursePromotionSourcePort {
  const call = connection(
    { ...config, environment: 'staging', header: 'x-course-source-token' },
    fetcher,
  )
  return {
    read: async (jobId, signal) => {
      const result = z
        .strictObject({
          version: z.literal(1),
          sourceHash: z.string().regex(/^[a-f0-9]{64}$/),
          source: z.unknown(),
        })
        .parse(
          await call(
            `${config.throughAdmin ? '/api/internal/course-publication/source' : '/members/internal/course-promotion-sources'}/${id(jobId)}`,
            undefined,
            signal,
          ),
        )
      return { sourceHash: result.sourceHash, source: config.decodeSource(result.source) }
    },
  }
}
