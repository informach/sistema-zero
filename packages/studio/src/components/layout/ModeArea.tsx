import type { JSX } from 'react'
import { Suspense } from 'react'
import type { IDEMode } from '#core'
import { ErrorBoundary } from '#ui'
// Lazy imports por modo — Blockly não baixa até o aluno entrar em Blocos ou
// Ponte; Monaco não baixa até entrar em Ponte ou Código.
import { BlocksMode, BridgeMode, CodeMode } from '../../modes/lazyModes'
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
  return (
    <ErrorBoundary
      label={`modo ${projectMode}`}
      resetKeys={[projectMode, projectId]}
      fallback={(p) => <SectionErrorFallback {...p} title="Não foi possível carregar o editor" />}
    >
      {projectMode === 'blocks' && (
        <Suspense fallback={<ModeFallback name="Blocos" />}>
          <BlocksMode />
        </Suspense>
      )}
      {projectMode === 'bridge' && (
        <Suspense fallback={<ModeFallback name="Ponte" />}>
          <BridgeMode />
        </Suspense>
      )}
      {projectMode === 'code' && (
        <Suspense fallback={<ModeFallback name="Código" />}>
          <CodeMode />
        </Suspense>
      )}
    </ErrorBoundary>
  )
}
