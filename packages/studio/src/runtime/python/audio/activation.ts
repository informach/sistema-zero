import type { ProjectAsset } from '../../../core/projectAssets'

/** A captured media asset needs an explicit Run/Jogar gesture before native browser playback. */
export function pythonProjectNeedsAudioGesture(project: {
  assets?: readonly Pick<ProjectAsset, 'kind'>[]
}) {
  return project.assets?.some((asset) => asset.kind === 'audio') ?? false
}
