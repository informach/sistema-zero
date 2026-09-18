import type { JSX, KeyboardEvent, ReactNode } from 'react'
import type { ProjectAsset } from '#core'
import { cn } from '#ui'
import type { AssetsTab } from '../../../state/uiStore'

/** O que as três abas de "Materiais do jogo" compartilham. */
export interface AssetsTabCommon {
  /** Renomear comita no blur (e no Enter, que faz blur). */
  onRename: (asset: ProjectAsset, value: string) => void
  onDelete: (asset: ProjectAsset) => void
}

export interface AssetsTabItem {
  id: AssetsTab
  label: string
  icon: string
}

/**
 * A tira de abas da janela dos materiais (padrão WAI-ARIA Tabs: roving tabIndex,
 * setas/Home/End, `aria-controls`).
 *
 * ⚠️ NÃO reusa o `Tabs` de `components/layout/TabStrip.tsx` de propósito: aquele é
 * para painel de ALTURA FIXA e mantém todos os filhos montados para preservar
 * estado caro (xterm, Monaco, Blockly, o iframe do preview). Aqui o corpo é a área
 * rolável de um `<dialog>`, e `h-full` + `overflow-hidden` cortariam a lista; e
 * remontar uma lista de assets não custa nada.
 */
export function AssetsTabStrip({
  items,
  active,
  onSelect,
  baseId,
}: {
  items: AssetsTabItem[]
  active: AssetsTab
  onSelect: (tab: AssetsTab) => void
  baseId: string
}): JSX.Element {
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
    document.getElementById(`${baseId}-tab-${nextId}`)?.focus()
  }

  return (
    <div role="tablist" aria-label="Tipo de material" className="flex border-b border-sz-border">
      {items.map((item, index) => {
        const selected = active === item.id
        return (
          <button
            key={item.id}
            id={`${baseId}-tab-${item.id}`}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={`${baseId}-panel-${item.id}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onSelect(item.id)}
            onKeyDown={(e) => onKeyDown(e, index)}
            style={{ touchAction: 'manipulation' }}
            className={cn(
              'sz-touch-target inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3.5 py-2.5 text-sm font-medium transition-colors',
              selected
                ? 'border-sz-accent text-sz-fg'
                : 'border-transparent text-sz-fg-soft hover:text-sz-fg',
            )}
          >
            <span aria-hidden>{item.icon}</span>
            {item.label}
          </button>
        )
      })}
    </div>
  )
}

/** O campo de nome do asset, igual nas três abas (o NOME é o que os blocos referenciam). */
export function AssetNameInput({
  asset,
  what,
  onRename,
  className,
}: {
  asset: ProjectAsset
  /** "a imagem", "o som", "o modelo 3D" — entra no nome acessível do campo. */
  what: string
  onRename: AssetsTabCommon['onRename']
  className?: string
}): JSX.Element {
  return (
    <input
      name={`asset-name-${asset.id}`}
      autoComplete="off"
      defaultValue={asset.name}
      spellCheck={false}
      aria-label={`Nome d${what} ${asset.name}`}
      className={cn(
        'rounded border border-sz-border bg-sz-bg px-1.5 py-0.5 font-mono text-xs text-sz-fg outline-none focus:border-sz-accent',
        className,
      )}
      onBlur={(e) => onRename(asset, e.target.value.trim())}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
      }}
    />
  )
}

/** "Excluir" — o mesmo gesto e o mesmo peso visual nas três abas. */
export function DeleteAssetButton({
  asset,
  onDelete,
}: {
  asset: ProjectAsset
  onDelete: AssetsTabCommon['onDelete']
}): JSX.Element {
  return (
    <button
      type="button"
      className="text-xs text-red-400 hover:underline"
      onClick={() => onDelete(asset)}
    >
      Excluir
    </button>
  )
}

/** A linha de um asset que não tem miniatura (som, modelo, céu). */
export function AssetRow({ children }: { children: ReactNode }): JSX.Element {
  return (
    <li className="flex items-center gap-2 rounded-md border border-sz-border bg-sz-panel-soft p-2">
      {children}
    </li>
  )
}

/** O aviso de "ainda não tem nada aqui" — sempre dizendo o PRÓXIMO passo. */
export function EmptyHint({ children }: { children: ReactNode }): JSX.Element {
  return <p className="text-sm text-sz-fg-soft">{children}</p>
}
