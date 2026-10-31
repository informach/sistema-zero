import type { LumiId } from '@sistemazero/arquipelago-contracts'
import algodao from '../assets/lumis/miniaturas/algodao.png'
import bolha from '../assets/lumis/miniaturas/bolha.png'
import brigadeiro from '../assets/lumis/miniaturas/brigadeiro.png'
import brotinho from '../assets/lumis/miniaturas/brotinho.png'
import buzio from '../assets/lumis/miniaturas/buzio.png'
import cristal from '../assets/lumis/miniaturas/cristal.png'
import estrelinha from '../assets/lumis/miniaturas/estrelinha.png'
import gelinho from '../assets/lumis/miniaturas/gelinho.png'
import ipe from '../assets/lumis/miniaturas/ipe.png'
import ovinho from '../assets/lumis/miniaturas/ovinho.png'
import perola from '../assets/lumis/miniaturas/perola.png'
import pitanga from '../assets/lumis/miniaturas/pitanga.png'
import pluma from '../assets/lumis/miniaturas/pluma.png'
import quindim from '../assets/lumis/miniaturas/quindim.png'

/**
 * As miniaturas dos 14 Lumis (`arte/lumis/miniaturas.py`, feitas dos próprios modelos do jogo): o
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
}
