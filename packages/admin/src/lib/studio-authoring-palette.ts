import type { BlockCatalogEntry, EditableStudioProject } from '@sistemazero/studio'
import type { PreparedStudioAuthoringOptions } from './studio-authoring-options'

export type StudioPaletteProject = Pick<
  EditableStudioProject,
  'programmingLanguage' | 'runtime' | 'installedExtensions'
>
export interface StudioAuthoringPalette {
  blocks: readonly BlockCatalogEntry[]
  categories: readonly { value: string; label: string }[]
}

/** Both the picker and category controls use the same exact release and installed extensions. */
export async function loadStudioAuthoringPalette(
  project: StudioPaletteProject | null,
  prepared: PreparedStudioAuthoringOptions | null,
): Promise<StudioAuthoringPalette> {
  const policy =
    project?.runtime &&
    prepared?.options.catalog?.releases.find(
      ({ runtime }) =>
        runtime.profileId === project.runtime!.profileId &&
        runtime.releaseId === project.runtime!.releaseId &&
        runtime.manifestSha256 === project.runtime!.manifestSha256,
    )
  if (project?.runtime && (!policy || policy.status === 'revoked'))
    throw new Error(
      'A lista de blocos deste ambiente está indisponível. A seleção salva foi preservada.',
    )
  if (project?.programmingLanguage === 'python') {
    if (!project.runtime || !policy || !prepared?.catalog)
      throw new Error('Aguarde a configuração dos blocos Python deste ambiente.')
    const { loadPythonAuthoring } = await import('@sistemazero/studio/python-authoring')
    const loaded = await loadPythonAuthoring(
      { runtime: project.runtime, installedExtensions: project.installedExtensions ?? [] },
      {
        catalog: prepared.catalog,
        pythonAuthoring: [{ runtime: policy.runtime, blockIds: policy.blockIds }],
      },
    )
    const entries = loaded.catalog.filter((entry) => loaded.approvedBlockIds.has(entry.id))
    return {
      blocks: entries.map((entry) => ({
        type: entry.id,
        label: entry.title,
        category: entry.path.join(' / '),
      })),
      categories: [...new Set(entries.flatMap((entry) => entry.path.slice(1)))]
        .filter((value) => policy.categoryIds.includes(value))
        .map((value) => ({ value, label: value })),
    }
  }
  const { BLOCK_CATALOG, CORE_CATEGORY_OPTIONS } = await import('@sistemazero/studio')
  return {
    blocks: policy
      ? BLOCK_CATALOG.filter((entry) => policy.blockIds.includes(entry.type))
      : BLOCK_CATALOG,
    categories: policy
      ? CORE_CATEGORY_OPTIONS.filter((category) => policy.categoryIds.includes(category.value))
      : CORE_CATEGORY_OPTIONS,
  }
}
