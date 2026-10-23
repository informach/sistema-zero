import { readJsonBodyWithLimit } from '@sistemazero/core/http'
import { isStudioPublication } from '@sistemazero/core/studio'
import type { StudioShareAdapter } from '@sistemazero/studio'
import { sessionFetch } from './session-fetch'

export function createStudioPublicationAdapter(): NonNullable<StudioShareAdapter['publication']> {
  async function call(operation: string, input: object, signal?: AbortSignal) {
    const response = await sessionFetch('/api/studio/publication', {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...input, operation }),
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(200_000)])
        : AbortSignal.timeout(200_000),
    })
    const body: unknown = await readJsonBodyWithLimit(response, 32_768)
    if (!response.ok) {
      if (
        body &&
        typeof body === 'object' &&
        'error' in body &&
        body.error &&
        typeof body.error === 'object' &&
        'message' in body.error &&
        typeof body.error.message === 'string'
      )
        throw new Error(body.error.message)
      throw new Error('Não foi possível consultar a publicação. Tente novamente.')
    }
    if (operation === 'get' && body === null) return null
    if (!isStudioPublication(body)) throw new Error('O histórico da publicação é inválido.')
    return body
  }
  return {
    get: (playId, signal) => call('get', { playId }, signal),
    async update(input, signal) {
      const result = await call('update', input, signal)
      if (!result) throw new Error('Publicação não encontrada.')
      return result
    },
    async activate(input, signal) {
      const result = await call('activate', input, signal)
      if (!result) throw new Error('Publicação não encontrada.')
      return result
    },
  }
}
