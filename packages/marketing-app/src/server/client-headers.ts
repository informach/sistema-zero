import 'server-only'
import { headers } from 'next/headers'

/** Preserve the end user's IP/request trace across BFF -> gateway calls. */
export async function clientForwardHeaders(): Promise<Record<string, string>> {
  const source = await headers()
  const result: Record<string, string> = {}
  const forwarded = source.get('x-forwarded-for'),
    requestId = source.get('x-request-id')
  if (forwarded) result['x-forwarded-for'] = forwarded
  if (requestId) result['x-request-id'] = requestId
  return result
}
