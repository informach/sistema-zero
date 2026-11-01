import { RequestBodyTooLargeError, readJsonBodyWithLimit } from '@sistemazero/core/http'
import { safeEqual } from '@sistemazero/core/security'
import { z } from 'zod'

export interface CoursePublicationRelayConfiguration {
  membersUrl?: string
  environment?: string
  peerToken?: string
  sourceToken?: string
}
const id = (value: string | undefined) => z.uuid().safeParse(value).success
const reply = (status: number, value: unknown) =>
  Response.json(value, { status, headers: { 'cache-control': 'private, no-store' } })
/** Exposes only the two course capabilities through the existing public Admin, never the Members API. */
export async function relayCoursePublication(
  request: Request,
  kind: 'peer' | 'source',
  path: string[],
  config: CoursePublicationRelayConfiguration,
  fetcher: (input: string | URL | Request, init?: RequestInit) => Promise<Response> = (
    input,
    init,
  ) => fetch(input, init),
) {
  const token = kind === 'peer' ? config.peerToken : config.sourceToken
  if (
    !config.membersUrl ||
    !token ||
    token.length < 32 ||
    config.environment !== (kind === 'peer' ? 'production' : 'staging')
  )
    return reply(503, { error: 'COURSE_PUBLICATION_UNAVAILABLE' })
  const header = kind === 'peer' ? 'x-course-promotion-token' : 'x-course-source-token'
  if (!safeEqual(request.headers.get(header) ?? '', token))
    return reply(401, { error: 'UNAUTHORIZED' })
  const inputUrl = new URL(request.url)
  let suffix: string
  let maxBytes = 32_768
  if (
    kind === 'source' &&
    request.method === 'GET' &&
    path.length === 1 &&
    id(path[0]) &&
    !inputUrl.search
  )
    suffix = `/${path[0]}`
  else if (kind === 'peer') {
    const method = request.method
    if (method === 'GET' && path.length === 1 && path[0] === 'capabilities' && !inputUrl.search)
      suffix = '/capabilities'
    else if (
      method === 'GET' &&
      path.length === 1 &&
      path[0] === 'jobs' &&
      [...inputUrl.searchParams.keys()].length === 1 &&
      id(inputUrl.searchParams.get('sourceCourseId') ?? undefined)
    )
      suffix = `/jobs?sourceCourseId=${inputUrl.searchParams.get('sourceCourseId')}`
    else if (
      method === 'GET' &&
      path.length === 2 &&
      ['jobs', 'bindings'].includes(path[0]!) &&
      id(path[1]) &&
      !inputUrl.search
    )
      suffix = `/${path.join('/')}`
    else if (method === 'POST' && path.length === 1 && path[0] === 'preview' && !inputUrl.search) {
      suffix = '/preview'
      maxBytes = 64_000_000
    } else if (
      method === 'POST' &&
      path.length === 3 &&
      path[0] === 'jobs' &&
      id(path[1]) &&
      ['approve', 'resume', 'cancel'].includes(path[2]!) &&
      !inputUrl.search
    )
      suffix = `/${path.join('/')}`
    else return reply(400, { error: 'INVALID_INPUT' })
  } else return reply(400, { error: 'INVALID_INPUT' })
  const base = new URL(config.membersUrl)
  if (
    !['http:', 'https:'].includes(base.protocol) ||
    base.username ||
    base.password ||
    base.search ||
    base.hash
  )
    return reply(503, { error: 'COURSE_PUBLICATION_UNAVAILABLE' })
  let body: string | undefined
  if (request.method === 'POST') {
    if (
      !/^application\/json(?:;|$)/i.test(request.headers.get('content-type') ?? '') ||
      request.headers.has('content-encoding')
    )
      return reply(400, { error: 'INVALID_INPUT' })
    try {
      body = JSON.stringify(await readJsonBodyWithLimit(request, maxBytes, request.signal))
    } catch (error) {
      return reply(error instanceof RequestBodyTooLargeError ? 413 : 400, {
        error: 'INVALID_INPUT',
      })
    }
  }
  try {
    const target = new URL(
      `${kind === 'peer' ? '/members/internal/course-promotions' : '/members/internal/course-promotion-sources'}${suffix}`,
      base,
    )
    const response = await fetcher(target, {
      method: request.method,
      redirect: 'error',
      headers: { 'content-type': 'application/json', [header]: token },
      ...(body ? { body } : {}),
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(65_000)]),
    })
    const result = await readJsonBodyWithLimit(response, 64_000_000, request.signal)
    return reply(response.status, result)
  } catch {
    return reply(502, {
      error: 'COURSE_PUBLICATION_RELAY_FAILED',
    })
  }
}
