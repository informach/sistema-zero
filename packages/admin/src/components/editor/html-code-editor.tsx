'use client'

import { Spinner } from '@sistemazero/ui/spinner'
import dynamic from 'next/dynamic'

/**
 * Wrapper do editor de código HTML (CodeMirror 6): `dynamic({ ssr: false })`
 * mantém o CodeMirror fora do bundle inicial e fora do SSR (mesmo padrão do
 * RichTextEditor/TipTap).
 */
export const HtmlCodeEditor = dynamic(() => import('./html-code-editor.impl'), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-40 items-center justify-center rounded-lg border border-input">
      <Spinner />
    </div>
  ),
})
