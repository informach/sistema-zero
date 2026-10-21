'use client'

import {
  Gift,
  type LucideIcon,
  Palette,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/cn'

const SECTIONS: readonly { id: string; label: string; icon: LucideIcon }[] = [
  { id: 'avatar', label: 'Avatar', icon: UserRound },
  { id: 'dados', label: 'Dados pessoais', icon: UserRound },
  { id: 'cor', label: 'Cor da plataforma', icon: Palette },
  { id: 'identidade', label: 'Na comunidade', icon: Users },
  { id: 'creditos', label: 'Créditos e voz', icon: Sparkles },
  { id: 'embaixador', label: 'Embaixador', icon: Gift },
  { id: 'senha', label: 'Senha', icon: ShieldCheck },
]

/**
 * Os atalhos para cada seção do perfil: coluna fixa ao lado no computador, faixa que rola de lado no
 * celular. A parte à vista fica marcada (o link ganha `aria-current`). "Créditos e voz" e
 * "Embaixador" só aparecem quando a página monta a parte (`showAi`, `showAmbassador`).
 */
export function ProfileNav({
  showAi,
  showAmbassador = false,
}: {
  showAi: boolean
  showAmbassador?: boolean
}) {
  const items = SECTIONS.filter(
    (section) =>
      (showAi || section.id !== 'creditos') && (showAmbassador || section.id !== 'embaixador'),
  )
  const [active, setActive] = useState(items[0]?.id ?? '')

  useEffect(() => {
    const targets = SECTIONS.map((section) => document.getElementById(section.id)).filter(
      (element): element is HTMLElement => element !== null,
    )
    if (!targets.length) return
    let frame = 0
    // A parte ativa é a última cujo topo já passou de um terço da tela; no fim da página, a
    // última à vista (ela pode nunca chegar a esse terço).
    const update = () => {
      frame = 0
      const atBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4
      const line = atBottom ? window.innerHeight : window.innerHeight / 3
      let current = targets[0]
      for (const target of targets) if (target.getBoundingClientRect().top <= line) current = target
      if (current) setActive(current.id)
    }
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <nav
      aria-label="Seções do perfil"
      className="sz-card scrollbar-subtle flex gap-1 overflow-x-auto p-2 lg:sticky lg:top-[5.2rem] lg:w-[14rem] lg:flex-none lg:flex-col lg:overflow-visible lg:p-3"
    >
      {items.map((section) => {
        const Icon = section.icon
        const current = active === section.id
        return (
          <a
            key={section.id}
            href={`#${section.id}`}
            aria-current={current ? 'location' : undefined}
            onClick={() => setActive(section.id)}
            className={cn(
              'flex min-h-[2.8rem] flex-none items-center gap-3 whitespace-nowrap rounded-[0.6rem] px-3.5 text-foreground no-underline transition-colors',
              current ? 'bg-(--acao-tint) font-bold text-(--acao-texto)' : 'hover:bg-muted',
            )}
          >
            <Icon className="size-5 flex-none" aria-hidden />
            {section.label}
          </a>
        )
      })}
    </nav>
  )
}
