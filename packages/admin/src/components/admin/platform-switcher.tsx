'use client'

import { usePathname } from 'next/navigation'
import { cn } from '@/lib/cn'
import { PLATFORM_LABELS, PLATFORMS, type Platform } from '@/lib/platform'
import { pathIsPlatformScoped } from './nav'
import { usePlatform } from './platform-provider'
import { setPlatform } from './platform-store'

/** A cor de cada comunidade na lente: o amarelo do Zappy (Kids) e o verde-água (Adultos). */
const ACTIVE_CLASS: Record<Platform, string> = {
  kids: 'bg-lens-kids text-lens-kids-ink',
  adult: 'bg-lens-adult text-lens-adult-ink',
}

/**
 * A lente das comunidades, no topo do menu (Kids × Adultos). Nas rotas ESCOPADAS
 * (`pathIsPlatformScoped`) as telas filtram pela comunidade escolhida; nas demais (Negócio,
 * Clube e Comunidade, Auditoria) a lente se apaga e uma legenda avisa que a tela é das duas.
 */
export function PlatformSwitcher() {
  const pathname = usePathname()
  const platform = usePlatform()
  const scoped = pathIsPlatformScoped(pathname)

  return (
    <div className="shrink-0 px-4 pt-1 pb-2">
      <p className="mb-2 px-1 font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-menu-icon">
        Comunidade
      </p>
      <div
        role="group"
        aria-label="Comunidade"
        className={cn(
          'grid grid-cols-2 gap-1 rounded-full bg-menu-2 p-1',
          scoped ? null : 'opacity-60',
        )}
      >
        {PLATFORMS.map((option) => {
          const isActive = option === platform
          return (
            <button
              key={option}
              type="button"
              aria-pressed={isActive}
              onClick={() => setPlatform(option)}
              className={cn(
                'h-9 rounded-full text-sm font-bold transition-colors',
                isActive ? ACTIVE_CLASS[option] : 'text-menu-text hover:text-white',
              )}
            >
              {PLATFORM_LABELS[option]}
            </button>
          )
        })}
      </div>
      {scoped ? null : (
        <p className="mt-2 px-1 text-[13px] leading-snug text-menu-icon">
          Esta área mostra as duas comunidades.
        </p>
      )}
    </div>
  )
}
