import type { LessonArtImage, LessonArtSlot } from './lesson-art-slots'
import type { ArtSlotsView } from './types'

/**
 * Busca os desenhos das vagas de arte do bloco de Estúdio e os converte em imagens do Estúdio
 * com o MESMO exportador que o Pinta usa para o Estúdio (`exportLoadedAssetForStudio`: pixel e
 * vetor saem em PNG, dentro dos tetos do Estúdio). Nada aqui derruba o bloco: leitura que falha
 * ou desenho que não converte deixam a vaga vazia e marcam `failed`, para o bloco dar um recado
 * curto e abrir o jogo com as imagens dele.
 */
export interface LessonArtLoad {
  slots: LessonArtSlot[]
  failed: boolean
}

export type LessonArtConvert = (wire: unknown) => Promise<LessonArtImage | null>

/** A conversão de verdade (navegador): o desenho guardado → `PintaAsset` → imagem do Estúdio. */
export const convertPintaWire: LessonArtConvert = async (wire) => {
  const [{ pintaAssetFromWire }, { exportLoadedAssetForStudio }] = await Promise.all([
    import('@sistemazero/pinta/assets'),
    import('@sistemazero/pinta/studio-library'),
  ])
  const asset = pintaAssetFromWire(wire)
  if (!asset) return null
  const result = await exportLoadedAssetForStudio(asset)
  if (!result.ok) return null
  const { dataUrl, width, height, sprite } = result.asset
  return { dataUrl, width, height, ...(sprite ? { sprite } : {}) }
}

export async function loadLessonArt(
  read: () => Promise<ArtSlotsView>,
  convert: LessonArtConvert = convertPintaWire,
): Promise<LessonArtLoad> {
  let view: ArtSlotsView
  try {
    view = await read()
  } catch {
    return { slots: [], failed: true }
  }
  let failed = false
  const slots = await Promise.all(
    (view?.slots ?? []).map(async (slot): Promise<LessonArtSlot> => {
      if (slot.asset == null) return { ...base(slot), image: null }
      const image = await convert(slot.asset).catch(() => null)
      if (!image) failed = true
      return { ...base(slot), image }
    }),
  )
  return { slots, failed }
}

const base = (slot: ArtSlotsView['slots'][number]) => ({
  name: slot.name,
  mode: slot.mode,
  replaces: slot.replaces,
})
