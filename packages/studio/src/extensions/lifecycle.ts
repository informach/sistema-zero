import type { RuntimeLifecycleContract } from './types'

export const CORE_LIFECYCLE: RuntimeLifecycleContract = { target: 'core' }

export const GAME_2D_LIFECYCLE: RuntimeLifecycleContract = {
  target: 'game-2d',
  extensionId: 'game-2d',
  globalName: 'SZGame2D',
  runMethod: 'onStart',
  runId: '__sz-project',
  restartMethod: 'restart',
  pauseMethod: 'pauseGame',
  resumeMethod: 'resumeGame',
}

export const GAME_2D_ADVANCED_LIFECYCLE: RuntimeLifecycleContract = {
  target: 'game-2d-advanced',
  extensionId: 'game-2d-advanced',
  globalName: 'SZGameKit',
  runMethod: 'runProject',
  bootMethod: 'start',
  restartMethod: 'restartGame',
  pauseMethod: 'pause',
  resumeMethod: 'resume',
}

export const GAME_3D_LIFECYCLE: RuntimeLifecycleContract = {
  target: 'game-3d',
  extensionId: 'game-3d',
  globalName: 'SZGame3D',
  runMethod: 'runProject',
  disposeMethod: 'disposeAll',
}

export const GAME_3D_ADVANCED_LIFECYCLE: RuntimeLifecycleContract = {
  target: 'game-3d-advanced',
  extensionId: 'game-3d-advanced',
  globalName: 'SZGameKit3D',
  runMethod: 'runProject',
  bootMethod: 'start',
  disposeMethod: 'disposeAll',
}

export const WORLD_3D_LIFECYCLE: RuntimeLifecycleContract = {
  target: 'world-3d',
  extensionId: 'world-3d',
  globalName: 'SZWorld3D',
  runMethod: 'runProject',
  bootMethod: 'start',
  disposeMethod: 'disposeAll',
}

const CONTRACT_BY_EXTENSION = new Map<string, RuntimeLifecycleContract>([
  ['game-2d', GAME_2D_LIFECYCLE],
  ['game-2d-advanced', GAME_2D_ADVANCED_LIFECYCLE],
  ['game-3d', GAME_3D_LIFECYCLE],
  ['game-3d-advanced', GAME_3D_ADVANCED_LIFECYCLE],
  ['world-3d', WORLD_3D_LIFECYCLE],
])

const TARGET_PRECEDENCE = [
  'game-2d-advanced',
  'game-3d-advanced',
  'world-3d',
  'game-3d',
  'game-2d',
] as const

export function lifecycleContractForExtensions(
  extensions: readonly { extensionId: string }[],
): RuntimeLifecycleContract {
  const installed = new Set(extensions.map((extension) => extension.extensionId))
  for (const extensionId of TARGET_PRECEDENCE) {
    if (!installed.has(extensionId)) continue
    return CONTRACT_BY_EXTENSION.get(extensionId) as RuntimeLifecycleContract
  }
  return CORE_LIFECYCLE
}

export function lifecycleContractForTarget(
  target: RuntimeLifecycleContract['target'],
): RuntimeLifecycleContract {
  if (target === 'core') return CORE_LIFECYCLE
  return CONTRACT_BY_EXTENSION.get(target) ?? CORE_LIFECYCLE
}
