import {
  CourseTransferContextSchema,
  CourseTransferPendingError,
  CourseTransferResultSchema,
} from '@sistemazero/core/course/publication'
import { readJsonBodyWithLimit } from '@sistemazero/core/http'
import { z } from 'zod'
import type { CoursePublicationTransferPort } from '../../domain/ports/course-publication.port'
import type { PublicationHttpFetch } from './http-fetch'

export function createAdminCourseTransferClient(
  config: { url: string; token: string },
  fetcher: PublicationHttpFetch = fetch,
): CoursePublicationTransferPort {
  const base = new URL(config.url)
  if (
    !['http:', 'https:'].includes(base.protocol) ||
    base.username ||
    base.password ||
    base.search ||
    base.hash ||
    config.token.length < 32
  )
    throw new Error('Configuração da transferência inválida')
  const url = new URL('/api/internal/course-publication/transfer', base)
  const call = async (body: unknown, signal: AbortSignal, profileHash?: string) => {
    const response = await fetcher(url, {
      method: 'POST',
      redirect: 'error',
      signal: AbortSignal.any([signal, AbortSignal.timeout(80_000)]),
      headers: {
        'content-type': 'application/json',
        'x-course-environment': 'production',
        'x-course-publication-token': config.token,
        ...(profileHash ? { 'x-course-transfer-profile': profileHash } : {}),
      },
      body: JSON.stringify(body),
    })
    if (response.status === 202) {
      z.strictObject({ environment: z.literal('production'), pending: z.literal(true) }).parse(
        await readJsonBodyWithLimit(response, 1024, signal),
      )
      throw new CourseTransferPendingError('A transferência aguarda o provedor')
    }
    if (!response.ok) throw new Error('A transferência de mídia não foi confirmada')
    return z
      .strictObject({ environment: z.literal('production'), result: z.unknown() })
      .parse(await readJsonBodyWithLimit(response, 2 * 1024 * 1024, signal)).result
  }
  return {
    context: async (salesPageUrl, signal) =>
      CourseTransferContextSchema.parse(
        await call({ action: 'context', ...(salesPageUrl ? { salesPageUrl } : {}) }, signal),
      ),
    execute: async (task, context, signal) =>
      CourseTransferResultSchema.parse(
        await call({ action: 'execute', task }, signal, context.profileHash),
      ),
    verify: async (task, result, context, signal) => {
      z.strictObject({ verified: z.literal(true) }).parse(
        await call({ action: 'verify', task, result }, signal, context.profileHash),
      )
    },
  }
}
