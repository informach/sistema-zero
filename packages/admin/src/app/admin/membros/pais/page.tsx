'use client'

import { usePlatform } from '@/components/admin/platform-provider'
import { MembersClient } from '../members-client'

export default function ParentStudentsPage() {
  const platform = usePlatform()
  return <MembersClient key={platform} parents={platform === 'kids'} />
}
