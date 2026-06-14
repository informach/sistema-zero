'use client'

import { Spinner } from '@sistemazero/ui/spinner'
import dynamic from 'next/dynamic'

/**
 * Wrapper do editor rico (TipTap) compartilhado pelos apps de aluno. `dynamic({
 * ssr:false })` mantém o TipTap fora do bundle inicial e do SSR (evita mismatch).
 * I/O em Markdown — ver `rich-editor.impl`.
 */
export const RichEditor = dynamic(() => import('./rich-editor.impl'), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-28 items-center justify-center rounded-xl border-2 border-border">
      <Spinner />
    </div>
  ),
})
