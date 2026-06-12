import { useId } from 'react'
import { cn } from '@/lib/cn'

export type MascotExpression = 'happy' | 'celebrating' | 'thinking' | 'sleeping'

/** Path ORIGINAL da estrela de 4 pontas da logo (logo_dark.svg) — fonte da marca. */
const STAR_PATH =
  'M504.365 22.1826C498.184 22.1826 493.183 27.1841 493.183 33.3652C493.183 30.2825 491.94 27.483 489.911 25.454C487.882 23.4251 485.083 22.1826 482 22.1826C485.083 22.1826 487.882 20.9401 489.911 18.9112C491.94 16.8823 493.183 14.0827 493.183 11C493.183 14.0827 494.425 16.8823 496.454 18.9112C498.483 20.9401 501.283 22.1826 504.365 22.1826Z'
/** Normaliza a estrela (centro 493.183,22.183 · lado 22.365) p/ o viewBox 48×48. */
const STAR_TRANSFORM = 'translate(24 24) scale(1.7) translate(-493.183 -22.1826)'
/** Rosto sempre navy — contraste garantido sobre o gradiente claro da marca. */
const FACE = '#0D1117'
const BRAND_CYAN = '#42E8E0'
const BRAND_LIME = '#C4F042'

interface KidsMascotProps {
  expression?: MascotExpression
  className?: string
}

/**
 * Mascote-faísca do Sistema Zero Kids: a própria estrela de 4 pontas da
 * logo (mesmo path + gradiente) com um rosto por expressão. SVG inline e
 * server-safe (useId é permitido em Server Components SÍNCRONOS — gera o
 * id único do gradiente p/ múltiplos mascotes na mesma página).
 * Decorativo por definição: o texto ao lado dá o significado (aria-hidden).
 */
export function KidsMascot({ expression = 'happy', className }: KidsMascotProps) {
  const gradId = useId()

  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      className={cn('size-12 shrink-0', className)}
    >
      <defs>
        {/* Coordenadas do gradiente da PRÓPRIA logo (paint1 do logo_dark.svg):
            userSpaceOnUse resolve no espaço LOCAL do path transformado — que é
            o do wordmark original (~482-504), não o do viewBox 48×48. */}
        <linearGradient
          id={gradId}
          x1="487.599"
          y1="16.5992"
          x2="498.782"
          y2="27.7818"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor={BRAND_LIME} />
          <stop offset="1" stopColor={BRAND_CYAN} />
        </linearGradient>
      </defs>
      <path d={STAR_PATH} transform={STAR_TRANSFORM} fill={`url(#${gradId})`} />

      {expression === 'happy' ? (
        <g>
          <circle cx="21" cy="22.5" r="1.6" fill={FACE} />
          <circle cx="27" cy="22.5" r="1.6" fill={FACE} />
          <path
            d="M20.5 27.5Q24 30.5 27.5 27.5"
            stroke={FACE}
            strokeWidth="1.8"
            strokeLinecap="round"
            fill="none"
          />
        </g>
      ) : null}

      {expression === 'celebrating' ? (
        <g>
          <path
            d="M18.6 22.5L21 20.6L23.4 22.5"
            stroke={FACE}
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <path
            d="M24.6 22.5L27 20.6L29.4 22.5"
            stroke={FACE}
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <ellipse cx="24" cy="28" rx="2.6" ry="3" fill={FACE} />
          {/* Faíscas de comemoração — mini-estrelas nas cores da marca. */}
          <path
            d="M8 8.8Q8.7 10.5 10.4 11.2Q8.7 11.9 8 13.6Q7.3 11.9 5.6 11.2Q7.3 10.5 8 8.8Z"
            fill={BRAND_CYAN}
          />
          <path
            d="M40.5 6.5Q41.3 8.5 43.3 9.3Q41.3 10.1 40.5 12.1Q39.7 10.1 37.7 9.3Q39.7 8.5 40.5 6.5Z"
            fill={BRAND_LIME}
          />
          <path
            d="M40 36.5Q40.6 38 42.1 38.6Q40.6 39.2 40 40.7Q39.4 39.2 37.9 38.6Q39.4 38 40 36.5Z"
            fill={BRAND_CYAN}
          />
        </g>
      ) : null}

      {expression === 'thinking' ? (
        <g>
          <circle cx="21" cy="20.8" r="1.6" fill={FACE} />
          <circle cx="27" cy="20.8" r="1.6" fill={FACE} />
          <path
            d="M21.8 28.4H26.2"
            stroke={FACE}
            strokeWidth="1.8"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M40 8.5Q40.7 10.2 42.4 10.9Q40.7 11.6 40 13.3Q39.3 11.6 37.6 10.9Q39.3 10.2 40 8.5Z"
            fill={BRAND_LIME}
          />
        </g>
      ) : null}

      {expression === 'sleeping' ? (
        <g>
          <path
            d="M18.8 22.3Q21 24.3 23.2 22.3"
            stroke={FACE}
            strokeWidth="1.6"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M24.8 22.3Q27 24.3 29.2 22.3"
            stroke={FACE}
            strokeWidth="1.6"
            strokeLinecap="round"
            fill="none"
          />
          <circle cx="24" cy="28" r="1.2" fill={FACE} />
          <path
            d="M33 13H36.2L33 16.4H36.2"
            stroke={BRAND_CYAN}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <path
            d="M38.5 5.5H42.7L38.5 10H42.7"
            stroke={BRAND_LIME}
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </g>
      ) : null}
    </svg>
  )
}
