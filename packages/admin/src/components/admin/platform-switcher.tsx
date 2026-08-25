'use client'

import { usePathname } from 'next/navigation'
import { cn } from '@/lib/cn'
import { PLATFORM_LABELS, PLATFORMS } from '@/lib/platform'
import { pathIsPlatformScoped } from './nav'
import { usePlatform } from './platform-provider'
import { setPlatform } from './platform-store'

/**
 * Alternador global Kids × Adultos da sidebar. Nas rotas ESCOPADAS
 * (`pathIsPlatformScoped`) as telas filtram pela plataforma ativa; nas demais
 * (Gestão/Configuração global) uma legenda avisa que a tela é das duas.
 */
export function PlatformSwitcher() {
  const pathname = usePathname()
  const platform = usePlatform()
  const scoped = pathIsPlatformScoped(pathname)

  return (
    <div className="shrink-0 px-3 pt-3">
      <div
        role="group"
        aria-label="Plataforma"
        className="grid grid-cols-2 rounded-lg border border-border bg-muted/60 p-0.5"
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
                'rounded-md px-2 py-1 text-xs font-medium transition-colors',
                isActive
                  ? 'bg-background font-semibold text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {PLATFORM_LABELS[option]}
            </button>
          )
        })}
      </div>
      {scoped ? null : (
        <p className="mt-1.5 px-1 text-[11px] leading-snug text-muted-foreground">
          Esta tela mostra as duas plataformas
        </p>
      )}
    </div>
  )
}
