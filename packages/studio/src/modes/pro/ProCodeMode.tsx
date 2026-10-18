import { lazy, Suspense } from 'react'
import { EditorSkeleton } from '../../components/layout/LoadingViews'
import { ProCodeEditor } from './ProCodeEditor'
import { ProWebContainerProvider } from './ProWebContainerProvider'
import { ProWorkspace } from './ProWorkspace'

const ProPreview = lazy(() =>
  import('./ProPreview').then((module) => ({ default: module.ProPreview })),
)

/** JavaScript keeps its WebContainer lifecycle; only its workspace shell is shared. */
export function ProCodeMode() {
  return (
    <ProWebContainerProvider>
      <ProWorkspace
        Editor={ProCodeEditor}
        preview={
          <Suspense fallback={<EditorSkeleton message="Carregando pré-visualização…" />}>
            <ProPreview />
          </Suspense>
        }
      />
    </ProWebContainerProvider>
  )
}
