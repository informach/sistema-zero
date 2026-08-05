'use client'

import { Play } from 'lucide-react'
import Link from 'next/link'
import { useChildGuideStartDescriptionId } from '@/components/kids/child-guide'

export function ContinueHeroLink({ href, started }: { href: string; started: boolean }) {
  const guideDescriptionId = useChildGuideStartDescriptionId()
  return (
    <Link
      href={href}
      aria-describedby={guideDescriptionId}
      className="mt-5 inline-flex h-11 items-center gap-2 rounded-full bg-card px-6 font-bold text-primary shadow-[0_4px_0_rgba(0,0,0,0.25)] transition-[transform,box-shadow,filter] duration-100 hover:brightness-105 active:translate-y-[3px] active:shadow-[0_1px_0_rgba(0,0,0,0.25)]"
    >
      <Play className="size-4 fill-current" aria-hidden="true" />
      {started ? 'Continuar' : 'Começar'}
    </Link>
  )
}
