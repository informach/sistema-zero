import type { LumiId } from '@sistemazero/arquipelago-contracts'
import algodaoGlb from '../assets/lumis/algodao.glb'
import bolhaGlb from '../assets/lumis/bolha.glb'
import brigadeiroGlb from '../assets/lumis/brigadeiro.glb'
import brigadeiroDeLuzGlb from '../assets/lumis/brigadeiro-de-luz.glb'
import brotinhoGlb from '../assets/lumis/brotinho.glb'
import brotinhoDeLuzGlb from '../assets/lumis/brotinho-de-luz.glb'
import buzioGlb from '../assets/lumis/buzio.glb'
import buzioDeLuzGlb from '../assets/lumis/buzio-de-luz.glb'
import cristalGlb from '../assets/lumis/cristal.glb'
import cristalDeLuzGlb from '../assets/lumis/cristal-de-luz.glb'
import estrelinhaGlb from '../assets/lumis/estrelinha.glb'
import gelinhoGlb from '../assets/lumis/gelinho.glb'
import ipeGlb from '../assets/lumis/ipe.glb'
import ipeDeLuzGlb from '../assets/lumis/ipe-de-luz.glb'
import ovinhoGlb from '../assets/lumis/ovinho.glb'
import perolaGlb from '../assets/lumis/perola.glb'
import perolaDeLuzGlb from '../assets/lumis/perola-de-luz.glb'
import pitangaGlb from '../assets/lumis/pitanga.glb'
import plumaGlb from '../assets/lumis/pluma.glb'
import plumaDeLuzGlb from '../assets/lumis/pluma-de-luz.glb'
import quindimGlb from '../assets/lumis/quindim.glb'

/**
 * O modelo de cada espécie de Lumi (`arte/lumis`): os 14 da lanterna e os sete Lumis de luz dos
 * baús (B12). Os borrões da noite (os Lumis que moram na ilha) e a rotina na horta leem daqui.
 */
const url = (arquivo: string) => new URL(arquivo, import.meta.url).href

export const MODELO_DO_LUMI: Readonly<Record<LumiId, string>> = {
  estrelinha: url(estrelinhaGlb),
  buzio: url(buzioGlb),
  pitanga: url(pitangaGlb),
  ipe: url(ipeGlb),
  quindim: url(quindimGlb),
  brigadeiro: url(brigadeiroGlb),
  bolha: url(bolhaGlb),
  perola: url(perolaGlb),
  gelinho: url(gelinhoGlb),
  cristal: url(cristalGlb),
  ovinho: url(ovinhoGlb),
  brotinho: url(brotinhoGlb),
  algodao: url(algodaoGlb),
  pluma: url(plumaGlb),
  'buzio-de-luz': url(buzioDeLuzGlb),
  'ipe-de-luz': url(ipeDeLuzGlb),
  'brigadeiro-de-luz': url(brigadeiroDeLuzGlb),
  'perola-de-luz': url(perolaDeLuzGlb),
  'cristal-de-luz': url(cristalDeLuzGlb),
  'brotinho-de-luz': url(brotinhoDeLuzGlb),
  'pluma-de-luz': url(plumaDeLuzGlb),
}
