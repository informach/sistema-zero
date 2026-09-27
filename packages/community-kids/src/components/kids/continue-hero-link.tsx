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
      // de ações do `KidsHero`. 50px e o play VAZADO, como nas telas-modelo.
      className="sz-btn-gradient sz-btn-inverso h-[3.125rem] gap-2.5 px-7 text-base"
    >
      <Play className="size-[1.125rem]" aria-hidden="true" />
      {label ?? (started ? 'Continuar' : 'Começar')}
    </Link>
  )
}
