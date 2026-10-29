import { CORPO } from '../corpo'
import { contemMergulho, correnteDoMergulho, MERGULHO } from '../mergulho'
import { aproximarVelocidade, PERFIS } from '../movimento'
import type { ModoDeMovimento } from './tipos'
import { mudarModo } from './trocas'

export const MODO_MERGULHO: ModoDeMovimento = {
  id: 'mergulho',
  valendo: (c, mundo) => !!c.mergulho?.ativo && !!mundo.mergulhos?.includes(c.mergulho),
  passo(c, e) {
    c.desloc.x = c.desloc.y = c.desloc.z = 0
    if (e.parado || !c.mergulho) return 'cipo'
    const v = c.mergulho
    c.nadando = true
    c.noChao = false
    aproximarVelocidade(
      c.vel,
      e.pedidoX * MERGULHO.horizontal,
      e.pedidoZ * MERGULHO.horizontal,
      PERFIS.agua,
      e.dt,
    )
    // Na entrada desce suavemente até a cabeça ficar na água. Depois, só o comando vertical.
    const vertical = e.subir ? 1 : e.descer || (c.noModo < 1 && e.p.y > v.superficie - 0.7) ? -1 : 0
    const alvo = vertical * MERGULHO.vertical
    const passo = (vertical ? 6 : 4) * e.dt
    c.velY += Math.max(-passo, Math.min(passo, alvo - c.velY))
    correnteDoMergulho(v, e.p, c.velDoPasso)
    c.desloc.x = (c.vel.x + c.velDoPasso.x) * e.dt
    c.desloc.z = (c.vel.z + c.velDoPasso.z) * e.dt
    c.desloc.y = Math.max(v.fundo + CORPO.doCentroAoPe + CORPO.folga - e.p.y, c.velY * e.dt)
    c.velPedida = Math.hypot(c.vel.x, c.velY, c.vel.z)
    if (Math.hypot(c.vel.x, c.vel.z) > 0.01) c.direcao = Math.atan2(c.vel.x, c.vel.z)
    return 'cipo'
  },
  depois(c, e, _mundo, mov, _pisou, aviso) {
    if (e.parado) {
      Object.assign(c.prox, e.p)
      return false
    }
    c.prox.x = e.p.x + (mov?.x ?? 0)
    c.prox.y = e.p.y + (mov?.y ?? 0)
    c.prox.z = e.p.z + (mov?.z ?? 0)
    const v = c.mergulho
    if (v && ((e.subir && c.prox.y >= v.superficie + 0.15) || !contemMergulho(v, c.prox))) {
      c.embalo.x = c.vel.x
      c.embalo.z = c.vel.z
      mudarModo(c, 'chao', e.agora, aviso)
    }
    return false
  },
}
