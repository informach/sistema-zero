import { CORPO } from '../corpo'
import { foraDoLimite, MONTARIA, type MontariaViva } from '../montaria'
import { aproximarVelocidade, PERFIS, passoDoPulo } from '../movimento'
import { CINTURA, CONTROLE_NO_AR, superficieDaAgua } from './chao'
import type { AvisoDeModo, EstadoDoCorpo, ModoDeMovimento } from './tipos'
import { mudarModo } from './trocas'

const PERFIL = { aceleracao: MONTARIA.aceleracao, freio: MONTARIA.freio } as const

/**
 * Montar no dino (o pedido `montar` do Vale): de pé no chão, fora da água e perto dele. O corpo
 * fica onde está; é o dino que vem para baixo da criança (o desenho dele passa a seguir o corpo).
 */
export function montar(
  c: EstadoDoCorpo,
  dino: MontariaViva,
  de: { x: number; z: number },
  agora: number,
  aviso: AvisoDeModo,
): boolean {
  if (c.modo !== 'chao' || c.nadando || !c.noChao || dino.montada) return false
  if (Math.hypot(de.x - dino.x, de.z - dino.z) > MONTARIA.alcance) return false
  mudarModo(c, 'montar', agora, aviso)
  c.montaria = dino
  dino.montada = true
  // Vira para onde o dino olhava: ele vem para baixo dela já de frente.
  c.direcao = dino.giro
  c.embalo.x = c.embalo.y = c.embalo.z = 0
  return true
}

/**
 * Descer: o dino fica parado onde está, olhando para onde ia (`mudarModo` solta a sela), e a
 * criança desce com um pulinho para o lado esquerdo dele (o embalo do chão; o controlador cuida das
 * paredes), para não ficar dentro do corpo dele.
 */
export function desmontar(c: EstadoDoCorpo, agora: number, aviso: AvisoDeModo): void {
  const d = c.direcao
  mudarModo(c, 'chao', agora, aviso)
  c.noChao = false
  c.velY = MONTARIA.descida.subida
  c.embalo.x = -Math.cos(d) * MONTARIA.descida.lado
  c.embalo.z = Math.sin(d) * MONTARIA.descida.lado
}

/**
 * Montada (fase4-04, `sistemas/montaria.ts`): anda como no chão, com o passo e o pulo do dino e o
 * mesmo peso de começar e parar. Leva o corpo o controlador do chão (sobe degrau, gruda no chão),
 * com o colisor maior de quem vai montado. O dino não entra na água nem nada: a água para o passo.
 * O E / Usar desce; a ilha que sai de cena também.
 */
export const MODO_MONTAR: ModoDeMovimento = {
  id: 'montar',
  valendo: (c, mundo) => c.montaria !== null && c.montaria === mundo.montaria,
  passo(c, e) {
    if (e.parado) {
      c.desloc.x = c.desloc.y = c.desloc.z = 0
      c.velDoPasso.x = c.velDoPasso.z = 0
      return 'chao'
    }
    const vel = e.correr ? MONTARIA.correndo : MONTARIA.velocidade
    if (c.noChao) aproximarVelocidade(c.vel, e.pedidoX * vel, e.pedidoZ * vel, PERFIL, e.dt)
    else
      aproximarVelocidade(
        c.vel,
        e.pedidoX * vel * CONTROLE_NO_AR + c.vel.x * (1 - CONTROLE_NO_AR),
        e.pedidoZ * vel * CONTROLE_NO_AR + c.vel.z * (1 - CONTROLE_NO_AR),
        PERFIS.ar,
        e.dt,
      )
    c.velY -= e.gravidade * e.dt
    if (passoDoPulo(c.pulo, c.noChao, e.pulou, e.dt)) c.velY = MONTARIA.pulo
    c.velDoPasso.x = c.vel.x
    c.velDoPasso.z = c.vel.z
    c.desloc.x = c.vel.x * e.dt
    c.desloc.y = c.velY * e.dt
    c.desloc.z = c.vel.z * e.dt
    return 'chao'
  },
  depois(c, e, mundo, mov, pisou, aviso) {
    c.noChao = pisou
    if (pisou && c.velY < 0) c.velY = 0
    c.prox.x = e.p.x + (mov?.x ?? 0)
    c.prox.y = e.p.y + (mov?.y ?? 0)
    c.prox.z = e.p.z + (mov?.z ?? 0)
    // A água e o limite do Vale param o passo: o dino não entra na água nem sai da ilha pela
    // ponte (volta ao lugar de antes no plano, sem embalo).
    const agua = superficieDaAgua(mundo.aguas, e.nivelDoMar, c.prox.x, c.prox.z)
    const dino = c.montaria
    c.beira =
      agua - (c.prox.y - CORPO.doCentroAoPe + CINTURA) > 0
        ? 'agua'
        : dino && foraDoLimite(dino, c.prox.x, c.prox.z) && !foraDoLimite(dino, e.p.x, e.p.z)
          ? 'limite'
          : null
    if (c.beira) {
      c.prox.x = e.p.x
      c.prox.z = e.p.z
      c.vel.x = c.vel.z = 0
      c.velDoPasso.x = c.velDoPasso.z = 0
    }
    if (Math.hypot(c.velDoPasso.x, c.velDoPasso.z) > 0.1)
      c.direcao = Math.atan2(c.velDoPasso.x, c.velDoPasso.z)
    c.velPedida = Math.hypot(c.velDoPasso.x, c.velDoPasso.z)
    if (e.usou && !e.parado && c.noChao) {
      desmontar(c, e.agora, aviso)
      return true
    }
    return false
  },
}
