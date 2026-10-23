import { z } from 'zod'
import { serverOrigin } from './connection'
export function parseDeepLink(value: string, development: boolean) {
  if (value.length > 2000) throw new Error('Link inválido')
  const url = new URL(value)
  if (
    url.protocol !== 'sistema-zero-marketing:' ||
    url.hostname !== 'open' ||
    url.username ||
    url.password ||
    url.hash ||
    url.port
  )
    throw new Error('Link inválido')
  const id = z.string().uuid().parse(url.pathname.slice(1))
  if (url.searchParams.size !== 1 || !url.searchParams.has('server'))
    throw new Error('Link inválido')
  const origin = serverOrigin(url.searchParams.get('server') ?? '', development)
  return { id, origin }
}
