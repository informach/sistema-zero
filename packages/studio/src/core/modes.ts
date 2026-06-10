export type IDEMode = 'blocks' | 'bridge' | 'code'

export const IDE_MODES: readonly IDEMode[] = ['blocks', 'bridge', 'code'] as const

export const MODE_LABELS: Record<IDEMode, string> = {
  blocks: 'Blocos',
  bridge: 'Ponte',
  code: 'Código',
}
