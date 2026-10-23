import {
  KIDS_MOLDA_BAND_CAPABILITIES,
  type KidsCreatorCapability,
  type MoldaToolBand,
} from '@sistemazero/core/journey'

/**
 * O que cada faixa de ferramentas do Molda traz, dito para a criança, e as FAMÍLIAS que a frase
 * promete. É a fonte única da promessa: a comemoração de subir de nível ("No Molda: …") e as
 * recompensas da jornada (`journey-rewards.ts`) montam o texto daqui, e
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

/** Actual newly observed pedagogical capabilities; product ownership is checked separately. */
export function moldaCapabilitiesGain(
  before: readonly KidsCreatorCapability[],
  after: readonly KidsCreatorCapability[],
): string | null {
  const gained = (Object.keys(MOLDA_BAND_PROMISES) as MoldaToolBand[]).filter((band) => {
    const capability = KIDS_MOLDA_BAND_CAPABILITIES[band]
    return !before.includes(capability) && after.includes(capability)
  })
  return (
    gained
      .map((band) =>
        band === 'basic'
          ? `a oficina 3D abriu para você, com ${moldaFeatureList(band)}.`
          : `chegaram ${moldaFeatureList(band)}.`,
      )
      .join(' ') || null
  )
}
