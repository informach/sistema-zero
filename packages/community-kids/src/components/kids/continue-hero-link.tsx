'use client'

import { Play } from 'lucide-react'
import Link from 'next/link'
import { useChildGuideStartDescriptionId } from '@/components/kids/child-guide'

export function ContinueHeroLink({
  href,
  started,
  label,
}: {
  href: string
  started: boolean
  label?: string
}) {
  const guideDescriptionId = useChildGuideStartDescriptionId()
  return (
    <Link
      href={href}
      aria-describedby={guideDescriptionId}
      className="sz-btn-gradient mt-5 inline-flex min-h-11 items-center gap-2 px-6"
    >
      <Play className="size-4 fill-current" aria-hidden="true" />
      {label ?? (started ? 'Continuar' : 'Começar')}
    </Link>
  )
}
