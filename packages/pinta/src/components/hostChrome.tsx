/**
 * Chrome do HOST dentro do Pinta (07/09/2026): o botão de esconder o menu lateral da
 * comunidade e o selo "Guardado na sua conta" entram na barra do editor e no cabeçalho
 * da galeria, desenhados com os botões e os tons do PRÓPRIO Pinta. O host
 * (community-kids) só manda DADOS pelo `PintaHostChromeProvider` — nunca um elemento
 * pronto: é o que impede o selo de chegar "colado por cima" com tokens de outra paleta.
 * Sem Provider (bloco de aula, playground, adulto) o contexto é `null` e nada aparece.
 *
 * Antes disso o selo vivia numa LINHA acima do Pinta (0 ou 32px: o canvas pulava na 1ª
 * gravação) e o puxador do menu morava numa calha de 36px ao lado do app.
 */
import { clsx } from 'clsx'
import { createContext, type JSX, useContext } from 'react'
import type { PintaHostChrome, PintaHostChromeMenu, PintaHostChromeStatus } from '../core/types'
import {
  Cloud,
  CloudDownload,
  CloudOff,
  CloudUpload,
  type LucideIcon,
  PanelLeftClose,
  PanelLeftOpen,
  TriangleAlert,
} from './ui/icons'

const PintaHostChromeContext = createContext<PintaHostChrome | null>(null)

export const PintaHostChromeProvider = PintaHostChromeContext.Provider

/** O chrome do host (`null` fora do community-kids). */
export function usePintaHostChrome(): PintaHostChrome | null {
  return useContext(PintaHostChromeContext)
}

/**
 * Esconder/mostrar o menu lateral. A base é a do `IconButton` (44px, canto xl, anel de
 * foco do Pinta); "menu escondido" é a TINTA SUAVE do acento — o preenchimento forte do
 * `pin-tool-active` leria como ferramenta selecionada. Sem `title`: com `aria-label`
 * presente ele viraria descrição e o leitor repetiria o nome.
 */
export function HostMenuButton({ menu }: { menu: PintaHostChromeMenu }): JSX.Element {
  const Icon = menu.hidden ? PanelLeftOpen : PanelLeftClose
  return (
    <button
      type="button"
      aria-label={menu.label}
      aria-pressed={menu.hidden}
      onClick={menu.onToggle}
      className={clsx(
        'inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl transition',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pin-accent',
        menu.hidden
          ? 'bg-pin-accent/15 text-pin-accent hover:bg-pin-accent/25'
          : 'text-pin-text hover:bg-pin-border/40',
      )}
    >
      <Icon aria-hidden="true" className="size-5" />
    </button>
  )
}

const STATUS_ICONS: Record<PintaHostChromeStatus['icon'], LucideIcon> = {
  upload: CloudUpload,
  download: CloudDownload,
  cloud: Cloud,
  offline: CloudOff,
  alert: TriangleAlert,
}

const STATUS_TONES: Record<PintaHostChromeStatus['tone'], string> = {
  muted: 'text-pin-muted',
  ok: 'text-pin-ok',
  warn: 'text-pin-warn',
  danger: 'text-pin-danger',
}

/**
 * O selo da nuvem no idioma do `SaveBadge` do editor (texto forte, sem pílula). Na
 * BARRA (`variant="bar"`) mostra o rótulo curto e, abaixo de `lg`, só o ícone — a barra
 * é `flex-wrap` e uma 2ª linha custaria a altura que este lote recupera; offline/erro
 * mostram o texto sempre. No cabeçalho da galeria vai a frase inteira. Quem ANUNCIA
 * offline/erro ao leitor é a região viva do host (`aria-live="off"` aqui, de propósito).
 */
export function HostCloudStatus({
  status,
  variant,
}: {
  status: PintaHostChromeStatus
  variant: 'bar' | 'header'
}): JSX.Element {
  const Icon = STATUS_ICONS[status.icon]
  const attention = status.tone === 'warn' || status.tone === 'danger'
  return (
    <span
      role="status"
      aria-live="off"
      title={status.text}
      className={clsx(
        'inline-flex min-w-0 items-center gap-1 font-bold text-sm',
        STATUS_TONES[status.tone],
      )}
    >
      <Icon aria-hidden="true" className="size-4 shrink-0" />
      <span className={clsx('truncate', variant === 'bar' && !attention && 'hidden lg:inline')}>
        {variant === 'bar' ? status.label : status.text}
      </span>
    </span>
  )
}
