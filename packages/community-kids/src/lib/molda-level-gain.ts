import { MOLDA_TOOL_BAND_LEVELS, type MoldaToolBand } from '@sistemazero/core/career'

/**
 * O que o Molda ganha no posto em que cada faixa de ferramentas abre, para a comemoração de
 * subir de nível ("No Molda: …"). Curto, na língua da criança, e sem prometer o que o posto não
 * dá: a faixa de cada posto vem de `MOLDA_TOOL_BAND_LEVELS`, o mesmo mapa do portão.
 *
 * ⚠️ Só para quem TEM o produto (produtos vendidos à parte): quem chama confere a posse.
 */
const MOLDA_BAND_GAIN: Readonly<Record<MoldaToolBand, string>> = {
  basic: 'a sua oficina 3D abriu. Modele peças, pinte e crie movimentos.',
  intermediate: 'editar a malha, camadas de pintura e pintura que se mexe.',
  professional: 'ossos, curvas e as ferramentas avançadas de malha.',
}

/** A frase do posto, ou `null` quando nenhuma faixa do Molda abre nele. */
export function moldaLevelGain(level: string | null | undefined): string | null {
  for (const band of Object.keys(MOLDA_BAND_GAIN) as MoldaToolBand[])
    if (MOLDA_TOOL_BAND_LEVELS[band] === level) return MOLDA_BAND_GAIN[band]
  return null
}
