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

/** Seta para a direita ("Continuar"). */
export function ArrowRightIcon({ size }: IconProps) {
  return (
    <Icon size={size}>
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </Icon>
  )
}

export function PlusIcon({ size }: IconProps) {
  return (
    <Icon size={size}>
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </Icon>
  )
}

/** O alvo do plano (o "◉" do cartão). */
export function TargetIcon({ size }: IconProps) {
  return (
    <Icon size={size}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />
    </Icon>
  )
}

/** A bandeirinha da linha de andamento do plano. */
export function FlagIcon({ size }: IconProps) {
  return (
    <Icon size={size}>
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <path d="M4 22v-7" />
    </Icon>
  )
}

/** A lâmpada do selo "Pensa · sua oficina de planos". */
export function LightbulbIcon({ size }: IconProps) {
  return (
    <Icon size={size}>
      <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
      <path d="M9 18h6" />
      <path d="M10 22h4" />
    </Icon>
  )
}

/** O Estúdio (a grade de blocos). */
export function BlocksIcon({ size }: IconProps) {
  return (
    <Icon size={size}>
      <rect width="7" height="7" x="3" y="3" rx="1.5" />
      <rect width="7" height="7" x="14" y="3" rx="1.5" />
      <rect width="7" height="7" x="14" y="14" rx="1.5" />
      <rect width="7" height="7" x="3" y="14" rx="1.5" />
    </Icon>
  )
}

/** O Pinta (a paleta). */
export function PaletteIcon({ size }: IconProps) {
  return (
    <Icon size={size}>
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.65-.75 1.65-1.69 0-.44-.18-.84-.44-1.13-.29-.29-.44-.65-.44-1.13a1.64 1.64 0 0 1 1.67-1.67h2c3.05 0 5.55-2.5 5.55-5.55C21.97 6.01 17.46 2 12 2z" />
      <circle cx="13.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="17.5" cy="10.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="8.5" cy="7.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="6.5" cy="12.5" r="1" fill="currentColor" stroke="none" />
    </Icon>
  )
}

/** O Molda (o cubo). */
export function CubeIcon({ size }: IconProps) {
  return (
    <Icon size={size}>
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </Icon>
  )
}
