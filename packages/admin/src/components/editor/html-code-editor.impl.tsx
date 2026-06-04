'use client'

import { html } from '@codemirror/lang-html'
import CodeMirror from '@uiw/react-codemirror'
import { useTheme } from 'next-themes'

/**
 * Editor de código do bloco interativo: CodeMirror 6 com highlight de HTML
 * (+ CSS/JS embutidos) e tema acompanhando o next-themes. Escolhido em vez do
 * Monaco: ~200KB vs ~5MB, sem web workers, suficiente p/ um campo de admin.
 */
export default function HtmlCodeEditorImpl({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const { resolvedTheme } = useTheme()
  return (
    <div className="overflow-hidden rounded-lg border border-input text-sm">
      <CodeMirror
        value={value}
        onChange={onChange}
        extensions={[html()]}
        theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
        minHeight="160px"
        maxHeight="420px"
        placeholder="<!-- HTML do conteúdo interativo (roda em iframe sandbox, largura total, 16:9) -->"
        basicSetup={{ foldGutter: false, highlightActiveLine: true }}
      />
    </div>
  )
}
