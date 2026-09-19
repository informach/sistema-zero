'use client'

import { PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from 'lucide-react'
import type { CSSProperties } from 'react'
import { cn } from '../../lib/cn'

interface EdgePanelHandleProps {
  side: 'left' | 'right'
  open: boolean
  /** A mesma largura CSS usada pelo painel, inclusive nos breakpoints. */
  openOffset: string
  label: string
  controlsId: string
  onToggle: () => void
  className?: string
}

/** Controle visual preso à borda de um painel lateral, sem estado próprio. */
export function EdgePanelHandle({
  side,
  open,
  openOffset,
  label,
  controlsId,
  onToggle,
  className,
}: EdgePanelHandleProps) {
  const Icon =
    side === 'left'
      ? open
        ? PanelLeftClose
        : PanelLeftOpen
      : open
        ? PanelRightClose
        : PanelRightOpen
  const position: CSSProperties =
    side === 'left' ? { left: open ? openOffset : 0 } : { right: open ? openOffset : 0 }

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      aria-controls={controlsId}
      aria-pressed={!open}
      data-side={side}
      data-open={open}
      style={position}
      className={cn(
        'fixed top-[5.75rem] z-[42] flex h-11 w-9 items-center justify-center border border-transparent shadow-md transition-[left,right] duration-300 ease-in-out hover:brightness-110 active:brightness-95 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
        side === 'left' ? 'rounded-r-xl border-l-0' : 'rounded-l-xl border-r-0',
        className,
      )}
    >
      <Icon className="size-5" aria-hidden />
    </button>
  )
}
