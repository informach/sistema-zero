import type { StudioProArtifact } from '@sistemazero/core/studio/pro-artifact'
import { forwardRef, lazy, Suspense } from 'react'
import type { EditableStudioProject, PythonProjectDocument } from '../../core/editableProject'
import type { StudioRuntimeEnvironment } from '../../runtime/environment'
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
const BuiltProPlayer = lazy(() =>
  import('./BuiltProPlayer').then((module) => ({ default: module.BuiltProPlayer })),
)

export interface StudioProjectPlayerProps
  extends Omit<JavaScriptPlayerProps, 'project' | 'published' | 'onError'> {
  project: EditableStudioProject
  /** Trusted host UI output preference; never read from learner source. */
  muted?: boolean
  /** Python supplies a bounded runtime diagnostic; legacy JS may report no detail. */
  onError?(error?: Error): void
  published?:
    | JavaScriptPlayerProps['published']
    | { programmingLanguage: 'python'; playId: string; revision: string }
  /**
   * A host-built Python environment for a project that is not a community publication (the
   * Arquipélago minigame plays the approved challenge solution under the challenge's own runtime
   * authorization). When present, `published` and `pythonRuntimeRequest` are not used.
   */
  pythonRuntimeEnvironment?(
    project: PythonProjectDocument,
    signal: AbortSignal,
  ): Promise<StudioRuntimeEnvironment>
  /**
   * A host build for a Pro project that is not a community publication (the Arquipélago minigame
   * builds the approved challenge solution through the challenge's Pro route). The player shows the
   * returned artifact; without it, a Pro project needs `published`.
   */
  proBuild?(project: EditableStudioProject, signal: AbortSignal): Promise<StudioProArtifact>
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
    if (props.project.kind === 'pro' && props.proBuild)
      return (
        <Suspense fallback={fallback}>
          <BuiltProPlayer
            project={props.project}
            title={props.title}
            build={props.proBuild}
            onError={props.onError}
          />
        </Suspense>
      )
    const published = props.published && 'url' in props.published ? props.published : undefined
    return (
      <Suspense fallback={fallback}>
        <JavaScriptPlayer {...props} project={props.project} published={published} ref={ref} />
      </Suspense>
    )
  },
)
