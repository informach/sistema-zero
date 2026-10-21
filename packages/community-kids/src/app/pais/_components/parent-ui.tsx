'use client'

import { MoreHorizontal } from 'lucide-react'
import Link from 'next/link'
import { type ReactNode, useEffect, useId, useRef, useState } from 'react'
import { cn } from '@/lib/cn'

/**
 * As peças de desenho da área dos pais (11/10/2026): o mesmo idioma das telas da criança
 * (cartão branco de 24px, Baloo nos títulos, a cor de ação), num registro mais calmo. Toda
 * página da área usa estas peças, para os títulos, as partes e os selos terem UMA cara só.
 */

// As classes dos botões moram num módulo sem `'use client'` (ver o porquê lá); o reexport serve
// aos componentes de cliente.
export { PRIMARY_ACTION, SECONDARY_ACTION } from './parent-actions'

export function ParentPageTitle({
  title,
  text,
  action,
  id,
}: {
  title: string
  text?: ReactNode
  action?: ReactNode
  id?: string
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        <h1 id={id} className="sz-display text-[clamp(2rem,3.2vw,2.6rem)] leading-tight">
          {title}
        </h1>
        {text ? <p className="mt-2 text-[1.0625rem] text-muted-foreground">{text}</p> : null}
      </div>
      {action}
    </div>
  )
}

export function ParentSection({
  title,
  action,
  children,
  id,
  className,
}: {
  title: string
  action?: ReactNode
  children: ReactNode
  id?: string
  className?: string
}) {
  const fallback = useId()
  const headingId = id ?? fallback
  return (
    <section aria-labelledby={headingId} className={cn('flex flex-col gap-4', className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={headingId} className="sz-display text-[1.375rem]">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  )
}

export type ChipTone = 'ok' | 'attention' | 'neutral' | 'danger'

const CHIP_TONE: Record<ChipTone, string> = {
  ok: 'bg-(--band-menta) text-(--success-foreground)',
  attention: 'bg-(--band-amarelo) text-foreground',
  neutral: 'bg-muted text-muted-foreground',
  danger: 'bg-destructive/10 text-destructive',
}

/** O selo de estado: sempre com ícone e palavra (a cor nunca é a única pista). */
export function StatusChip({
  tone,
  icon: Icon,
  children,
  className,
}: {
  tone: ChipTone
  icon: typeof MoreHorizontal
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-bold text-xs',
        CHIP_TONE[tone],
        className,
      )}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      {children}
    </span>
  )
}

/** Um número grande com o rótulo embaixo (dias seguidos, XP, medalhas…). */
export function StatTile({
  icon: Icon,
  value,
  label,
  color,
}: {
  icon: typeof MoreHorizontal
  value: ReactNode
  label: string
  color: string
}) {
  return (
    <div className="flex min-w-0 flex-col items-start gap-0.5 rounded-2xl bg-background px-3 py-2.5">
      <span className="flex items-center gap-1.5 font-extrabold text-foreground text-lg tabular-nums">
        <Icon className="size-4 shrink-0" style={{ color }} aria-hidden="true" />
        {value}
      </span>
      <span className="text-muted-foreground text-xs">{label}</span>
    </div>
  )
}

/** O nível da jornada, na cor dele (a mesma das telas da criança). */
export function LevelChip({
  label,
  color,
  icon: Icon,
}: {
  label: string
  color: string
  icon: typeof MoreHorizontal
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-bold text-xs"
      style={{ background: `color-mix(in oklab, ${color} 12%, transparent)`, color }}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {label}
    </span>
  )
}

export type MenuItem =
  | { label: string; href: string; icon?: typeof MoreHorizontal }
  | {
      label: string
      onSelect: () => void
      icon?: typeof MoreHorizontal
      tone?: 'danger'
      disabled?: boolean
    }

/**
 * O menu "⋯" (e o da conta). Esc, o clique fora e o foco saindo fecham; setas, Home e End andam
 * entre os itens; o foco vai ao primeiro item ao abrir e volta ao botão ao fechar. Itens com
 * destino são links de verdade.
 *
 * ⚠️ Escolher um item devolve o foco ao botão ANTES de rodar a ação: a ação costuma abrir um
 * diálogo, que guarda quem tinha o foco para devolver ao fechar. Com o foco no item (que
 * desmonta junto com o menu), ele caía no `body` quando o diálogo fechava.
 */
export function OptionsMenu({
  label,
  items,
  trigger,
  align = 'end',
  triggerClassName,
}: {
  /** O nome acessível do botão ("Mais opções de Lipe"). */
  label: string
  items: MenuItem[]
  /** O que o botão mostra (o padrão é o "⋯"). */
  trigger?: ReactNode
  align?: 'start' | 'end'
  triggerClassName?: string
}) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const menuId = useId()
  useEffect(() => {
    if (!open) return
    root.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus()
    const onPointer = (event: MouseEvent) => {
      if (root.current && !root.current.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        button.current?.focus()
        return
      }
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
      const options = [
        ...(root.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)') ?? []),
      ]
      if (!options.length) return
      event.preventDefault()
      const at = options.indexOf(document.activeElement as HTMLElement)
      const next =
        event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? options.length - 1
            : event.key === 'ArrowDown'
              ? (at + 1) % options.length
              : (at - 1 + options.length) % options.length
      options[next]?.focus()
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])
  const itemClass =
    'flex min-h-11 w-full items-center gap-2.5 rounded-xl px-3 text-left font-semibold text-sm hover:bg-(--band-ceu) focus-visible:bg-(--band-ceu) focus-visible:outline-none disabled:opacity-50'
  return (
    <div
      ref={root}
      className="relative"
      onBlur={(event) => {
        // O Tab que sai do menu fecha o menu (ficava aberto sobre a página).
        if (open && !root.current?.contains(event.relatedTarget as Node | null)) setOpen(false)
      }}
    >
      <button
        ref={button}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          'flex min-h-11 min-w-11 items-center justify-center rounded-full text-muted-foreground hover:bg-(--band-ceu) hover:text-foreground',
          triggerClassName,
        )}
      >
        {trigger ?? <MoreHorizontal className="size-5" aria-hidden="true" />}
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label={label}
          className={cn(
            'absolute top-full z-40 mt-2 flex w-60 flex-col gap-0.5 rounded-2xl border border-(--linha-carta) bg-card p-1.5 shadow-(--sombra-carta-sm)',
            align === 'end' ? 'right-0' : 'left-0',
          )}
        >
          {items.map((item) => {
            const Icon = item.icon
            const content = (
              <>
                {Icon ? <Icon className="size-4 shrink-0" aria-hidden="true" /> : null}
                {item.label}
              </>
            )
            return 'href' in item ? (
              <Link
                key={item.label}
                href={item.href}
                role="menuitem"
                className={itemClass}
                onClick={() => setOpen(false)}
              >
                {content}
              </Link>
            ) : (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                className={cn(itemClass, item.tone === 'danger' && 'text-destructive')}
                onClick={() => {
                  setOpen(false)
                  button.current?.focus()
                  item.onSelect()
                }}
              >
                {content}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
