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
      // `sz-btn-inverso`: o herói é azul e o CTA da marca também, então o botão
      // some no fundo sem a inversão. Sem `mt-5`: quem espaça agora é a fileira
      // de ações do `KidsHero`.
      className="sz-btn-gradient sz-btn-inverso inline-flex min-h-11 items-center gap-2 px-6"
    >
      <Play className="size-4 fill-current" aria-hidden="true" />
      {label ?? (started ? 'Continuar' : 'Começar')}
    </Link>
  )
}
