import { MOLDA_TOOL_BAND_LEVELS, type MoldaToolBand } from '@sistemazero/core/career'

/**
 * O que cada faixa de ferramentas do Molda traz, dito para a criança, e as FAMÍLIAS que a frase
 * promete. É a fonte única da promessa: a comemoração de subir de nível ("No Molda: …") e as
 * recompensas da carreira (`career-rewards.ts`) montam o texto daqui, e
 * `tests/molda-tool-access.test.ts` exige que cada família prometida esteja de fato naquela faixa
 * do pacote (`MOLDA_TOOL_FAMILIES`). Mover uma família de faixa sem mexer aqui reprova o teste.
 *
 * ⚠️ Só para quem TEM o produto (produtos vendidos à parte): quem chama confere a posse.
 */
export const MOLDA_BAND_PROMISES: Readonly<
  Record<MoldaToolBand, { features: readonly string[]; families: readonly string[] }>
> = {
  basic: {
    features: ['peças', 'pintura', 'movimentos'],
    families: ['model.pieces', 'paint.brush', 'animate.create'],
  },
  intermediate: {
    features: ['a malha', 'as camadas de pintura', 'a pintura que se mexe'],
    families: ['model.mesh', 'paint.layers', 'paint.flipbook'],
  },
  professional: {
    features: ['os ossos', 'as curvas de movimento', 'a malha avançada'],
    families: ['model.skin', 'animate.pro', 'model.mesh-pro'],
  },
}

/** "a, b e c", do jeito que se fala. */
export function moldaFeatureList(band: MoldaToolBand): string {
  const items = MOLDA_BAND_PROMISES[band].features
  return items.length > 1 ? `${items.slice(0, -1).join(', ')} e ${items.at(-1)}` : (items[0] ?? '')
}

/** A frase do posto, ou `null` quando nenhuma faixa do Molda abre nele. */
export function moldaLevelGain(level: string | null | undefined): string | null {
  for (const band of Object.keys(MOLDA_BAND_PROMISES) as MoldaToolBand[]) {
    if (MOLDA_TOOL_BAND_LEVELS[band] !== level) continue
    return band === 'basic'
      ? `a oficina 3D abriu para você, com ${moldaFeatureList(band)}.`
      : `chegaram ${moldaFeatureList(band)}.`
  }
  return null
}
