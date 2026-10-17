/**
 * Ícones de traço do Pensa (desenho do Lucide, ISC), inline: o pacote não depende de
 * `lucide-react`. Todos decorativos (`aria-hidden`): quem dá nome é o texto ou o
 * `aria-label` do controle. Tamanho por prop; a cor é a do texto (`currentColor`).
 */
import type { ReactNode } from 'react'

function Icon({ size = 20, children }: { size?: number; children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  )
}

type IconProps = { size?: number }

/** O painel lateral (o botão do menu do host); `open` = o menu está escondido. */
export function PanelIcon({ open, size }: IconProps & { open: boolean }) {
  return (
    <Icon size={size}>
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M9 3v18" />
      {open ? <path d="m14 9 3 3-3 3" /> : <path d="m16 15-3-3 3-3" />}
    </Icon>
  )
}

/** Seta para a esquerda (voltar). */
export function ArrowLeftIcon({ size }: IconProps) {
  return (
    <Icon size={size}>
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </Icon>
  )
}
