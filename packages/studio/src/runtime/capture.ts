import { copyStudioProjectJson } from '@sistemazero/core/studio/project-json'
import type { PythonProjectDocument } from '../core/editableProject'
import { samePythonExecutionIdentity } from './python/frameProtocol'
import { readStudioRuntimeImage } from './snapshotImage'
import type { StudioExecutionIdentity, StudioRuntimeSnapshot } from './types'

interface CaptureOwner {
  identity(): StudioExecutionIdentity | undefined
  capture(): Promise<StudioRuntimeSnapshot | null>
}
/** Per Studio instance. A sibling editor with the same project id has no access to this cache. */
export function createStudioRuntimeCapture(now: () => number = Date.now) {
  let owner: CaptureOwner | undefined
  let epoch = 0
  let cached: { snapshot: StudioRuntimeSnapshot; at: number } | undefined
  function remember(candidate: StudioRuntimeSnapshot): boolean {
    const identity = owner?.identity()
    const image = readStudioRuntimeImage(candidate)
    if (!identity || !image || !samePythonExecutionIdentity(identity, candidate.identity))
      return false
    if (
      cached &&
      samePythonExecutionIdentity(cached.snapshot.identity, identity) &&
      cached.snapshot.frameSequence > image.frameSequence
    )
      return false
    cached = { snapshot: { ...image, identity: { ...identity } }, at: now() }
    return true
  }
  return {
    register(next: CaptureOwner) {
      if (owner) throw new Error('Já existe uma pré-visualização nesta instância do estúdio.')
      owner = next
      return () => {
        if (owner === next) owner = undefined
      }
    },
    remember,
    async capture(project: PythonProjectDocument): Promise<string | null> {
      const capturedEpoch = epoch
      const captured = copyStudioProjectJson(project)
      const { preparePythonExecutionSnapshot } = await import('./python/snapshot')
      const expected = await preparePythonExecutionSnapshot(captured)
      if (epoch !== capturedEpoch) return null
      const matches = (identity: StudioExecutionIdentity) =>
        identity.projectId === expected.projectId &&
        identity.revision === expected.revision &&
        identity.runtimeManifestSha256 === expected.configuration.runtime.manifestSha256
      const current = owner
      const identity = current?.identity()
      if (current && identity && matches(identity)) {
        try {
          const snapshot = await current.capture()
          if (snapshot && owner === current && epoch === capturedEpoch) remember(snapshot)
        } catch {
          /* A stopped preview may still have a verified, recent image of this source. */
        }
      }
      return epoch === capturedEpoch &&
        cached &&
        now() - cached.at <= 5 * 60_000 &&
        matches(cached.snapshot.identity)
        ? cached.snapshot.dataUrl
        : null
    },
    clear() {
      epoch++
      cached = undefined
    },
  }
}
export type StudioRuntimeCapture = ReturnType<typeof createStudioRuntimeCapture>
