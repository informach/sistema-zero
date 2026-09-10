/**
 * Painel com CABEÇALHO: faixa de título tonal (.mld-panel-head) e o corpo
 * embaixo. O `aria-label` da `<section>` é o `title` por padrão.
 *
 * Com `disclosure` (redesenho da interface, 10/09/2026): o TÍTULO INTEIRO abre e
 * recolhe, não só o chevron, porque a faixa é um alvo bem maior que 44px para a
 * mão de uma criança. Recolhido, o painel esconde as `actions` (elas agiriam num
 * corpo fora de alcance) e mostra o `ariaLabel` no lugar do `title`, que é como
 * um painel recolhido diz o assunto e não o valor atual.
 */
import { clsx } from 'clsx'
import type { JSX, ReactNode } from 'react'
import { useId } from 'react'
import { ChevronDown } from './icons'

export interface PanelDisclosure {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Rótulo do chevron quando FECHADO. */
  expandLabel: string
  /** Rótulo do chevron quando ABERTO. */
  collapseLabel: string
}

export interface PanelProps {
  title: string
  ariaLabel?: string
  /** Botões à direita do título. Somem com o painel recolhido. */
  actions?: ReactNode
  /** O que ocupa o lugar das `actions` com o painel RECOLHIDO (ex.: uma miniatura viva). */
  collapsedActions?: ReactNode
  /** Recolher é CONTROLADO por quem monta a coluna: é ela que sabe o que cabe. */
  disclosure?: PanelDisclosure
  /** Layout EXTERNO do painel. */
  className?: string
  /** Padding e rolagem do CORPO. Default `flex flex-col gap-2 p-2`. */
  bodyClassName?: string
  children: ReactNode
}

const TITLE_CLASS =
  'mld-display min-w-0 flex-1 truncate text-left text-xs uppercase tracking-wide text-mld-text'

export function Panel({
  title,
  ariaLabel,
  actions,
  collapsedActions,
  disclosure,
  className,
  bodyClassName,
  children,
}: PanelProps): JSX.Element {
  const bodyId = useId()
  const collapsed = disclosure ? !disclosure.open : false
  const label = ariaLabel ?? title
  return (
    <section
      aria-label={label}
      // `shrink-0`: um painel nunca é ESPREMIDO pela coluna (a coluna rola; ver `.mld-scroll-y`).
      className={clsx('mld-panel flex min-h-0 shrink-0 flex-col overflow-hidden', className)}
    >
      <div className="mld-panel-head">
        {disclosure ? (
          <button
            type="button"
            aria-expanded={disclosure.open}
            aria-controls={bodyId}
            onClick={() => disclosure.onOpenChange(!disclosure.open)}
            className={clsx(
              TITLE_CLASS,
              'flex min-h-11 items-center rounded-lg px-1 hover:bg-mld-border/40',
              'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-mld-accent',
            )}
          >
            <span className="truncate">{collapsed ? label : title}</span>
          </button>
        ) : (
          <span className={TITLE_CLASS}>{title}</span>
        )}
        {actions || collapsedActions || disclosure ? (
          <div className="flex shrink-0 items-center gap-0.5">
            {collapsed ? collapsedActions : actions}
            {disclosure ? (
              <button
                type="button"
                aria-expanded={disclosure.open}
                aria-controls={bodyId}
                aria-label={disclosure.open ? disclosure.collapseLabel : disclosure.expandLabel}
                title={disclosure.open ? disclosure.collapseLabel : disclosure.expandLabel}
                onClick={() => disclosure.onOpenChange(!disclosure.open)}
                className={clsx(
                  'flex size-11 shrink-0 items-center justify-center rounded-xl text-mld-muted',
                  'transition hover:bg-mld-border/40 hover:text-mld-text',
                  'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-mld-accent',
                )}
              >
                <ChevronDown
                  aria-hidden="true"
                  className={clsx('size-5 transition-transform', disclosure.open && 'rotate-180')}
                />
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
      {/*
       * ⚠️⚠️ Recolhido, o corpo fica com o ATRIBUTO `hidden`: sai do alcance e da árvore de
       * acessibilidade, mas CONTINUA MONTADO. É uma divergência deliberada do Pinta, que
       * desmonta o corpo, e ela tem três razões:
       *   1. é o mesmo contrato do `WorkspaceInspector` deste pacote, que tem teste provando
       *      que o valor não commitado de um campo sobrevive a fechar e reabrir;
       *   2. hierarquizar a interface é RECOLHER, nunca desmontar: desmontar faria a criança
       *      perder o que estava escrevendo só porque um painel vizinho abriu;
       *   3. o inventário da oficina (`SceneWorkshop.contract.test.tsx`) prova que nada some,
       *      e desmontar viraria perda de verdade.
       * Se um dia aparecer custo MEDIDO de manter montado, aí vira opção, com o número junto.
       */}
      <div
        id={bodyId}
        hidden={collapsed}
        className={bodyClassName ?? 'flex min-h-0 flex-col gap-2 p-2'}
      >
        {children}
      </div>
    </section>
  )
}
