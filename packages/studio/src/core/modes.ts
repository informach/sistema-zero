export type IDEMode = 'blocks' | 'bridge' | 'code'

export const IDE_MODES: readonly IDEMode[] = ['blocks', 'bridge', 'code'] as const

export const MODE_LABELS: Record<IDEMode, string> = {
  blocks: 'Blocos',
  bridge: 'Ponte',
  code: 'Código',
}

const BASIC_MODES: readonly IDEMode[] = ['blocks', 'bridge']
const PRO_MODES: readonly IDEMode[] = ['code']

/**
 * Modos disponíveis por TIPO de projeto (separação D2): projeto BÁSICO usa
 * Blocos + Ponte (a Ponte já é o editor dos 3 arquivos); projeto PROFISSIONAL
 * usa só o Código (árvore + Vite). A Topbar intersecta isto com a allowlist do
 * host. `kind` é o `Project.kind` ('classic'/'pro'/ausente = básico).
 */
export function modesForKind(kind?: 'classic' | 'pro'): readonly IDEMode[] {
  return kind === 'pro' ? PRO_MODES : BASIC_MODES
}

/**
 * Normaliza o modo de um projeto BÁSICO para um modo válido (Blocos/Ponte).
 * 'code' — legado, de antes do D2, quando o básico tinha Código standalone — cai
 * em 'bridge', onde o aluno continua vendo/editando o código dos 3 arquivos.
 */
export function normalizeClassicMode(mode: unknown): IDEMode {
  if (mode === 'blocks' || mode === 'bridge') return mode
  return mode === 'code' ? 'bridge' : 'blocks'
}
