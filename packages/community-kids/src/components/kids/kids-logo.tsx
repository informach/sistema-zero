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
 * NÃO enxerga as webfonts da página (Baloo 2), então o selo vive no DOM.
 * O selo é a pílula AMARELA com tinta navy das telas-modelo (11/09/2026). O
 * amarelo é cor de fundo e não segue o tema; a tinta escura dá 8,73:1 nele.
 * `public/logo_kids_*.svg` são o fallback estático de marca (letras
 * desenhadas em paths) p/ uso FORA do app.
 */
export function KidsLogo({ size = 'nav', priority = false, className }: KidsLogoProps) {
  // No celular o logo divide a barra com fogo, XP, sino e avatar: 104px é o que cabe a
  // 390px sem nada passar por cima do selo (medido).
  const imgClass = size === 'auth' ? 'w-[280px] max-w-full' : 'w-[104px] md:w-[140px]'
  // Sem translate: o selo fica centralizado na altura do wordmark (alinhado à logo).
  const pillClass = size === 'auth' ? 'px-3 py-1 text-base' : 'px-2.5 py-1 text-[0.72rem]'

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
          '[font-family:var(--font-display)] bg-(--sz-kids-amarelo) text-(--sz-kids-tinta)',
          pillClass,
        )}
      >
        kids
      </span>
    </span>
  )
}
