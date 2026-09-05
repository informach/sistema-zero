import { clsx } from 'clsx'
import type {
  ButtonHTMLAttributes,
  JSX,
  MouseEvent as ReactMouseEvent,
  ReactNode,
  Ref,
} from 'react'
import { useId } from 'react'
import { ChevronDown } from './icons'

export interface PanelDisclosure {
  open: boolean
  onOpenChange: (open: boolean) => void
  expandLabel: string
  collapseLabel: string
}

/**
 * Painel do editor com CABEÇALHO: faixa de título tonal + divisória, e o corpo
 * embaixo. Antes cada painel era um `.pin-panel` pelado com um `<span>` em
 * negrito solto na primeira linha — sem barra, sem separação —, o que fazia os
 * blocos do editor parecerem uma pilha de caixas em vez de painéis.
 *
 * ⚠️ O `aria-label` da `<section>` é PRESERVADO como estava em cada painel: há
 * testes que casam o SELETOR `section[aria-label="Camadas"]`, e o rótulo é o
 * que o leitor de tela anuncia. Por isso `ariaLabel` existe separado do
 * `title` — só use quando o texto visível não puder ser o rótulo.
 *
 * ⚠️ O padding some da `<section>` e vai para o corpo (`bodyClassName`): com ele
 * na raiz, a faixa de título ficaria "flutuando" com respiro dos dois lados.
 *
 * Com `disclosure` (04/09/2026, full review do accordion): o TÍTULO inteiro é
 * um botão de abrir/recolher (a criança toca na faixa, não só no chevron de
 * 44px), e RECOLHIDO o painel esconde as `actions` (a lixeira e o "+" da
 * paleta agiam num corpo desmontado: o menu não abria e a lixeira apagava uma
 * cor invisível) e mostra o `ariaLabel` como título (a paleta recolhida diz
 * "Cores", não "Arcade"). `collapsedActions` é o que aparece no lugar delas
 * (a miniatura viva da Prévia).
 */
export interface PanelProps {
  /** Texto da faixa de título. */
  title: string
  /** Rótulo acessível da seção. Default: o `title`. */
  ariaLabel?: string
  /** Botões à direita do título (lixeira, "+", zoom…). Somem com o painel recolhido. */
  actions?: ReactNode
  /** O que fica no lugar das `actions` com o painel RECOLHIDO (ex.: a miniatura da Prévia). */
  collapsedActions?: ReactNode
  /**
   * Torna o título um BOTÃO (o disclosure "Arcade ∨" da paleta). Recebe o
   * evento porque quem abre um menu ancorado precisa medir o gatilho. Só vale
   * com o painel ABERTO: recolhido, o título abre o painel.
   */
  onTitleClick?: (event: ReactMouseEvent<HTMLButtonElement>) => void
  titleRef?: Ref<HTMLButtonElement>
  titleProps?: ButtonHTMLAttributes<HTMLButtonElement>
  /** Sufixo do título (ex.: o chevron do dropdown, uma pílula de contagem). */
  titleSuffix?: ReactNode
  /** Disclosure controlado; o botão fica separado do título e das ações. */
  disclosure?: PanelDisclosure
  /** Layout EXTERNO do painel (w-68, flex, shrink-0…). */
  className?: string
  /** Padding e rolagem do CORPO. Default `flex flex-col gap-2 p-2`. */
  bodyClassName?: string
  children: ReactNode
}

const TITLE_CLASS =
  'pin-display min-w-0 flex-1 truncate text-left text-xs uppercase tracking-wide text-pin-text'
const TITLE_BUTTON_CLASS =
  'flex min-h-11 items-center gap-1 rounded-lg px-1 hover:bg-pin-border/40 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-pin-accent'

export function Panel({
  title,
  ariaLabel,
  actions,
  collapsedActions,
  onTitleClick,
  titleRef,
  titleProps,
  titleSuffix,
  disclosure,
  className,
  bodyClassName,
  children,
}: PanelProps): JSX.Element {
  const bodyId = useId()
  const collapsed = disclosure ? !disclosure.open : false
  // O menu próprio do título (paleta) só com o painel ABERTO; com disclosure o
  // título vira o botão de abrir/recolher; sem nada, texto.
  const titleAsMenu = Boolean(onTitleClick) && !collapsed
  const shownTitle = collapsed ? (ariaLabel ?? title) : title
  return (
    <section
      aria-label={ariaLabel ?? title}
      // `overflow-hidden` p/ a faixa respeitar o raio de 1rem do .pin-panel.
      // ⚠️ `shrink-0` é load-bearing (04/09/2026): o `min-h-0` explícito E o
      // `overflow-hidden` zeram o mínimo automático do item flex, então numa
      // coluna apertada o painel encolhia até quase sumir (a Prévia do vetor
      // media 8px em 1366×768) e escondia o próprio conteúdo. A régua da casa:
      // o painel tem a altura do conteúdo; quem não cabe ROLA, e quem rola é a
      // coluna. Quem precisar de um painel que encolhe não passa `className`:
      // tira daqui, de propósito.
      className={clsx('pin-panel flex min-h-0 shrink-0 flex-col overflow-hidden', className)}
    >
      <div className="pin-panel-head">
        {titleAsMenu ? (
          <button
            type="button"
            ref={titleRef}
            onClick={onTitleClick}
            {...titleProps}
            className={clsx(TITLE_CLASS, TITLE_BUTTON_CLASS)}
          >
            <span className="truncate">{title}</span>
            {titleSuffix}
          </button>
        ) : disclosure ? (
          // Nome acessível = o título ("Prévia, recolhido"); o chevron ao lado
          // continua com o rótulo explícito ("Mostrar Prévia"), então os testes
          // e o leitor de tela não veem dois botões com o mesmo nome.
          <button
            type="button"
            aria-expanded={disclosure.open}
            onClick={() => disclosure.onOpenChange(!disclosure.open)}
            className={clsx(TITLE_CLASS, TITLE_BUTTON_CLASS)}
          >
            <span className="truncate">{shownTitle}</span>
            {collapsed ? null : titleSuffix}
          </button>
        ) : (
          <span className={clsx(TITLE_CLASS, 'px-1')}>
            {title}
            {titleSuffix}
          </span>
        )}
        {actions || collapsedActions || disclosure ? (
          <div className="flex shrink-0 items-center gap-1">
            {collapsed ? collapsedActions : actions}
            {disclosure ? (
              <button
                type="button"
                aria-expanded={disclosure.open}
                // Recolhido, o body DESMONTA: apontar para um id que não existe
                // é referência pendurada para o leitor de tela.
                aria-controls={disclosure.open ? bodyId : undefined}
                aria-label={disclosure.open ? disclosure.collapseLabel : disclosure.expandLabel}
                title={disclosure.open ? disclosure.collapseLabel : disclosure.expandLabel}
                onClick={() => disclosure.onOpenChange(!disclosure.open)}
                className="flex size-11 shrink-0 items-center justify-center rounded-xl text-pin-muted transition hover:bg-pin-border/40 hover:text-pin-text focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-pin-accent"
              >
                <ChevronDown
                  aria-hidden="true"
                  className={`size-5 transition-transform ${disclosure.open ? 'rotate-180' : ''}`}
                />
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
      {!disclosure || disclosure.open ? (
        <div id={bodyId} className={bodyClassName ?? 'flex min-h-0 flex-col gap-2 p-2'}>
          {children}
        </div>
      ) : null}
    </section>
  )
}
