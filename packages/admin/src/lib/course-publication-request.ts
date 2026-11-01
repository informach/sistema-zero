import {
  CoursePublicationCommandSchema,
  CoursePublicationOperationSchema,
  CoursePublicationPrepareSchema,
} from '@sistemazero/core/course/publication'
import { ValidationError } from '@sistemazero/core/errors'
import { z } from 'zod'

const id = z.uuid()
export function coursePublicationRequest(
  method: 'GET' | 'POST',
  path: string[],
  query: URLSearchParams,
  body?: unknown,
): { path: string; body?: unknown; query?: Record<string, string> } {
  const root = '/members/admin/course-publications'
  if (
    [...query.keys()].some(
      (key) =>
        method !== 'GET' || path.length !== 0 || !['sourceCourseId', 'operation'].includes(key),
    )
  )
    throw new ValidationError('Consulta inválida')
  if (method === 'GET' && path.length === 0)
    return {
      path: root,
      query: {
        sourceCourseId: id.parse(query.get('sourceCourseId')),
        ...(query.has('operation')
          ? { operation: CoursePublicationOperationSchema.parse(query.get('operation')) }
          : {}),
      },
    }
  if (method === 'GET' && path.length === 1 && path[0] === 'capabilities')
    return { path: `${root}/capabilities` }
  if (method === 'GET' && path.length === 1) return { path: `${root}/${id.parse(path[0])}` }
  if (method === 'POST' && path.length === 1 && path[0] === 'preview')
    return { path: `${root}/preview`, body: CoursePublicationPrepareSchema.parse(body) }
  if (method === 'POST' && path.length === 2 && ['approve', 'resume', 'cancel'].includes(path[1]!))
    return {
      path: `${root}/${id.parse(path[0])}/${path[1]}`,
      body: CoursePublicationCommandSchema.parse(body),
    }
  throw new ValidationError('Operação de publicação inválida')
}
