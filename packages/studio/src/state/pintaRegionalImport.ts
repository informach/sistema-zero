import { isLessonStudioProjectId } from '@sistemazero/core/studio/lesson-project-id'
import { ulid } from 'ulid'
import { uniqueAssetName } from '../core/assetNames'
import { type EditableStudioProject, isPythonProject } from '../core/editableProject'
import { normalizeAssetName } from '../core/projectAssets'
import { regionalJavaScriptEngine } from '../runtime/javascript/pintaRegionalMaterials'
import type { StudioPintaImportedAsset } from '../studio/pinta-library'
import { prepareEditableStudioProject } from './editableProjectValidation'

/** Admit all bytes before replacing one material. No source file or block changes. */
export async function prepareRegionalPintaImport(
  project: EditableStudioProject,
  input: StudioPintaImportedAsset,
  signal?: AbortSignal,
): Promise<EditableStudioProject> {
  if (isLessonStudioProjectId(project.id))
    throw new Error(
      'Este cenário completo pode ser usado no Estúdio livre. O projeto e o progresso desta aula foram mantidos.',
    )
  if (isPythonProject(project))
    throw new Error(
      'Este cenário completo ainda não está liberado para este ambiente Python. O projeto foi mantido.',
    )
  if (
    !input.regional ||
    input.maps?.length ||
    input.pintaImage ||
    input.scene ||
    input.tilemap ||
    input.tilemapFront ||
    input.tileset ||
    input.sprite
  )
    throw new Error('O cenário está incompleto. O projeto foi mantido.')
  const engine = regionalJavaScriptEngine(project.installedExtensions)
  if (!engine)
    throw new Error('Instale um só motor para usar o cenário: Jogo 2D ou Jogo 2D Avançado.')
  if (project.kind === 'pro') {
    const { proRegionalEngineCopy } = await import('../modes/pro/pintaRegionalProRuntime')
    if ((await proRegionalEngineCopy(project.tree, engine.id)) !== 'current')
      throw new Error(
        'O motor deste projeto Pro foi modificado. O cenário anterior foi mantido; use uma cópia com o motor atual.',
      )
  }
  signal?.throwIfAborted()
  const assets = project.assets ?? []
  const previous = assets.find(
    (asset) => asset.libId === `personal:${input.id}` && asset.libOrigin !== 'molda',
  )
  if (
    previous &&
    (previous.source === 'lesson-art' || previous.kind !== 'image' || previous.pintaImage)
  )
    throw new Error('Este desenho está ligado a outro tipo de material. O original foi mantido.')
  const name = normalizeAssetName(input.name)
  if (!name) throw new Error('O cenário precisa de um nome válido.')
  const material = {
    id: previous?.id ?? ulid(),
    name: previous?.name ?? uniqueAssetName(name, new Set(assets.map((asset) => asset.name))),
    kind: 'image' as const,
    source: 'library' as const,
    libId: `personal:${input.id}`,
    libOrigin: 'pinta' as const,
    ...(input.libRevision === undefined ? {} : { libRevision: input.libRevision }),
    ...(previous?.license ? { license: previous.license } : {}),
    dataUrl: input.dataUrl,
    width: input.width,
    height: input.height,
    regional: input.regional,
  }
  const next = previous
    ? assets.map((asset) => (asset === previous ? material : asset))
    : [...assets, material]
  const admitted = await prepareEditableStudioProject({ ...project, assets: next })
  signal?.throwIfAborted()
  if (!admitted) throw new Error('Não consegui conferir o cenário. O projeto foi mantido.')
  return admitted
}
