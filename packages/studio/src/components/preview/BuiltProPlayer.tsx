import { isStudioProArtifact, type StudioProArtifact } from '@sistemazero/core/studio/pro-artifact'
import { useEffect, useState } from 'react'
import type { EditableStudioProject } from '../../core/editableProject'
import { ProArtifactPreview } from '../../modes/pro/ProArtifactPreview'

export interface BuiltProPlayerProps {
  project: EditableStudioProject
  title?: string
  /**
   * The host builds the project under an authorization it already holds (the Arquipélago
   * minigame builds the approved challenge solution through the challenge's own Pro route) and
   * returns the server-issued artifact. The player never builds or runs a WebContainer itself.
   */
  build(project: EditableStudioProject, signal: AbortSignal): Promise<StudioProArtifact>
  onError?(error?: Error): void
}

/** Plays a Pro project from a host-built artifact, in the sandboxed artifact frame. */
export function BuiltProPlayer({ project, title, build, onError }: BuiltProPlayerProps) {
  const [artifact, setArtifact] = useState<StudioProArtifact | null>(null)
  const [failure, setFailure] = useState<string | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    setArtifact(null)
    setFailure(null)
    build(project, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return
        if (!isStudioProArtifact(result)) throw new Error('A compilação não devolveu o jogo.')
        setArtifact(result)
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        const err = error instanceof Error ? error : new Error('Não foi possível compilar o jogo.')
        setFailure(err.message)
        onError?.(err)
      })
    return () => controller.abort()
  }, [project, build, onError])
  if (failure)
    return (
      <p role="alert" className="p-4 text-sm">
        {failure}
      </p>
    )
  if (!artifact) return <p role="status">Preparando o jogo…</p>
  return (
    <ProArtifactPreview
      artifact={artifact}
      identity={`built:${project.id}`}
      title={title ?? 'Jogo'}
      recoveryHint="Feche e abra o jogo de novo."
    />
  )
}
