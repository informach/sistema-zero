import 'server-only'
import { coursePublicationRequest } from '@/lib/course-publication-request'
import { gatewayFetch } from './gateway'

export function coursePublicationsRequest(
  method: 'GET' | 'POST',
  path: string[],
  query: URLSearchParams,
  body?: unknown,
) {
  const request = coursePublicationRequest(method, path, query, body)
  return gatewayFetch(request.path, { method, query: request.query, body: request.body })
}
