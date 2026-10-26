import { canonicalJson } from '@sistemazero/core/creations'
import {
  PintaImageRecipeSchema,
  type PintaImageSelectionSummary,
} from '@sistemazero/core/studio/pinta-image'
import {
  type ExampleDrawingRef,
  exampleDrawingDocumentId,
  exampleDrawingOrigin,
  exampleDrawingRefOf,
  loadExampleDrawingsJson,
} from '../../asset-library/exampleDrawings'
import { isPythonProject } from '../../core/editableProject'
import type { ProjectStoreApi } from '../../state/projectStore'
import type { StudioPintaLibraryAdapter } from '../../studio/pinta-library'
import { pintaImageModeSelection, pintaImageModesFor } from './pintaImageModes'

/** A escala da galeria: desenhado pequeno, jogado com o dobro do tamanho (o PNG do exemplo). */
const EXAMPLE_DRAWING_SCALE = 2

export type ExampleDrawingLinkResult =
  | { ok: true; drawingId: string }
  | { ok: false; error: string }

export interface ExampleDrawingLinkDeps {
  adapter: StudioPintaLibraryAdapter
  store: ProjectStoreApi
  signal?: AbortSignal
  /** Testes injetam o `.pinta.json`; o padrão carrega o do jogo (só agora, sob demanda). */
  loadJson?: (ref: ExampleDrawingRef) => Promise<string>
}

/**
 * O "Editar" de um desenho de jogo de exemplo, na primeira vez: copia o documento (e as peças,
 * se for mapa) para a galeria do Pinta, prepara a imagem pelo caminho normal do Python (a
 * receita do Pinta: folha com as animações, todas as peças, o mapa com camadas e objetos, ou o
 * cenário, na escala 2) e liga o material a esse desenho SEM trocar nome nem arquivo. Depois
 * disso ele é um material do Pinta como outro qualquer, e um novo clique só abre o Pinta.
 */
export async function linkExampleDrawing(
  assetId: string,
  deps: ExampleDrawingLinkDeps,
): Promise<ExampleDrawingLinkResult> {
  const { adapter, store, signal } = deps
  try {
    const state = store.getState()
    const project = state.project
    const asset = project?.assets?.find((item) => item.id === assetId)
    const ref = asset ? exampleDrawingRefOf(asset) : null
    if (!project || !isPythonProject(project) || !asset || !ref)
      return { ok: false, error: 'Esta imagem não é um desenho de exemplo do Pinta.' }
    if (!adapter.importDrawings) return { ok: false, error: 'O Pinta não está disponível aqui.' }
    const before = canonicalJson(asset)
    const sourceId = exampleDrawingDocumentId(ref)
    const json = await (deps.loadJson ?? loadExampleDrawingsJson)(ref)
    signal?.throwIfAborted()
    // A origem faz o Pinta reaproveitar a cópia que já existe (a de uma tentativa anterior que
    // falhou depois de copiar, ou as peças de outro mapa) e copiar de novo a que foi apagada.
    // Por isso não há cache aqui: um id guardado da tentativa anterior podia já não existir.
    const result = await adapter.importDrawings(
      { json, ids: [sourceId], origin: exampleDrawingOrigin(ref) },
      { signal },
    )
    signal?.throwIfAborted()
    if (!result.ok) return { ok: false, error: result.error }
    const drawing = result.drawings.find((item) => item.sourceId === sourceId)
    if (!drawing) return { ok: false, error: 'O desenho não chegou à sua galeria do Pinta.' }
    const selection = exampleSelection(drawing.imageSelection)
    if (!selection)
      return {
        ok: false,
        error: 'Este desenho precisa do conjunto de peças dele. Recupere o conjunto no Pinta.',
      }
    const recipe = PintaImageRecipeSchema.parse({
      version: 1,
      algorithm: 'pinta-image-1',
      drawingId: drawing.id,
      selection,
      scale: EXAMPLE_DRAWING_SCALE,
    })
    const { assertPintaImageFits, pintaImageTargetLimits } = await import(
      '../../asset-library/pintaImageTarget'
    )
    const limits = pintaImageTargetLimits(store.getState().project?.assets ?? [], asset.id)
    const imported = await adapter.import(drawing.id, { signal, image: { recipe, limits } })
    signal?.throwIfAborted()
    if (!imported.ok) return { ok: false, error: imported.error }
    const derivation = imported.asset.pintaImage
    if (!derivation) return { ok: false, error: 'O Pinta não preparou a imagem deste desenho.' }
    assertPintaImageFits({ dataUrl: imported.asset.dataUrl, derivation }, limits)
    const current = store.getState().project?.assets?.find((item) => item.id === assetId)
    if (!current || canonicalJson(current) !== before)
      return {
        ok: false,
        error: 'Esta imagem mudou enquanto o desenho era preparado. Tente de novo.',
      }
    const error = store.getState().linkAssetToPintaImage(assetId, {
      dataUrl: imported.asset.dataUrl,
      width: derivation.output.width,
      height: derivation.output.height,
      libId: `personal:${drawing.id}`,
      libRevision: imported.asset.libRevision,
      pintaImage: derivation,
    })
    if (error) return { ok: false, error }
    return { ok: true, drawingId: drawing.id }
  } catch (error) {
    if (signal?.aborted) return { ok: false, error: 'A preparação foi cancelada.' }
    return {
      ok: false,
      error:
        error instanceof Error && error.message
          ? error.message
          : 'Não deu para preparar este desenho no Pinta agora. Tente de novo.',
    }
  }
}

/** O desenho inteiro com os dados, como na galeria: a primeira opção do pygame. */
function exampleSelection(facts: PintaImageSelectionSummary) {
  const mode = pintaImageModesFor(facts, true)[0]
  if (!mode || facts.kind === 'unavailable') return null
  return pintaImageModeSelection(mode, {
    animationId: facts.kind === 'frame' ? (facts.animations[0]?.id ?? '') : '',
    index: 0,
  })
}
