import {
  balaoObstruido,
  descerDoBalao,
  guardarBalao,
  passoDoBalao,
  podeDescerDoBalao,
} from '../balao'
import { CORPO } from '../corpo'
import type { ModoDeMovimento } from './tipos'
import { mudarModo } from './trocas'

/** Os pés do corpo, a partir do centro dele (sem alocar). */
const pes = { x: 0, y: 0, z: 0 }

/**
 * O balão das Nuvens (fase4-09): guiado como o barco, pelo controlador livre. O cesto vai aonde o
 * fogo e o direcional pedem e o corpo vai junto; sem nado, sem pulo e sem pegar nada. Pousado,
 * "usar" desce do cesto.
 */
export const MODO_BALAO: ModoDeMovimento = {
  id: 'balao',
  valendo: (c) => c.balao !== null && c.balao.fase !== 'parado',
  passo(c, e) {
    const v = c.balao
    if (!v) return 'chao'
    pes.x = e.p.x
    pes.y = e.p.y - CORPO.doCentroAoPe - CORPO.folga
    pes.z = e.p.z
    passoDoBalao(v, {
      dt: e.dt,
      parado: e.parado,
      subir: e.subir === true,
      pedidoX: e.pedidoX,
      pedidoZ: e.pedidoZ,
      pes,
    })
    c.velY = c.velPedida = c.correnteza = 0
    c.vel.x = c.vel.z = 0
    c.nadando = false
    c.noChao = v.pousado
    // Vira para onde o direcional pede (no cesto a criança olha para onde vai).
    if (!e.parado && Math.hypot(e.pedidoX, e.pedidoZ) > 0.2)
      c.direcao = Math.atan2(e.pedidoX, e.pedidoZ)
    c.prox.x = v.pe.x
    c.prox.y = v.pe.y + CORPO.doCentroAoPe + CORPO.folga
    c.prox.z = v.pe.z
    return 'direto'
  },
  obstruido(c) {
    const v = c.balao
    if (!v) return
    // Entrando no cesto, algo no meio do caminho: desiste e fica a pé.
    if (v.fase === 'embarque') guardarBalao(v)
    else balaoObstruido(v)
  },
  depois(c, e, _mundo, _mov, _pisou, aviso) {
    const v = c.balao
    if (!v) return false
    if (e.usou && !e.parado && podeDescerDoBalao(v)) {
      descerDoBalao(v)
      mudarModo(c, 'chao', e.agora, aviso)
      return true
    }
    // O "usar" no voo é do balão: não abre nada do mundo lá embaixo.
    return e.usou
  },
}
