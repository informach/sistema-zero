import azul from '../assets/icones/cristal-azul.png'
import rosa from '../assets/icones/cristal-rosa.png'
import roxo from '../assets/icones/cristal-roxo.png'
import verde from '../assets/icones/cristal-verde.png'
import cadente from '../assets/icones/estrela-cadente.png'
import cintilante from '../assets/icones/estrela-cintilante.png'
import sorriso from '../assets/icones/estrela-sorriso.png'
import trio from '../assets/icones/estrela-trio.png'
import clave from '../assets/icones/nota-clave-de-sol.png'
import colcheia from '../assets/icones/nota-colcheia.png'
import dupla from '../assets/icones/nota-dupla.png'
import seminima from '../assets/icones/nota-seminima.png'
import type { LembrancaDasIlhas } from '../sistemas/colecoes-das-ilhas'

const url = (caminho: string) => new URL(caminho, import.meta.url).href

/** Os ícones de `arte/itens/icones_paleta.py`, um por peça das coleções do Pico e das Nuvens. */
export const MINIATURA_DAS_ILHAS: Record<LembrancaDasIlhas, string> = {
  'nota-seminima': url(seminima),
  'nota-colcheia': url(colcheia),
  'nota-dupla': url(dupla),
  'nota-clave-de-sol': url(clave),
  'cristal-azul': url(azul),
  'cristal-roxo': url(roxo),
  'cristal-verde': url(verde),
  'cristal-rosa': url(rosa),
  'estrela-cadente': url(cadente),
  'estrela-sorriso': url(sorriso),
  'estrela-cintilante': url(cintilante),
  'estrela-trio': url(trio),
}
