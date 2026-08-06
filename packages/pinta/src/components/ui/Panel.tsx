import { clsx } from 'clsx'
import type {
  ButtonHTMLAttributes,
  JSX,
  MouseEvent as ReactMouseEvent,
  ReactNode,
  Ref,
} from 'react'

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
 */
export interface PanelProps {
  /** Texto da faixa de título. */
  title: string
  /** Rótulo acessível da seção. Default: o `title`. */
  ariaLabel?: string
  /** Botões à direita do título (lixeira, "+", zoom…). */
  actions?: ReactNode
  /**
   * Torna o título um BOTÃO (o disclosure "Arcade ∨" da paleta). Recebe o
   * evento porque quem abre um menu ancorado precisa medir o gatilho.
   */
  onTitleClick?: (event: ReactMouseEvent<HTMLButtonElement>) => void
  titleRef?: Ref<HTMLButtonElement>
  titleProps?: ButtonHTMLAttributes<HTMLButtonElement>
  /** Sufixo do título (ex.: o chevron do dropdown, uma pílula de contagem). */
  titleSuffix?: ReactNode
  /** Layout EXTERNO do painel (w-68, flex, shrink-0…). */
  className?: string
  /** Padding e rolagem do CORPO. Default `flex flex-col gap-2 p-2`. */
  bodyClassName?: string
  children: ReactNode
}

const TITLE_CLASS =
  'pin-display min-w-0 flex-1 truncate text-left text-xs uppercase tracking-wide text-pin-text'

export function Panel({
  title,
  ariaLabel,
  actions,
  onTitleClick,
  titleRef,
  titleProps,
  titleSuffix,
  className,
  bodyClassName,
  children,
}: PanelProps): JSX.Element {
  return (
    <section
      aria-label={ariaLabel ?? title}
      // `overflow-hidden` p/ a faixa respeitar o raio de 1rem do .pin-panel.
      className={clsx('pin-panel flex min-h-0 flex-col overflow-hidden', className)}
    >
      <div className="pin-panel-head">
        {onTitleClick ? (
          <button
            type="button"
            ref={titleRef}
            onClick={onTitleClick}
            {...titleProps}
            className={clsx(
              TITLE_CLASS,
              'flex min-h-11 items-center gap-1 rounded-lg px-1 hover:bg-pin-border/40 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-pin-accent',
            )}
          >
            <span className="truncate">{title}</span>
            {titleSuffix}
          </button>
        ) : (
          <span className={clsx(TITLE_CLASS, 'px-1')}>
            {title}
            {titleSuffix}
          </span>
        )}
        {actions ? <div className="flex shrink-0 items-center gap-1">{actions}</div> : null}
      </div>
      <div className={bodyClassName ?? 'flex min-h-0 flex-col gap-2 p-2'}>{children}</div>
    </section>
  )
}
