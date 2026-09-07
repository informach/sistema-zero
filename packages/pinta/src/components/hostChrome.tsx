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
 * Esconder/mostrar o menu lateral: a receita COMPARTILHADA `.sz-tool-btn-menu` de
 * `@sistemazero/ui/tool-chrome.css` (44px, cantos xl, borda 2px, fundo de painel, sombra
 * dura; "menu escondido" = borda e tinta suaves do acento via `[aria-pressed]`), a MESMA do
 * Estúdio e do Pensa. Sem `title`: com `aria-label` presente ele viraria descrição e o leitor
 * repetiria o nome.
 */
export function HostMenuButton({ menu }: { menu: PintaHostChromeMenu }): JSX.Element {
  const Icon = menu.hidden ? PanelLeftOpen : PanelLeftClose
  return (
    <button
      type="button"
      aria-label={menu.label}
      aria-pressed={menu.hidden}
      onClick={menu.onToggle}
      className="sz-tool-btn-menu"
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
 * O selo da nuvem. Na BARRA do editor (`variant="bar"`) é o idioma do `SaveBadge` (texto
 * forte, sem pílula): rótulo curto e, abaixo de `lg`, só o ícone — a barra é `flex-wrap` e
 * uma 2ª linha custaria altura; offline/erro mostram o texto sempre. No cabeçalho da galeria
 * (`variant="header"`) é a PÍLULA compartilhada `.sz-tool-status` (a mesma do Estúdio), com a
 * frase inteira. Quem ANUNCIA offline/erro ao leitor é a região viva do host (`aria-live="off"`
 * aqui, de propósito).
 */
export function HostCloudStatus({
  status,
  variant,
}: {
  status: PintaHostChromeStatus
  variant: 'bar' | 'header'
}): JSX.Element {
  const Icon = STATUS_ICONS[status.icon]
  if (variant === 'header') {
    return (
      <span
        role="status"
        aria-live="off"
        title={status.text}
        className={clsx('sz-tool-status', `sz-tool-status--${status.tone}`)}
      >
        <Icon aria-hidden="true" />
        {status.text}
      </span>
    )
  }
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
      <span className={clsx('truncate', !attention && 'hidden lg:inline')}>{status.label}</span>
    </span>
  )
}
