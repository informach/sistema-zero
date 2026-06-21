import type { JSX } from 'react'
import type { IDEMode } from '#core'
import { ActivityPanel } from './ActivityPanel'
import { ModeArea } from './ModeArea'

export interface NarrowLayoutProps {
  projectMode: IDEMode
  projectId: string | undefined
}

/**
 * Layout NARROW do Studio (largura do componente abaixo de
 * `STUDIO_NARROW_MAX_PX`). Não há split nem barra inferior separada: a área do
 * modo ocupa a altura toda e CADA modo monta sua própria tira de abas
 * (`NarrowPanels`) — que já embute Pré-visualização e Console/Terminal/IA. O
 * Shell renderiza isto no lugar do split vertical quando `isNarrow`.
 *
 * O `ActivityPanel` é self-gating (null sem atividade) e responsivo: no narrow
 * ele se desenha como faixa NO TOPO (altura limitada), acima do modo — sem isso
 * o aluno em tela estreita ficava sem enunciado nem "Verificar" (6º review, A).
 */
export function NarrowLayout({ projectMode, projectId }: NarrowLayoutProps): JSX.Element {
  return (
    <main className="flex min-h-0 flex-1 flex-col">
      {/* `key` por projeto: remonta a subárvore do modo ao trocar de projeto
          (mesma razão do layout wide). */}
      <div key={projectId} className="flex h-full min-h-0 w-full flex-col">
        <ActivityPanel />
        <div className="min-h-0 flex-1">
          <ModeArea projectMode={projectMode} projectId={projectId} />
        </div>
      </div>
    </main>
  )
}
