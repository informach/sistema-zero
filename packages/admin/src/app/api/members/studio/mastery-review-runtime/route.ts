import {
  InvalidJsonBodyError,
  RequestBodyTooLargeError,
  readJsonBodyWithLimit,
} from '@sistemazero/core/http'
import type { CreatorMasteryReviewDetail } from '@sistemazero/core/journey'
import { type GalleryStudioSource, isGallerySubmission } from '@sistemazero/core/learning'
import { StudioMasteryReviewRuntimeRequestSchema } from '@sistemazero/core/studio/runtime-authorization'
import { forwardUpstream } from '@/server/forward'
import { gatewayFetch } from '@/server/gateway'
import { masteryGalleryItem } from '@/server/mastery-gallery-snapshot'
import { r2PresignGetUgc } from '@/server/r2'

const reject = (status: number) =>
  Response.json(
    {
      error: {
        code: status === 413 ? 'PAYLOAD_TOO_LARGE' : 'INVALID_INPUT',
        message: 'Pedido de revisão inválido.',
      },
    },
    { status, headers: { 'cache-control': 'private, no-store' } },
  )
export async function POST(request: Request) {
  if (
    request.headers.has('content-encoding') ||
    !/^application\/json(?:;|$)/i.test(request.headers.get('content-type') ?? '')
  )
    return reject(400)
  let raw: unknown
  try {
    raw = await readJsonBodyWithLimit(request, 4096)
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return reject(413)
    if (error instanceof InvalidJsonBodyError) return reject(400)
    throw error
  }
  const parsed = StudioMasteryReviewRuntimeRequestSchema.safeParse(raw)
  if (!parsed.success) return reject(400)
  const detail = await gatewayFetch<CreatorMasteryReviewDetail>(
    `/members/admin/journey/masteries/submissions/${parsed.data.context.submissionId}`,
    { signal: request.signal },
  )
  if (detail.status !== 200) {
    const response = forwardUpstream(detail)
    response.headers.set('cache-control', 'private, no-store')
    return response
  }
  const payload = detail.body.evidence.payload
  const project =
    payload && typeof payload === 'object' && 'project' in payload ? payload.project : null
  let gallerySource: GalleryStudioSource | undefined
  if (isGallerySubmission(project)) {
    if (project.tool !== 'studio' || project.items.length !== 1) return reject(400)
    const selected = masteryGalleryItem(detail.body, project.items[0]!.itemId)
    if (!selected) return reject(400)
    const item = selected.item
    try {
      request.signal.throwIfAborted()
      gallerySource = {
        format: 'sz-studio-gallery-source' as const,
        version: 1 as const,
        itemId: item.itemId,
        revision: item.revision,
        source: {
          storageKey: item.storageKey,
          url: await r2PresignGetUgc(item.storageKey, { expiresInSeconds: 120 }),
        },
        parts: await Promise.all(
          item.parts.map(async (part) => ({
            ...part,
            url: await r2PresignGetUgc(part.storageKey, { expiresInSeconds: 120 }),
          })),
        ),
      }
      request.signal.throwIfAborted()
    } catch (error) {
      if (request.signal.aborted) throw error
      return Response.json(
        {
          error: {
            code: 'SOURCE_UNAVAILABLE',
            message: 'Não foi possível abrir a cópia preservada.',
          },
        },
        { status: 503, headers: { 'cache-control': 'private, no-store' } },
      )
    }
  }
  const response = forwardUpstream(
    await gatewayFetch('/members/admin/studio/mastery-review-runtime', {
      method: 'POST',
      body: { ...parsed.data, ...(gallerySource ? { gallerySource } : {}) },
      signal: request.signal,
    }),
  )
  response.headers.set('cache-control', 'private, no-store')
  return response
}
