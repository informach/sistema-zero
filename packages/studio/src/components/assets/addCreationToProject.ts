import { personalIdOf } from '../../asset-library/personalSync'
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

/** Desenho do Pinta (imagem + animações/peças/mapa). */
export function addPintaCreationToProject(
  state: ProjectStoreActions,
  asset: PintaCreationAsset,
): string | null {
  const existing = projectAssetFromCreation(state, asset.id)
  if (existing) {
    return state.updateAssetImage(existing.id, {
      dataUrl: asset.dataUrl,
      width: asset.width,
      height: asset.height,
      sprite: asset.sprite,
      tileset: asset.tileset,
      tilemap: asset.tilemap,
      libRevision: asset.libRevision,
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
  })
}

/** Criação do Molda: modelo (`.glb`), textura (imagem) ou céu (`.hdr`). */
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
