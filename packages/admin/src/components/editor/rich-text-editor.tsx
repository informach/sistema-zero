'use client'

import { Spinner } from '@sistemazero/ui/spinner'
import dynamic from 'next/dynamic'

/**
 * Wrapper do editor TipTap: `dynamic({ ssr: false })` mantém o TipTap (~200KB)
 * fora do bundle inicial e fora do SSR (evita mismatch de hidratação).
 */
export const RichTextEditor = dynamic(() => import('./rich-text-editor.impl'), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-40 items-center justify-center rounded-lg border border-input">
      <Spinner />
    </div>
  ),
})
