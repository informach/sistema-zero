import { CORPO } from '../corpo'
import { aproximarVelocidade } from '../movimento'
import { naColunaDaCorrente, PLANADOR, subidaDaCorrente } from '../planador'
import { CINTURA, superficieDaAgua } from './chao'
import type { AvisoDeModo, EntradaDoPasso, EstadoDoCorpo, ModoDeMovimento } from './tipos'
import { mudarModo } from './trocas'

const PERFIL = { aceleracao: PLANADOR.aceleracao, freio: PLANADOR.freio } as const

/**
 * Pode abrir o planador agora? Com ele na mochila, no ar (há `noArHa` fora do chão: o pulo de
 * beirada continua sendo pulo), fora da água e sem subir rápido (perto do alto do pulo ou caindo).
 */
export function podeAbrirOPlanador(c: EstadoDoCorpo, e: EntradaDoPasso): boolean {
  return (
    !!e.planador &&
    !e.parado &&
    c.modo === 'chao' &&
    !c.noChao &&
    !c.nadando &&
    c.pulo.foraDoChao > PLANADOR.noArHa &&
    c.velY < PLANADOR.subindoAte
  )
}

/** Abre o planador: a velocidade no plano continua (sem tranco), a de cair vai freando. */
export function abrirOPlanador(c: EstadoDoCorpo, agora: number, aviso: AvisoDeModo): void {
  const vx = c.velDoPasso.x
  const vz = c.velDoPasso.z
  mudarModo(c, 'planar', agora, aviso)
  c.vel.x = vx
  c.vel.z = vz
  c.embalo.x = c.embalo.y = c.embalo.z = 0
}

/** Fecha e volta ao chão (ou ao ar): o que o planador levava fica no embalo até pisar. */
function fechar(c: EstadoDoCorpo, e: EntradaDoPasso, aviso: AvisoDeModo, pisou: boolean): void {
  const vx = c.vel.x
  const vz = c.vel.z
  mudarModo(c, 'chao', e.agora, aviso)
  c.noChao = pisou
  if (pisou) {
    // Pousa correndo: a velocidade do chão parte da que trazia e o peso do chão freia.
    c.vel.x = vx
    c.vel.z = vz
    if (c.velY < 0) c.velY = 0
  } else {
    c.embalo.x = vx
    c.embalo.z = vz
  }
}

/**
 * Planar (fase3-09, `sistemas/planador.ts`): o corpo segue para a frente e desce devagar. O
 * controle guia como no chão (relativo à câmera), com o peso do ar; soltando, segue para onde olha.
 * Numa corrente de ar, sobe até o alto dela, parado no lugar enquanto não se pede uma direção. Leva o corpo o controlador do chão (no ar ele não
 * sobe degrau), então pisar é saber que pousou. Pular fecha; a água também.
 */
export const MODO_PLANAR: ModoDeMovimento = {
  id: 'planar',
  valendo: () => true,
  passo(c, e, mundo) {
    if (e.parado) {
      c.desloc.x = c.desloc.y = c.desloc.z = 0
      c.velDoPasso.x = c.velDoPasso.z = 0
      return 'chao'
    }
    const pede = Math.hypot(e.pedidoX, e.pedidoZ) > 0.1
    const pes = e.p.y - CORPO.doCentroAoPe
    const subida = subidaDaCorrente(mundo.correntes, e.p.x, pes, e.p.z)
    // Soltando, segue para onde olha; na coluna de uma corrente (dentro dela ou acima dela), o ar
    // segura no lugar (senão o planador sairia antes de subir) e para sair é só pedir uma direção.
    const solto = naColunaDaCorrente(mundo.correntes, e.p.x, pes, e.p.z) ? 0 : PLANADOR.solto
    const alvoX = pede ? e.pedidoX * PLANADOR.velocidade : Math.sin(c.direcao) * solto
    const alvoZ = pede ? e.pedidoZ * PLANADOR.velocidade : Math.cos(c.direcao) * solto
    aproximarVelocidade(c.vel, alvoX, alvoZ, PERFIL, e.dt)
    const alvoY = subida ?? -PLANADOR.descida
    c.velY += (alvoY - c.velY) * Math.min(1, PLANADOR.ajusteVertical * e.dt)
    c.velDoPasso.x = c.vel.x
    c.velDoPasso.z = c.vel.z
    c.desloc.x = c.vel.x * e.dt
    c.desloc.y = c.velY * e.dt
    c.desloc.z = c.vel.z * e.dt
    return 'chao'
  },
  depois(c, e, mundo, mov, pisou, aviso) {
    c.prox.x = e.p.x + (mov?.x ?? 0)
    c.prox.y = e.p.y + (mov?.y ?? 0)
    c.prox.z = e.p.z + (mov?.z ?? 0)
    if (Math.hypot(c.vel.x, c.vel.z) > 0.1) c.direcao = Math.atan2(c.vel.x, c.vel.z)
    c.velPedida = Math.hypot(c.vel.x, c.vel.z)
    if (e.parado) return false
    const agua = superficieDaAgua(mundo.aguas, e.nivelDoMar, c.prox.x, c.prox.z)
    const naAgua = agua - (c.prox.y - CORPO.doCentroAoPe + CINTURA) > 0
    if (pisou || naAgua || e.pulou) fechar(c, e, aviso, pisou)
    return false
  },
}
