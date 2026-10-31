import type { LumiId } from '@sistemazero/arquipelago-contracts'
import algodao from '../assets/lumis/miniaturas/algodao.png'
import bolha from '../assets/lumis/miniaturas/bolha.png'
import brigadeiro from '../assets/lumis/miniaturas/brigadeiro.png'
import brigadeiroDeLuz from '../assets/lumis/miniaturas/brigadeiro-de-luz.png'
import brotinho from '../assets/lumis/miniaturas/brotinho.png'
import brotinhoDeLuz from '../assets/lumis/miniaturas/brotinho-de-luz.png'
import buzio from '../assets/lumis/miniaturas/buzio.png'
import buzioDeLuz from '../assets/lumis/miniaturas/buzio-de-luz.png'
import cristal from '../assets/lumis/miniaturas/cristal.png'
import cristalDeLuz from '../assets/lumis/miniaturas/cristal-de-luz.png'
import estrelinha from '../assets/lumis/miniaturas/estrelinha.png'
import gelinho from '../assets/lumis/miniaturas/gelinho.png'
import ipe from '../assets/lumis/miniaturas/ipe.png'
import ipeDeLuz from '../assets/lumis/miniaturas/ipe-de-luz.png'
import ovinho from '../assets/lumis/miniaturas/ovinho.png'
import perola from '../assets/lumis/miniaturas/perola.png'
import perolaDeLuz from '../assets/lumis/miniaturas/perola-de-luz.png'
import pitanga from '../assets/lumis/miniaturas/pitanga.png'
import pluma from '../assets/lumis/miniaturas/pluma.png'
import plumaDeLuz from '../assets/lumis/miniaturas/pluma-de-luz.png'
import quindim from '../assets/lumis/miniaturas/quindim.png'

/**
 * As miniaturas dos 21 Lumis (os sete de luz desde 31/10/2026) (`arte/lumis/miniaturas.py`, feitas dos próprios modelos do jogo): o
 * álbum e a rotina mostram o desenho de cada espécie; quem ainda não foi encontrado aparece como a
 * silhueta escura da mesma forma.
 */
const url = (caminho: string) => new URL(caminho, import.meta.url).href

export const MINIATURA_DO_LUMI: Record<LumiId, string> = {
  estrelinha: url(estrelinha),
  buzio: url(buzio),
  pitanga: url(pitanga),
  ipe: url(ipe),
  quindim: url(quindim),
  brigadeiro: url(brigadeiro),
  bolha: url(bolha),
  perola: url(perola),
  gelinho: url(gelinho),
  cristal: url(cristal),
  ovinho: url(ovinho),
  brotinho: url(brotinho),
  algodao: url(algodao),
  pluma: url(pluma),
  'buzio-de-luz': url(buzioDeLuz),
  'ipe-de-luz': url(ipeDeLuz),
  'brigadeiro-de-luz': url(brigadeiroDeLuz),
  'perola-de-luz': url(perolaDeLuz),
  'cristal-de-luz': url(cristalDeLuz),
  'brotinho-de-luz': url(brotinhoDeLuz),
  'pluma-de-luz': url(plumaDeLuz),
}
