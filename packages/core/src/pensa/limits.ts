/** One policy for validation, generation, HTTP boundaries and persistence. */
export const PENSA_LIMITS = {
  activeProjects: 20,
  joinedProjects: 20,
  teamPeople: 6,
  requirements: 80,
  missions: 80,
  stages: 12,
  assetSlots: 128,
  batchMissions: 8,
  snapshotBytes: 384 * 1024,
  draftBodyBytes: 512 * 1024,
  promptBytes: 48 * 1024,
  missionProseBytes: 4 * 1024,
  outputTokens: 8_000,
  messageChars: 4_000,
  dialogueCallsPerRound: 6,
  dialogueCalls: 24,
  planningCalls: 48,
  helpCalls: 2,
  attemptsPerUnit: 2,
  providerCallsPerDay: 60,
  providerCallsPerMonth: 600,
  checkpointCount: 80,
  checkpointBytes: 512 * 1024 * 1024,
  operationLeaseMs: 180_000,
} as const

const runtimeDimensions: Readonly<Record<string, '2d' | '3d'>> = {
  'game-2d': '2d',
  'game-2d-advanced': '2d',
  'game-3d': '3d',
  'game-3d-advanced': '3d',
  'world-3d': '3d',
}
export const PENSA_GAME_RUNTIME_EXTENSION_IDS: readonly string[] = Object.keys(runtimeDimensions)

export function pensaRuntimeDimension(extensionId: string | null): '2d' | '3d' | null {
  return extensionId && Object.hasOwn(runtimeDimensions, extensionId)
    ? (runtimeDimensions[extensionId] ?? null)
    : null
}

export const PENSA_ZERO_LABELS = {
  z: { title: 'Zerar a bagunça', action: 'Conte sua ideia' },
  e: { title: 'Enxergar o jogo', action: 'Veja seu jogo e o caminho' },
  r: { title: 'Realizar por partes', action: 'Vamos construir' },
  o: { title: 'Observar e melhorar', action: 'Vamos conferir' },
} as const
