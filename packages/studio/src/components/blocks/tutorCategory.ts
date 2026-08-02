export interface TutorToolboxItem {
  getName?: () => string
  getContents?: () => unknown
  getChildToolboxItems?: () => TutorToolboxItem[]
}

export interface TutorToolbox {
  getToolboxItems?: () => TutorToolboxItem[]
  setSelectedItem?: (item: TutorToolboxItem) => void
}

export interface TutorWorkspace {
  getToolbox?: () => unknown
}

function normalized(value: string): string {
  return value.trim().toLocaleLowerCase('pt-BR')
}

function contentsIncludeBlockType(contents: unknown, blockType: string): boolean {
  if (!Array.isArray(contents)) return false
  return contents.some((entry) => {
    if (!entry || typeof entry !== 'object') return false
    const item = entry as Record<string, unknown>
    if (item.type === blockType) return true
    return contentsIncludeBlockType(item.contents, blockType)
  })
}

function findBlockOwner(items: TutorToolboxItem[], blockType: string): TutorToolboxItem | null {
  for (const item of items) {
    try {
      if (contentsIncludeBlockType(item.getContents?.(), blockType)) return item
    } catch {
      // Categorias dinâmicas podem lançar antes de o flyout existir; seguimos pelos filhos.
    }
    const found = findBlockOwner(item.getChildToolboxItems?.() ?? [], blockType)
    if (found) return found
  }
  return null
}

function findExactCategory(items: TutorToolboxItem[], category: string): TutorToolboxItem | null {
  const wanted = normalized(category)
  for (const item of items) {
    if (normalized(item.getName?.() ?? '') === wanted) return item
    const found = findExactCategory(item.getChildToolboxItems?.() ?? [], category)
    if (found) return found
  }
  return null
}

/** Seleciona a categoria que contém o tipo autoritativo; o rótulo é só fallback exato. */
export function openTutorCategory(
  workspace: TutorWorkspace,
  blockType: string,
  category: string,
): boolean {
  const toolbox = workspace.getToolbox?.() as TutorToolbox | null | undefined
  if (!toolbox?.getToolboxItems || !toolbox.setSelectedItem) return false
  const items = toolbox.getToolboxItems()
  const item = findBlockOwner(items, blockType) ?? findExactCategory(items, category)
  if (!item) return false
  toolbox.setSelectedItem(item)
  return true
}
