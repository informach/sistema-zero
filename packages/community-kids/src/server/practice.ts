import 'server-only'
import { cache } from 'react'
import { shell } from './shell'
export const getPracticeAvailability = cache(async () => {
  const result = await shell.gateway.gatewayFetchReadonly<{ enabled: boolean }>(
    '/members/practice/availability',
  )
  return result.status === 200 && typeof result.body?.enabled === 'boolean'
    ? result.body.enabled
    : null
})
