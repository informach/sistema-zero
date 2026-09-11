/**
 * Chrome do HOST dentro do Pinta (07/09/2026): o botão de esconder o menu lateral da
 * comunidade e o selo "Guardado na sua conta" entram na barra do editor e no cabeçalho
 * da galeria, desenhados com os botões e os tons do PRÓPRIO Pinta. Desde 11/09 o contrato
 * também traz a seta da galeria de volta à seção do host e o sinal da nuvem da conta. O host
 * (community-kids) só manda DADOS pelo `PintaHostChromeProvider` — nunca um elemento
 * pronto: é o que impede o selo de chegar "colado por cima" com tokens de outra paleta.
 * Sem Provider (bloco de aula, playground, adulto) o contexto é `null` e nada aparece.
 *
 * Antes disso o selo vivia numa LINHA acima do Pinta (0 ou 32px: o canvas pulava na 1ª
 * gravação) e o puxador do menu morava numa calha de 36px ao lado do app.
 */
import { clsx } from 'clsx'
import { createContext, type JSX, type MouseEvent, useContext } from 'react'
import type {
  PintaHostChrome,
  PintaHostChromeBack,
  PintaHostChromeMenu,
  PintaHostChromeStatus,
} from '../core/types'
import {
  ArrowLeft,
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
 * `@sistemazero/ui/tool-chrome.css` (o quadrado de cantos de 12px das telas-modelo, 40px no
 * mouse e 44px no toque; "menu escondido" = borda e tinta suaves do acento via
 * `[aria-pressed]`), a MESMA do Estúdio e do Pensa. Sem `title`: com `aria-label` presente ele
 * viraria descrição e o leitor repetiria o nome.
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

/**
 * A seta da GALERIA de volta à seção do host (11/09/2026: "← Criar"): o MESMO quadrado do menu,
 * ao lado dele, com o nome no `aria-label` ("Voltar para Criar"). É um link de verdade: o clique
 * simples chama `onNavigate` (o host troca de rota sem recarregar) e o clique com Ctrl/Cmd/Shift/
 * Alt ou com o botão do meio fica com o navegador (abrir em outra aba). Espelho do
 * `HostBackLink` do Estúdio.
 */
export function HostBackLink({ back }: { back: PintaHostChromeBack }): JSX.Element {
  return (
    <a
      href={back.href}
      aria-label={back.label}
      className="sz-tool-back"
      onClick={(event) => {
        if (!isPlainClick(event)) return
        event.preventDefault()
        back.onNavigate()
      }}
    >
      <ArrowLeft aria-hidden="true" />
    </a>
  )
}

function isPlainClick(event: MouseEvent): boolean {
  return (
    event.button === 0 &&
    !event.defaultPrevented &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  )
}

const STATUS_ICONS: Record<PintaHostChromeStatus['icon'], LucideIcon> = {
  upload: CloudUpload,
  download: CloudDownload,
  cloud: Cloud,
  offline: CloudOff,
  alert: TriangleAlert,
}

/**
 * O selo da nuvem. Na BARRA do editor (`variant="bar"`) é a pílula pequena do `SaveBadge`
 * (`.pin-bar-seal` do `pinta.css`, porque o editor roda também na aula e no admin): em REPOUSO
 * (guardado) só a nuvem no círculo menta, sem frase, como na tela-modelo; quando algo acontece,
 * o rótulo curto e, abaixo de `lg`, só o ícone (a barra é `flex-wrap` e uma 2ª linha custaria
 * altura); offline/erro mostram o texto sempre. No cabeçalho da galeria (`variant="header"`) é a
 * PÍLULA compartilhada `.sz-tool-status` (a mesma do Estúdio), com a frase inteira. O nome do
 * status vem do `title`, que também é a dica do mouse. Quem ANUNCIA offline/erro ao leitor é a
 * região viva do host (`aria-live="off"` aqui, de propósito).
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
  if (status.tone === 'ok') {
    return (
      <span
        role="status"
        aria-live="off"
        title={status.text}
        className="pin-bar-seal pin-bar-seal--ok pin-bar-seal--icon"
      >
        <Icon aria-hidden="true" />
      </span>
    )
  }
  const attention = status.tone === 'warn' || status.tone === 'danger'
  return (
    <span
      role="status"
      aria-live="off"
      title={status.text}
      className={clsx('pin-bar-seal min-w-0', `pin-bar-seal--${status.tone}`)}
    >
      <Icon aria-hidden="true" />
      <span className={clsx('truncate', !attention && 'hidden lg:inline')}>{status.label}</span>
    </span>
  )
}
