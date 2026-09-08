import 'server-only'
import { creatorWorkshopEnabled } from '@sistemazero/core/career'
import { cache } from 'react'
import { getSession } from './session'

export const getCreatorWorkshopEnabled = cache(async () => {
  const session = await getSession()
  return creatorWorkshopEnabled(
    session?.activeProfile?.accountId ?? session?.id ?? null,
    process.env.CREATOR_WORKSHOP_ACCOUNTS,
  )
})
