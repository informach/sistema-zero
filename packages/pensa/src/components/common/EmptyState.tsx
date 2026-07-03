import type { JSX, ReactNode } from 'react'

/** Estado vazio amigável: emoji grande + título + texto + ação opcional. */
export function EmptyState({
  emoji,
  title,
  body,
  action,
}: {
  emoji: string
  title: string
  body: string
  action?: ReactNode
}): JSX.Element {
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl border-2 border-dashed border-pz-border bg-pz-surface px-6 py-12 text-center">
      <span aria-hidden="true" className="text-5xl">
        {emoji}
      </span>
      <h2 className="text-xl font-bold text-pz-text">{title}</h2>
      <p className="max-w-md text-pz-muted">{body}</p>
      {action}
    </div>
  )
}
