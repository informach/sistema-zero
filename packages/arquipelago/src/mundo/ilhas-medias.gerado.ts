// Gerado por scripts/gerar-ilhas-medias.ts. Não edite.
import type { IlhaId } from '@sistemazero/arquipelago-contracts'
import bosqueMedia from '../assets/ilhas/bosque-media.glb'
import nuvensMedia from '../assets/ilhas/nuvens-media.glb'
import picoMedia from '../assets/ilhas/pico-media.glb'
import recifeMedia from '../assets/ilhas/recife-media.glb'
import valeDosDinosMedia from '../assets/ilhas/vale-dos-dinos-media.glb'
import vilaDoceMedia from '../assets/ilhas/vila-doce-media.glb'

/** O endereço da versão média de cada ilha que tem a arte dela. */
export const ARQUIVOS_DAS_ILHAS_MEDIAS: Partial<Record<IlhaId, string>> = {
  bosque: new URL(bosqueMedia, import.meta.url).href,
  'vila-doce': new URL(vilaDoceMedia, import.meta.url).href,
  recife: new URL(recifeMedia, import.meta.url).href,
  pico: new URL(picoMedia, import.meta.url).href,
  'vale-dos-dinos': new URL(valeDosDinosMedia, import.meta.url).href,
  nuvens: new URL(nuvensMedia, import.meta.url).href,
}
