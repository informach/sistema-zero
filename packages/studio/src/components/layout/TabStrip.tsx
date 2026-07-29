import type { JSX, KeyboardEvent, ReactNode } from 'react'
import { useId, useRef } from 'react'
import { cn } from '#ui'

export interface TabItem {
  id: string
  label: ReactNode
  icon?: ReactNode
}

export interface TabsProps {
  items: TabItem[]
  active: string
  onSelect: (id: string) => void
  /**
   * Conteúdo de cada aba. TODOS ficam MONTADOS e só alternam visibilidade via
   * `hidden` — preserva estado caro (xterm/jsh do Terminal, scrollback, Monaco,
   * Blockly, iframe do preview) ao trocar de aba.
   */
  renderPanel: (id: string) => ReactNode
  /**
   * Painéis que devem seguir RENDERIZADOS (compostos, dentro da viewport) quando
   * INATIVOS — mascarados por `opacity:0` em vez de `display:none`. Necessário para
   * o PREVIEW: o navegador PAUSA o `requestAnimationFrame` de um iframe não
   * renderizado (`display:none`), então o loop de jogo não roda e um erro de runtime
   * DENTRO do loop só apareceria no Console depois de abrir a aba Pré-visualização.
   * Mantendo o preview vivo (opacity:0, inerte, atrás da aba ativa), o loop continua
   * rodando e os erros chegam ao Console em tempo real. Mesmo motivo do rAF em
   * `cover/coverCapture.ts`. Ausente (ex.: BottomPanel wide) = comportamento idêntico
   * ao anterior (todo inativo vira `display:none`).
   */
  keepLiveIds?: ReadonlySet<string>
  ariaLabel: string
  size?: 'sm' | 'md'
  className?: string
  tablistClassName?: string
  /** Mantém a estrutura dos painéis, mas omite a barra quando só existe uma aba. */
  hideTablistWhenSingle?: boolean
  /**
   * Conteúdo fixo à direita da fila de abas (ex.: botão "Arquivos" do
   * NarrowLayout). Fica FORA do `role="tablist"` — não é uma aba — mas na mesma
   * linha do cabeçalho.
   */
  rightSlot?: ReactNode
}

/**
 * Abas WAI-ARIA reutilizáveis (roving tabindex + setas/Home/End). Extraído do
 * BottomPanel para servir também ao NarrowLayout. O atributo `hidden` (além da
 * classe) tira o painel inativo da árvore de acessibilidade.
 */
export function Tabs({
  items,
  active,
  onSelect,
  renderPanel,
  ariaLabel,
  size = 'sm',
  className,
  tablistClassName,
  hideTablistWhenSingle = false,
  rightSlot,
  keepLiveIds,
}: TabsProps): JSX.Element {
  const baseId = useId()
  const tabId = (id: string) => `${baseId}-tab-${id}`
  const panelId = (id: string) => `${baseId}-panel-${id}`
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const hasTablist = !hideTablistWhenSingle || items.length > 1 || Boolean(rightSlot)

  // Roving tabIndex: uma parada de Tab no tablist; setas movem foco E seleção.
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next: number | null = null
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (index + 1) % items.length
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp')
      next = (index - 1 + items.length) % items.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = items.length - 1
    if (next === null) return
    e.preventDefault()
    const nextId = items[next]?.id
    if (!nextId) return
    onSelect(nextId)
    tabRefs.current[nextId]?.focus()
  }

  return (
    <div className={cn('flex h-full min-h-0 flex-col', className)}>
      {hasTablist && (
        <div key="tabs-header" className="flex shrink-0 border-b border-sz-border">
          <div
            role="tablist"
            aria-label={ariaLabel}
            className={cn('flex flex-1 overflow-x-auto', tablistClassName)}
          >
            {items.map((item, index) => {
              const selected = active === item.id
              return (
                <button
                  key={item.id}
                  id={tabId(item.id)}
                  ref={(el) => {
                    tabRefs.current[item.id] = el
                  }}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls={panelId(item.id)}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => onSelect(item.id)}
                  onKeyDown={(e) => onKeyDown(e, index)}
                  style={{ touchAction: 'manipulation' }}
                  className={cn(
                    'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 font-medium transition-colors',
                    size === 'md' ? 'px-3.5 py-2.5 text-sm' : 'px-3 py-2 text-xs',
                    selected
                      ? 'border-sz-accent text-sz-fg'
                      : 'border-transparent text-sz-fg-soft hover:text-sz-fg',
                  )}
                >
                  {item.icon && (
                    <span className="flex h-4 w-4 items-center justify-center">{item.icon}</span>
                  )}
                  {item.label}
                </button>
              )
            })}
          </div>
          {rightSlot && <div className="flex shrink-0 items-center">{rightSlot}</div>}
        </div>
      )}
      <div
        key="tabs-panels"
        className={cn('min-h-0 flex-1 overflow-hidden', keepLiveIds && 'relative')}
      >
        {items.map((item) => {
          const selected = active === item.id
          // Inativo mas VIVO: fica renderizado (rAF do preview segue rodando), porém
          // imperceptível (opacity:0), inerte (fora do foco/hit-test) e sobreposto SEM
          // interferir (pointer-events:none) — a aba ativa aparece por cima. Só quando
          // o chamador marca o painel em `keepLiveIds`; senão, inativo = `display:none`.
          const keepLive = !selected && (keepLiveIds?.has(item.id) ?? false)
          return (
            <div
              key={item.id}
              role="tabpanel"
              id={panelId(item.id)}
              aria-labelledby={hasTablist ? tabId(item.id) : undefined}
              aria-label={hasTablist ? undefined : ariaLabel}
              // `inert` (React 19) tira o painel vivo-oculto do foco e da árvore de
              // acessibilidade sem `display:none` (que pausaria o rAF).
              inert={keepLive}
              hidden={!selected && !keepLive}
              className={
                selected
                  ? 'h-full'
                  : keepLive
                    ? 'pointer-events-none absolute inset-0 opacity-0'
                    : 'hidden'
              }
            >
              {renderPanel(item.id)}
            </div>
          )
        })}
      </div>
    </div>
  )
}
