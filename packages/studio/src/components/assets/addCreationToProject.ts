import { canonicalJson } from '@sistemazero/core/creations'
import {
  PintaImageDerivationSchema,
  type PintaImageRecipe,
  type PintaImageSelectionSummary,
  pintaImageRecipeKey,
} from '@sistemazero/core/studio/pinta-image'
import type { ProjectAsset } from '#core'
import { personalIdOf } from '../../asset-library/personalSync'
import { type EditableStudioProject, isPythonProject } from '../../core/editableProject'
import { projectUsesPgzero } from '../../core/pgzeroMediaPaths'
import { hasTurtleExtension } from '../../runtime/python/turtle/contract'
import type { ProjectStoreApi } from '../../state/projectStore'
import type { StudioMoldaImportResult } from '../../studio/molda-library'
import type { StudioPintaImportResult } from '../../studio/pinta-library'
import { uniqueAssetName } from './assetNames'

/**
 * O "ADICIONAR AO PROJETO" das criações trazidas de fora: o "Trazer do Pinta", o "Trazer do
 * Molda" e o "Trazer da equipe" (14/10/2026) passam TODOS por aqui. Antes cada janela tinha a
 * sua cópia do `addAsset`, e uma terceira janela seria uma terceira cópia esperando divergir.
 *
 * As duas regras que mantêm a ponte de mão dupla funcionando:
 * - o asset nasce com `libId personal:<id>` + `libOrigin`: é o elo do selo "✓ no projeto", da
 *   sincronia de volta (`personalSync`) e do botão "Editar" na ferramenta de origem;
 * - a criação que JÁ está no projeto (mesmo `personal:<id>`) é ATUALIZADA no lugar, sem trocar
 *   nome nem id: os blocos referenciam o asset pelo NOME.
 *
 * Lê o estado AGORA (`getState()`), nunca uma fotografia do render: duas criações seguidas
 * com o mesmo nome precisam ver a primeira já no projeto para a segunda ganhar o sufixo.
 * Devolve a mensagem de erro do store, ou `null`.
 */
export type PintaCreationAsset = Extract<StudioPintaImportResult, { ok: true }>['asset']
export type MoldaCreationAsset = Extract<StudioMoldaImportResult, { ok: true }>['asset']

type ProjectStoreState = ReturnType<ProjectStoreApi['getState']>
type ProjectStoreActions = Pick<ProjectStoreState, 'project' | 'addAsset' | 'updateAssetImage'>

/** A criação do projeto que veio deste id da biblioteca pessoal (ou `undefined`). */
export function projectAssetFromCreation(
  state: Pick<ProjectStoreState, 'project'>,
  creationId: string,
) {
  return (state.project?.assets ?? []).find((asset) => personalIdOf(asset) === creationId)
}

/** Portable images sharing a drawing retain distinct frame/scale identities. */
export function projectPintaImageFromRecipe(
  state: Pick<ProjectStoreState, 'project'>,
  recipe: PintaImageRecipe,
) {
  const key = pintaImageRecipeKey(recipe)
  return state.project?.assets?.find(
    (asset) => asset.pintaImage && pintaImageRecipeKey(asset.pintaImage.recipe) === key,
  )
}

/**
 * The output format is the DESTINATION's decision, written into the recipe: a Pygame Zero
 * project gets the real vector (SVG) of a vector drawing; pixel art, Turtle (Tk opens no SVG)
 * and Python without an extension get PNG. Reviewing a material keeps the format it already
 * has: its Python file (`.png`/`.svg`) is part of its identity.
 */
export function pintaImageOutputFor(
  project: EditableStudioProject | null | undefined,
  facts: PintaImageSelectionSummary | undefined,
  reviewing?: Pick<PintaImageRecipe, 'output'>,
): PintaImageRecipe['output'] {
  if (reviewing) return reviewing.output
  if (!project || !isPythonProject(project) || !facts || facts.kind === 'unavailable')
    return undefined
  // Pygame Zero opens SVG. In a Turtle project the vector becomes a turtle shape
  // (formas_do_pinta), which needs shapes only; with text, a picture or a mask it stays PNG.
  if (projectUsesPgzero(project)) return facts.vector === true ? 'svg' : undefined
  if (hasTurtleExtension(project.installedExtensions))
    return facts.vector === true && facts.turtleShape === true ? 'svg' : undefined
  return undefined
}

/** Desenho do Pinta (imagem + animações/peças/mapa). */
export function addPintaCreationToProject(
  state: ProjectStoreActions,
  asset: PintaCreationAsset,
  /** Captured before preparing an update; unrelated project edits do not invalidate it. */
  expectedTarget?: ProjectAsset | null,
): string | null {
  const python = state.project && isPythonProject(state.project)
  const parsed =
    asset.pintaImage === undefined
      ? undefined
      : PintaImageDerivationSchema.safeParse(asset.pintaImage)
  if (python && (!parsed?.success || parsed.data.recipe.drawingId !== asset.id))
    return 'Escolha uma imagem do desenho antes de adicionar ao projeto Python.'
  if (!python && parsed) return 'A seleção de imagem pertence a um projeto Python.'
  const pintaImage = parsed?.success ? parsed.data : undefined
  let existing = pintaImage
    ? projectPintaImageFromRecipe(state, pintaImage.recipe)
    : projectAssetFromCreation(state, asset.id)
  if (expectedTarget === null && existing)
    return 'Esta seleção foi adicionada durante a preparação. Confira a imagem novamente.'
  if (expectedTarget) {
    const current = state.project?.assets?.find((item) => item.id === expectedTarget.id)
    if (!pintaImage || !current || canonicalJson(current) !== canonicalJson(expectedTarget))
      return 'Esta imagem mudou durante a preparação. Confira a seleção novamente.'
    if (existing && existing.id !== current.id)
      return 'Esta seleção já está em outra imagem do projeto.'
    if (personalIdOf(current) !== asset.id || !current.pintaImage)
      return 'A seleção não corresponde à imagem do projeto.'
    existing = current
  }
  if (existing) {
    return state.updateAssetImage(existing.id, {
      dataUrl: asset.dataUrl,
      width: asset.width,
      height: asset.height,
      sprite: asset.sprite,
      tileset: asset.tileset,
      tilemap: asset.tilemap,
      libRevision: asset.libRevision,
      ...(pintaImage ? { pintaImage } : {}),
    })
  }
  const taken = new Set((state.project?.assets ?? []).map((a) => a.name))
  return state.addAsset({
    name: uniqueAssetName(asset.name, taken),
    dataUrl: asset.dataUrl,
    width: asset.width,
    height: asset.height,
    source: 'library',
    libId: `personal:${asset.id}`,
    libOrigin: 'pinta',
    libRevision: asset.libRevision,
    // Animações/tiles/mapa viajam junto (re-sanitizados no store), como no upload.
    sprite: asset.sprite,
    tileset: asset.tileset,
    tilemap: asset.tilemap,
    ...(pintaImage ? { pintaImage } : {}),
  })
}

/** Criação do Molda: modelo (`.glb`), textura (imagem) ou céu (`.hdr`). */
/**
 * A Molda creation as a Raylib project takes it: the 360° sky (.hdr), which the desktop raylib
 * does not open, becomes a panorama PNG in `images/` (the game draws it inside a sphere). The
 * converter loads on demand, only when a sky goes into a Raylib project.
 */
export async function raylibReadyCreation(
  asset: MoldaCreationAsset,
  raylib: boolean,
): Promise<MoldaCreationAsset> {
  if (!raylib || asset.kind !== 'environment3d') return asset
  const { skyPanoramaPng } = await import('./skyPanorama')
  const panorama = skyPanoramaPng(asset.dataUrl)
  return {
    ...asset,
    kind: 'image',
    dataUrl: panorama.dataUrl,
    originalFileName: `${asset.name}.png`,
    width: panorama.width,
    height: panorama.height,
  }
}

export function addMoldaCreationToProject(
  state: ProjectStoreActions,
  asset: MoldaCreationAsset,
): string | null {
  const existing = projectAssetFromCreation(state, asset.id)
  if (existing) {
    return state.updateAssetImage(existing.id, {
      dataUrl: asset.dataUrl,
      originalFileName: asset.originalFileName,
      ...(asset.width !== undefined ? { width: asset.width } : {}),
      ...(asset.height !== undefined ? { height: asset.height } : {}),
      ...(asset.libRevision !== undefined ? { libRevision: asset.libRevision } : {}),
    })
  }
  const taken = new Set((state.project?.assets ?? []).map((a) => a.name))
  return state.addAsset({
    name: uniqueAssetName(asset.name, taken),
    dataUrl: asset.dataUrl,
    kind: asset.kind,
    // O nome do arquivo vai junto: a validação do store cruza a extensão com o MIME e a
    // assinatura binária (mesmo caminho do upload de .glb/.hdr).
    originalFileName: asset.originalFileName,
    ...(asset.width !== undefined ? { width: asset.width } : {}),
    ...(asset.height !== undefined ? { height: asset.height } : {}),
    source: 'library',
    libId: `personal:${asset.id}`,
    // Quem edita esta criação é o Molda (a textura é imagem, mas não é desenho do Pinta).
    libOrigin: 'molda',
    ...(asset.libRevision !== undefined ? { libRevision: asset.libRevision } : {}),
  })
}
