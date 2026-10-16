import { studioProTaskGuides } from '@sistemazero/core/studio/pro-game-knowledge'
import type { ProjectTree } from './proProject'

/** Conservative compatibility check shared by the recipes and file orientation. */
export function hasProExport(tree: ProjectTree | undefined, path: string, name: string): boolean {
  const node = tree?.[path]
  if (node?.kind !== 'file' || !/^[A-Za-z_$][\w$]*$/.test(name)) return false
  return (
    new RegExp(`\\bexport\\s+(?:async\\s+)?(?:function|class|const|let|var)\\s+${name}\\b`).test(
      node.content,
    ) || new RegExp(`\\bexport\\s*\\{[^}]*\\b${name}\\b[^}]*\\}`).test(node.content)
  )
}

export function compatibleProGuides(
  templateId: string | undefined,
  tree: ProjectTree | undefined,
  search = '',
) {
  return (templateId ? studioProTaskGuides(search, templateId, 'browse') : []).filter((guide) =>
    guide.recipe?.references.every((reference) =>
      hasProExport(tree, reference.path, reference.exportName),
    ),
  )
}

export function proFileDescriptions(
  templateId: string | undefined,
  tree: ProjectTree,
): Record<string, string> {
  const labels = new Map<string, Set<string>>()
  for (const guide of compatibleProGuides(templateId, tree)) {
    if (!guide.recipe) continue
    for (const reference of guide.recipe.references) {
      const entries = labels.get(reference.path) ?? new Set<string>()
      entries.add(guide.recipe.label)
      labels.set(reference.path, entries)
    }
  }
  return Object.fromEntries(
    [...labels].map(([path, entries]) => [path, [...entries].slice(0, 3).join(' · ')]),
  )
}
