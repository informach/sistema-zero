import type { LiveStudioConfig } from '@sistemazero/core/live'

export type LiveStudioMode = NonNullable<LiveStudioConfig['allowedModes']>[number]

/** Encontro novo: só Blocos e sem revelar o avançado (a criança vê a paleta da oficina). */
export function defaultLiveStudio(): LiveStudioConfig {
  return { allowedModes: ['blocks'], allowLevelReveal: false }
}

export const LIVE_STUDIO_MODES: readonly { value: LiveStudioMode; label: string }[] = [
  { value: 'blocks', label: 'Blocos' },
  { value: 'bridge', label: 'Ponte' },
  { value: 'code', label: 'Código' },
]

/** Liga ou desliga um modo sem nunca deixar a criança sem nenhum. Ordem fixa: Blocos, Ponte, Código. */
export function toggleStudioMode(
  modes: readonly LiveStudioMode[] | undefined,
  mode: LiveStudioMode,
  on: boolean,
): LiveStudioMode[] {
  const current = new Set(modes?.length ? modes : ['blocks'])
  if (on) current.add(mode)
  else if (current.size > 1) current.delete(mode)
  return LIVE_STUDIO_MODES.map((item) => item.value).filter((value) => current.has(value))
}

/** A mesma área de transferência do bloco Estúdio das aulas gravadas. */
export interface StudioClipboardShape {
  level: string
  modes: LiveStudioMode[]
  categories: string[]
  allowReveal: boolean
  allowBlocks: string[]
}

export function curationToClipboard(value: LiveStudioConfig): StudioClipboardShape {
  return {
    level: value.level ?? 'iniciante-2d',
    modes: value.allowedModes?.length ? [...value.allowedModes] : ['blocks'],
    categories: [...(value.allowCategories ?? [])],
    allowReveal: value.allowLevelReveal === true,
    allowBlocks: [...(value.allowBlocks ?? [])],
  }
}

export function clipboardToCuration(snapshot: StudioClipboardShape): LiveStudioConfig {
  const modes = snapshot.modes.filter((mode): mode is LiveStudioMode =>
    LIVE_STUDIO_MODES.some((item) => item.value === mode),
  )
  return {
    level: snapshot.level,
    allowedModes: modes.length ? modes : ['blocks'],
    allowCategories: [...snapshot.categories],
    allowLevelReveal: snapshot.allowReveal,
    allowBlocks: [...snapshot.allowBlocks],
  }
}
