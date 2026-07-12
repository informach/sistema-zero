import Image from 'next/image'
import { cn } from '@/lib/cn'

interface KidsLogoProps {
  /** `nav` (sidebar/top bar) ou `auth` (telas de login, maior). */
  size?: 'nav' | 'auth'
  priority?: boolean
  className?: string
}

/**
 * Logo do app: wordmark do Sistema Zero (variantes dark/white em
 * `public/logo_dark|white.svg` — cópias LOCAIS re-tematizadas p/ o tema kids:
 * ZERO azul + faísca laranja; o wordmark lima→ciano segue intacto no adulto)
 * + selo "kids" composto em HTML — SVG via <img> roda em documento isolado e
 * NÃO enxerga as webfonts da página (Baloo 2), então o selo vive no DOM e
 * veste o tema (gradiente + contraste light/dark) sozinho.
 * `public/logo_kids_*.svg` são o fallback estático de marca (letras
 * desenhadas em paths) p/ uso FORA do app.
 */
export function KidsLogo({ size = 'nav', priority = false, className }: KidsLogoProps) {
  const imgClass = size === 'auth' ? 'w-[280px] max-w-full' : 'w-[118px] md:w-[132px]'
  // Sem translate: o selo fica centralizado na altura do wordmark (alinhado à logo).
  const pillClass = size === 'auth' ? 'px-3 py-1 text-base' : 'px-2 py-0.5 text-[0.7rem]'

  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <Image
        src="/logo_dark.svg"
        width={515}
        height={44}
        alt="Sistema Zero"
        priority={priority}
        className={cn('hidden h-auto dark:block', imgClass)}
      />
      <Image
        src="/logo_white.svg"
        width={515}
        height={44}
        alt="Sistema Zero"
        priority={priority}
        className={cn('block h-auto dark:hidden', imgClass)}
      />
      <span
        className={cn(
          'inline-block rounded-full font-bold lowercase leading-none',
          '[font-family:var(--font-display)] [background-image:var(--sz-gradient)] text-(--sz-primary-fg)',
          pillClass,
        )}
      >
        kids
      </span>
    </span>
  )
}
