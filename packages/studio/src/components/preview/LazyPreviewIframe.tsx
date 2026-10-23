import { lazy, Suspense } from 'react'
import { EditorSkeleton } from '../layout/LoadingViews'

const Preview = lazy(() =>
  import('./PreviewIframe').then((module) => ({ default: module.PreviewIframe })),
)

/** Hosts with preview disabled do not load the iframe renderer or its controls. */
export function PreviewIframe() {
  return (
    <Suspense fallback={<EditorSkeleton message="Carregando pré-visualização…" />}>
      <Preview />
    </Suspense>
  )
}
