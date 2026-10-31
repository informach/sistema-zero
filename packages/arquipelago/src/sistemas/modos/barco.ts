import { passoDaTravessia } from '../barco'
import { CORPO } from '../corpo'
import type { ModoDeMovimento } from './tipos'
import { mudarModo } from './trocas'

/** O mesmo corpo e o mesmo controlador livre, sem nado nem salto no mar aberto. */
export const MODO_BARCO: ModoDeMovimento = {
  id: 'barco',
  valendo: (c) => c.barco !== null,
  passo(c, e) {
    const v = c.barco
    if (!v) return 'chao'
    passoDaTravessia(v, e.dt, e.parado, e.pedidoX, e.pedidoZ)
    c.velY = c.velPedida = c.correnteza = 0
    c.vel.x = c.vel.z = 0
    c.nadando = false
    c.noChao = true
    c.direcao = v.pose.giro + Math.PI / 2
    c.prox.x = v.pe.x
    c.prox.y = v.pe.y + CORPO.doCentroAoPe + CORPO.folga
    c.prox.z = v.pe.z
    return 'direto'
  },
  obstruido(c, e) {
    const v = c.barco
    if (!v) return
    v.distancia = v.anterior.distancia
    v.tempo = v.anterior.tempo
    v.fase = v.anterior.fase
    Object.assign(v.pose, v.anterior.pose)
    Object.assign(v.pe, v.anterior.pe)
    if (v.fase === 'embarque') {
      v.destino = v.origem
      v.fase = 'desembarque'
      v.tempo = 0
      Object.assign(v.inicio, e.p)
      v.inicio.y -= CORPO.doCentroAoPe + CORPO.folga
    } else if (v.fase === 'viagem') {
      v.destino = v.origem
      v.devolvendo = true
    }
    // Mantém o apoio. Uma obstrução no cais impede sair até o caminho ficar livre.
  },
  depois(c, e, _mundo, _mov, _pisou, aviso) {
    if (c.barco?.fase === 'atracado') mudarModo(c, 'chao', e.agora, aviso)
    return true
  },
}
