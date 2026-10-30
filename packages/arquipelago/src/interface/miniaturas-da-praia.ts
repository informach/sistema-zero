import caracol from '../assets/icones/concha-caracol.png'
import listrada from '../assets/icones/concha-listrada.png'
import mexilhao from '../assets/icones/concha-mexilhao.png'
import tigre from '../assets/icones/concha-tigre.png'
import vieira from '../assets/icones/concha-vieira.png'
import estrela from '../assets/icones/estrela-do-mar.png'
import garoupa from '../assets/icones/peixe-garoupa.png'
import linguado from '../assets/icones/peixe-linguado.png'
import robalo from '../assets/icones/peixe-robalo.png'
import sardinha from '../assets/icones/peixe-sardinha.png'
import voador from '../assets/icones/peixe-voador.png'
import type { LembrancaDaPraia } from '../sistemas/colecoes-da-praia'

const url = (caminho: string) => new URL(caminho, import.meta.url).href

export const MINIATURA_DA_PRAIA: Record<LembrancaDaPraia, string> = {
  'concha-caracol': url(caracol),
  'concha-listrada': url(listrada),
  'concha-mexilhao': url(mexilhao),
  'concha-tigre': url(tigre),
  'concha-vieira': url(vieira),
  'estrela-do-mar': url(estrela),
  'peixe-garoupa': url(garoupa),
  'peixe-linguado': url(linguado),
  'peixe-robalo': url(robalo),
  'peixe-sardinha': url(sardinha),
  'peixe-voador': url(voador),
}
