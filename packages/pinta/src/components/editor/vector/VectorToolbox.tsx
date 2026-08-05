/**
 * Caixa de ferramentas do editor VETORIAL: ferramentas em GRADE de duas
 * colunas + o "Ajustar" (zoom-to-fit); o zoom numérico fica no rodapé da tela.
 */
import type { JSX } from 'react'
import { COPY } from '../../../core/copy'
import { ToolButton } from '../../ui/Button'
import { Maximize } from '../../ui/icons'
import { useVectorEditor } from './VectorEditorScope'
import { TOOLS } from './vectorTools'

export function VectorToolbox(): JSX.Element {
  const { tool, setTool, zoomToFit } = useVectorEditor()
  return (
    <div
      role="toolbar"
      aria-label={COPY.a11y.tools}
      aria-orientation="vertical"
      className="pin-panel grid shrink-0 grid-cols-2 content-start justify-items-center gap-1 overflow-y-auto p-2"
    >
      {TOOLS.map((entry) => (
        <ToolButton
          key={entry.id}
          icon={entry.icon}
          label={entry.label}
          shortcut={entry.shortcut}
          active={tool === entry.id}
          onClick={() => setTool(entry.id)}
        />
      ))}
      <hr className="col-span-2 my-1 w-8 border-pin-border" />
      <ToolButton icon={Maximize} label={COPY.editor.zoomFit} onClick={zoomToFit} />
    </div>
  )
}
