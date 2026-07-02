/**
 * Sprites DECORATIVOS dos wireframes ("As telas do jogo"): bonequinho do
 * herói, inimigo espinhoso, moedinhas e a estrela do placar. Todos SVG inline
 * estático do pacote (aria-hidden; a regra "SVG via <img data:>" vale só para
 * SVG vindo do BFF — precedente FooterStars) pintado por `currentColor`, então
 * a cor da paleta/token vem do wrapper. Olhos brancos + traços rgba-preto
 * funcionam sobre qualquer cor e nos dois temas.
 */
import type { JSX } from 'react'

export function HeroSprite(): JSX.Element {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32" className="h-9 w-9">
      <rect x="6" y="7" width="20" height="21" rx="9" fill="currentColor" />
      <circle cx="13" cy="16" r="3.2" fill="#fff" />
      <circle cx="19" cy="16" r="3.2" fill="#fff" />
      <circle cx="13.8" cy="16.6" r="1.4" fill="rgba(0,0,0,.75)" />
      <circle cx="19.8" cy="16.6" r="1.4" fill="rgba(0,0,0,.75)" />
      <path
        d="M13 22 q3 2.4 6 0"
        stroke="rgba(0,0,0,.6)"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function EnemySprite(): JSX.Element {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32" className="h-9 w-9">
      <path
        d="M16 2 L19 9 L26 6 L23 13 L30 16 L23 19 L26 26 L19 23 L16 30 L13 23 L6 26 L9 19 L2 16 L9 13 L6 6 L13 9 Z"
        fill="currentColor"
      />
      <circle cx="13" cy="15" r="2.6" fill="#fff" />
      <circle cx="19" cy="15" r="2.6" fill="#fff" />
      <circle cx="13.5" cy="15.5" r="1.2" fill="rgba(0,0,0,.75)" />
      <circle cx="19.5" cy="15.5" r="1.2" fill="rgba(0,0,0,.75)" />
      <path
        d="M10.5 11.5 L15 13.2 M21.5 11.5 L17 13.2"
        stroke="rgba(0,0,0,.65)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M13 21.5 q3 -2 6 0"
        stroke="rgba(0,0,0,.6)"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function ItemSprite(): JSX.Element {
  return (
    <svg aria-hidden="true" viewBox="0 0 44 28" className="h-7 w-11">
      <circle cx="11" cy="17" r="8.5" fill="currentColor" />
      <circle cx="11" cy="17" r="5" fill="none" stroke="rgba(255,255,255,.75)" strokeWidth="1.6" />
      <circle cx="24" cy="11" r="8.5" fill="currentColor" />
      <circle cx="24" cy="11" r="5" fill="none" stroke="rgba(255,255,255,.75)" strokeWidth="1.6" />
      <circle cx="35" cy="18" r="7" fill="currentColor" />
      <circle cx="35" cy="18" r="4" fill="none" stroke="rgba(255,255,255,.75)" strokeWidth="1.4" />
    </svg>
  )
}

export function StarIcon(): JSX.Element {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="h-2.5 w-2.5">
      <path
        d="M8 1 L10 5.8 L15 6.2 L11.3 9.6 L12.4 14.6 L8 12 L3.6 14.6 L4.7 9.6 L1 6.2 L6 5.8 Z"
        fill="currentColor"
      />
    </svg>
  )
}
