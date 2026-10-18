import type { JSX } from 'react'
import { Suspense } from 'react'
import type { IDEMode } from '#core'
import { ErrorBoundary } from '#ui'
import { isPythonProject } from '../../core/editableProject'
// Lazy imports por modo — Blockly não baixa até o aluno entrar em Blocos ou
// Ponte; Monaco não baixa até entrar em Ponte ou Código.
import { BlocksMode, BridgeMode, CodeMode, PythonMode } from '../../modes/lazyModes'
import { useProjectStore } from '../../state/projectStore'
import { SectionErrorFallback } from './ErrorViews'
import { EditorSkeleton } from './LoadingViews'

function ModeFallback({ name }: { name: string }): JSX.Element {
  return <EditorSkeleton message={`Carregando modo ${name}…`} />
}

export interface ModeAreaProps {
  projectMode: IDEMode
  projectId: string | undefined
}

/**
 * Área do editor: escolhe o modo (Blocos/Ponte/Código), com Suspense por modo e
 * um ErrorBoundary que reseta ao trocar de modo/projeto. Compartilhada pelo
 * layout wide (dentro do split vertical) e pelo NarrowLayout (altura cheia) — em
 * ambos, cada modo decide internamente como se desenha (wide × abas) lendo
 * `useStudioLayout`.
 */
export function ModeArea({ projectMode, projectId }: ModeAreaProps): JSX.Element {
  const python = useProjectStore((state) => !!state.project && isPythonProject(state.project))
  return (
    <ErrorBoundary
      label={`modo ${projectMode}`}
      resetKeys={[projectMode, projectId, python]}
      fallback={(p) => <SectionErrorFallback {...p} title="Não foi possível carregar o editor" />}
    >
      {projectMode === 'blocks' && (
        <Suspense fallback={<ModeFallback name="Blocos" />}>
          {python ? <PythonMode mode="blocks" /> : <BlocksMode />}
        </Suspense>
      )}
      {projectMode === 'bridge' && (
        <Suspense fallback={<ModeFallback name="Ponte" />}>
          {python ? <PythonMode mode="bridge" /> : <BridgeMode />}
        </Suspense>
      )}
      {projectMode === 'code' && (
        <Suspense fallback={<ModeFallback name="Código" />}>
          {python ? <PythonMode mode="code" /> : <CodeMode />}
        </Suspense>
      )}
    </ErrorBoundary>
  )
}
