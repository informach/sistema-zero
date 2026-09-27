import type { ExtensionToolboxCategory } from '../extensions/toolboxTypes'
import { OFFICIAL_CATALOG } from '../official-extensions'
import { socketInputsFor } from './blocks/valueSockets'

type Entry = Extract<ExtensionToolboxCategory['contents'][number], { kind: 'block' }>
const extensionEntries = new Map<string, Entry>()
function collect(category: ExtensionToolboxCategory): void {
  for (const entry of category.contents) {
    if (entry.kind === 'category') collect(entry)
    else extensionEntries.set(entry.type, entry)
  }
}
for (const extension of OFFICIAL_CATALOG) collect(extension.blockly.toolboxCategory)

/** Mesmos valores iniciais na paleta, na busca e ao reconstruir o código. */
export function paletteEntryFor(type: string): Entry {
  return extensionEntries.get(type) ?? { kind: 'block', type, inputs: socketInputsFor(type) }
}

export function paletteShadowType(type: string, input: string): string | undefined {
  const wrapper: unknown = paletteEntryFor(type).inputs?.[input]
  if (!wrapper || typeof wrapper !== 'object' || !('shadow' in wrapper)) return undefined
  const shadow = wrapper.shadow
  return shadow && typeof shadow === 'object' && 'type' in shadow && typeof shadow.type === 'string'
    ? shadow.type
    : undefined
}
