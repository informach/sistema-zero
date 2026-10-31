import type { FossilDoVale } from '@sistemazero/arquipelago-contracts'
import chifre from '../assets/icones/fossil-chifre-triceratopo.png'
import cranio from '../assets/icones/fossil-cranio-rex.png'
import dente from '../assets/icones/fossil-dente.png'
import garra from '../assets/icones/fossil-garra.png'
import ovo from '../assets/icones/fossil-ovo.png'
import vertebra from '../assets/icones/fossil-vertebra.png'
import capivara from '../assets/icones/pegada-capivara.png'
import passaro from '../assets/icones/pegada-passaro.png'
import rex from '../assets/icones/pegada-rex.png'
import triceratopo from '../assets/icones/pegada-triceratopo.png'
import type { PegadaDoAlbum } from '../sistemas/album'

const url = (caminho: string) => new URL(caminho, import.meta.url).href

/** Os ícones dos fósseis do museu (B5, `arte/itens/fosseis.py`). */
export const MINIATURA_DO_FOSSIL: Record<FossilDoVale, string> = {
  'fossil-dente': url(dente),
  'fossil-garra': url(garra),
  'fossil-vertebra': url(vertebra),
  'fossil-ovo': url(ovo),
  'fossil-chifre-triceratopo': url(chifre),
  'fossil-cranio-rex': url(cranio),
}

/** Os ícones das pegadas do álbum (B5, `arte/itens/pegadas.py`). */
export const MINIATURA_DA_PEGADA: Record<PegadaDoAlbum, string> = {
  'pegada-rex': url(rex),
  'pegada-triceratopo': url(triceratopo),
  'pegada-capivara': url(capivara),
  'pegada-passaro': url(passaro),
}
