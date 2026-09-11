/**
 * Chrome do HOST dentro do Molda (11/09/2026, lote 6b): o botão de esconder o menu lateral da
 * comunidade, a seta da galeria de volta para Criar e o selo "Guardado na sua conta" entram no
 * cabeçalho da galeria e na barra do editor, desenhados com os botões e os tons do PRÓPRIO Molda.
 * O host (community-kids) só manda DADOS pelo `MoldaHostChromeProvider`, nunca um elemento
 * pronto. Sem Provider (playground sem `?host=1`, testes) o contexto é `null` e nada aparece.
 *
 * Cópia por VALOR do `hostChrome.tsx` do Pinta: os dois pacotes não se importam, e o botão do
 * menu, a seta e a pílula da nuvem são as MESMAS receitas de `@sistemazero/ui/tool-chrome.css`
 * nas quatro ferramentas (é o que as deixa iguais na mão da criança).
 */
import { clsx } from 'clsx'
import { createContext, type JSX, type MouseEvent, useContext } from 'react'
import type {
  MoldaHostChrome,
  MoldaHostChromeBack,
  MoldaHostChromeMenu,
  MoldaHostChromeStatus,
} from '../core/hostChrome'
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

const MoldaHostChromeContext = createContext<MoldaHostChrome | null>(null)

export const MoldaHostChromeProvider = MoldaHostChromeContext.Provider

/** O chrome do host (`null` fora do community-kids). */
export function useMoldaHostChrome(): MoldaHostChrome | null {
  return useContext(MoldaHostChromeContext)
}

/**
 * Esconder/mostrar o menu lateral: a receita COMPARTILHADA `.sz-tool-btn-menu` (o quadrado de
 * cantos de 12px das telas-modelo, 40px no mouse e 44px no toque; "menu escondido" = borda e
 * tinta suaves do acento via `[aria-pressed]`), a MESMA do Pinta, do Estúdio e do Pensa. Sem
 * `title`: com `aria-label` presente ele viraria descrição e o leitor repetiria o nome.
 */
export function HostMenuButton({ menu }: { menu: MoldaHostChromeMenu }): JSX.Element {
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
 * A seta da GALERIA de volta à seção do host: o mesmo quadrado do menu, ao lado dele, com o
 * nome no `aria-label` ("Voltar para Criar"). É um link de verdade: o clique simples chama
 * `onNavigate` e o clique com Ctrl/Cmd/Shift/Alt ou com o botão do meio fica com o navegador
 * (abrir em outra aba).
 */
export function HostBackLink({ back }: { back: MoldaHostChromeBack }): JSX.Element {
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

const STATUS_ICONS: Record<MoldaHostChromeStatus['icon'], LucideIcon> = {
  upload: CloudUpload,
  download: CloudDownload,
  cloud: Cloud,
  offline: CloudOff,
  alert: TriangleAlert,
}

/**
 * A pílula pequena da barra do editor, nos tons do `SaveBadge` ao lado dela. Aviso e erro
 * escrevem na tinta do TEXTO (o fundo e o ícone levam o tom): o laranja e o vermelho puros não
 * chegam a 4,5:1 num texto de 12px sobre o tingido claro.
 */
const BAR_TONE_CLASSES: Record<MoldaHostChromeStatus['tone'], string> = {
  ok: 'bg-mld-ok/15 text-mld-ok',
  muted: 'bg-mld-border/40 text-mld-text-soft',
  warn: 'bg-mld-warn/20 text-mld-text [&>svg]:text-mld-warn',
  danger: 'bg-mld-danger/15 text-mld-text [&>svg]:text-mld-danger',
}

/**
 * O selo da nuvem. No cabeçalho da galeria (`variant="header"`) é a PÍLULA compartilhada
 * `.sz-tool-status` (a mesma do Pinta e do Estúdio), com a frase inteira. Na BARRA do editor
 * (`variant="bar"`) é a pílula pequena: em REPOUSO (guardado) só a nuvem, com o nome no `title`,
 * como nas telas-modelo; guardando e buscando também só o ícone (com o rótulo a barra mudava de
 * largura a cada salvamento); offline e erro mostram o texto sempre.
 * Quem ANUNCIA offline/erro ao leitor é a região viva do host (`aria-live="off"` aqui, de
 * propósito).
 */
export function HostCloudStatus({
  status,
  variant,
}: {
  status: MoldaHostChromeStatus
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
  // Só o que pede atenção (sem internet, não consegui) escreve na barra. Guardando e buscando
  // ficam no ícone, com a frase no `title`: com o rótulo, a barra mudava de largura a cada
  // salvamento automático e as pílulas ao lado trocavam de desenho junto.
  const attention = status.tone === 'warn' || status.tone === 'danger'
  return (
    <span
      role="status"
      aria-live="off"
      title={status.text}
      className={clsx(
        'inline-flex min-h-8 items-center gap-1 rounded-full text-xs font-bold',
        attention ? 'min-w-0 shrink px-3' : 'min-w-8 shrink-0 justify-center px-2',
        BAR_TONE_CLASSES[status.tone],
      )}
    >
      <Icon aria-hidden="true" className="size-4 shrink-0" />
      {attention ? <span className="truncate">{status.label}</span> : null}
    </span>
  )
}
