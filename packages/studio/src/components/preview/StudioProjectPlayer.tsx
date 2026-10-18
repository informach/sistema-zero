import { forwardRef, lazy, Suspense } from 'react'
import type { EditableStudioProject } from '../../core/editableProject'
import type { StudioProjectPlayerProps as JavaScriptPlayerProps } from './JavaScriptProjectPlayer'

export type { StudioPlayerOriginAdapter, StudioPlayerOriginRequest } from './playerOriginAdapter'

const JavaScriptPlayer = lazy(() =>
  import('./JavaScriptProjectPlayer').then((module) => ({
    default: module.JavaScriptProjectPlayer,
  })),
)
const PythonPlayer = lazy(() =>
  import('./PythonProjectPlayer').then((module) => ({ default: module.PythonProjectPlayer })),
)

export interface StudioProjectPlayerProps
  extends Omit<JavaScriptPlayerProps, 'project' | 'published' | 'onError'> {
  project: EditableStudioProject
  /** Python supplies a bounded runtime diagnostic; legacy JS may report no detail. */
  onError?(error?: Error): void
  published?:
    | JavaScriptPlayerProps['published']
    | { programmingLanguage: 'python'; playId: string; revision: string }
  /** Same-origin host callback; no subject/source/capabilities are sent by the player. */
  pythonRuntimeRequest?(
    input: { playId: string; publicationRevision: string },
    signal: AbortSignal,
  ): Promise<unknown>
}

/** Dispatch before loading either execution chain. */
export const StudioProjectPlayer = forwardRef<HTMLIFrameElement, StudioProjectPlayerProps>(
  function StudioProjectPlayer(props, ref) {
    const fallback = <p role="status">Carregando o jogo…</p>
    if (props.project.programmingLanguage === 'python') {
      return (
        <Suspense fallback={fallback}>
          <PythonPlayer {...props} project={props.project} ref={ref} />
        </Suspense>
      )
    }
    const published = props.published && 'url' in props.published ? props.published : undefined
    return (
      <Suspense fallback={fallback}>
        <JavaScriptPlayer {...props} project={props.project} published={published} ref={ref} />
      </Suspense>
    )
  },
)
