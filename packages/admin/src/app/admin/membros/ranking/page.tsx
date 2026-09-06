'use client'

import { usePlatform } from '@/components/admin/platform-provider'
import { RankingContent } from './ranking-content'

export default function RankingPage() {
  const platform = usePlatform()
  return <RankingContent key={platform} platform={platform} />
}
