/**
 * Runtimes que são donos exclusivos do palco/canvas do preview. Manter a lista
 * centralizada evita relações de conflito assimétricas entre extensões.
 */
export const FULLSCREEN_RUNTIME_EXTENSION_IDS = [
  'game-2d',
  'game-2d-advanced',
  'game-3d',
  'game-3d-advanced',
  'world-3d',
] as const

export type FullscreenRuntimeExtensionId = (typeof FULLSCREEN_RUNTIME_EXTENSION_IDS)[number]

export function fullscreenConflictsFor(
  extensionId: FullscreenRuntimeExtensionId,
): readonly FullscreenRuntimeExtensionId[] {
  return FULLSCREEN_RUNTIME_EXTENSION_IDS.filter((candidate) => candidate !== extensionId)
}
