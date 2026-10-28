import type { EixoDeEquilibrio } from '../../estado/contexto'
import { CIPO } from '../cipo'
import { CORPO } from '../corpo'
import { aproximarVelocidade, PERFIS } from '../movimento'
import type { AvisoDeModo, EstadoDoCorpo, ModoDeMovimento, MundoDoMovimento } from './tipos'
import { mudarModo } from './trocas'

/**
 * O equilíbrio no tronco caído (especificação, "Equilíbrio no tronco caído"). Números de partida
 * da especificação, conferidos na sala de testes.
 */
export const EQUILIBRIO = {
  /** Metros por segundo ao longo do tronco (mais devagar que andar). */
  velocidade: 1.6,
  /** O lado pedido vira inclinação e ela volta sozinha nisto (segundos, até 95%). */
  correcao: 0.3,
  /** A inclinação de lado mais forte (radianos). */
  inclinacaoMaxima: 0.25,
  /** Entra com o pé até isto de lado do eixo e até isto acima ou abaixo do tampo. */
  deLadoParaEntrar: 0.25,
  alturaParaEntrar: 0.2,
  /** Entra só andando ao longo do tronco (o cosseno entre o passo e o eixo) e não parado. */
  alinhamento: 0.7,
  velocidadeParaEntrar: 0.3,
  /** Não entra a menos disto de uma ponta (sairia na hora). */
  longeDaPonta: 0.15,
  /** Pedir o lado com força por tanto tempo desce do tronco para aquele lado (não é erro pequeno). */
  descerDeLado: 0.8,
  forcaDeLado: 0.8,
  /** O passinho para fora ao descer de lado (metros por segundo) e o pulinho junto. */
  passoParaFora: 1.4,
  pulinho: 2,
} as const

interface Geometria {
  /** O comprimento do eixo (3D) e a direção no chão (unitária). */
  comprimento: number
  ux: number
  uz: number
}

function geometria(e: EixoDeEquilibrio, saida: Geometria): Geometria {
  const dx = e.b.x - e.a.x
  const dz = e.b.z - e.a.z
  const chao = Math.hypot(dx, dz) || 1
  saida.comprimento = Math.hypot(dx, e.b.y - e.a.y, dz)
  saida.ux = dx / chao
  saida.uz = dz / chao
  return saida
}

const g: Geometria = { comprimento: 0, ux: 0, uz: 1 }

/**
 * O tronco caído debaixo dos pés (com o corpo em `c.prox`, pisando e andando ao longo dele), e
 * onde o pé está nele (metros desde `a`). Nulo se não há.
 */
export function eixoSobOsPes(
  c: EstadoDoCorpo,
  mundo: MundoDoMovimento,
): { eixo: EixoDeEquilibrio; s: number } | null {
  if (!c.noChao) return null
  const vel = Math.hypot(c.velDoPasso.x, c.velDoPasso.z)
  if (vel < EQUILIBRIO.velocidadeParaEntrar) return null
  const pe = c.prox.y - CORPO.doCentroAoPe
  for (const e of mundo.equilibrios) {
    geometria(e, g)
    const px = c.prox.x - e.a.x
    const pz = c.prox.z - e.a.z
    const chao = Math.hypot(e.b.x - e.a.x, e.b.z - e.a.z) || 1
    const ao = px * g.ux + pz * g.uz
    const t = ao / chao
    if (t * g.comprimento < EQUILIBRIO.longeDaPonta) continue
    if ((1 - t) * g.comprimento < EQUILIBRIO.longeDaPonta) continue
    const deLado = Math.abs(px * g.uz - pz * g.ux)
    if (deLado > EQUILIBRIO.deLadoParaEntrar) continue
    const tampo = e.a.y + (e.b.y - e.a.y) * t
    if (Math.abs(pe - tampo) > EQUILIBRIO.alturaParaEntrar) continue
    const alinhado = Math.abs(c.velDoPasso.x * g.ux + c.velDoPasso.z * g.uz) / vel
    if (alinhado < EQUILIBRIO.alinhamento) continue
    return { eixo: e, s: t * g.comprimento }
  }
  return null
}

/** Entra no tronco em `s` (metros desde `a`), com a velocidade de quem vinha andando nele. */
export function entrarNoEquilibrio(
  c: EstadoDoCorpo,
  eixo: EixoDeEquilibrio,
  s: number,
  agora: number,
  aviso: AvisoDeModo,
): void {
  geometria(eixo, g)
  const ao = c.velDoPasso.x * g.ux + c.velDoPasso.z * g.uz
  c.inicio.x = c.prox.x
  c.inicio.y = c.prox.y
  c.inicio.z = c.prox.z
  mudarModo(c, 'equilibrio', agora, aviso)
  c.eixo = eixo
  c.noEixo = s
  c.velNoEixo = Math.max(-EQUILIBRIO.velocidade, Math.min(EQUILIBRIO.velocidade, ao))
  c.balanco = 0
  c.deLado = 0
  c.velY = 0
}

/**
 * A inclinação de lado como o desenho a usa: positiva pende para a direita de quem anda (o
 * `balanco` é medido pela direita do tronco de `a` para `b`; andando de `b` para `a`, inverte).
 */
export function inclinacaoNoDesenho(c: EstadoDoCorpo): number {
  if (!c.eixo) return 0
  geometria(c.eixo, g)
  const deFrente = Math.sin(c.direcao) * g.ux + Math.cos(c.direcao) * g.uz
  return deFrente >= 0 ? c.balanco : -c.balanco
}

const velNoEixo = { x: 0, z: 0 }

/**
 * O equilíbrio: o corpo fica preso ao eixo do tronco e vai para a frente e para trás nele; o pedido
 * de lado vira uma inclinação que volta sozinha (na Kids ninguém cai por erro pequeno). Sai numa
 * ponta (seguindo o passo), pulando, ou pedindo o lado com força por um tempo (desce para aquele
 * lado). Sem gravidade nem controlador: o corpo vai direto para o lugar no tampo.
 */
export const MODO_EQUILIBRIO: ModoDeMovimento = {
  id: 'equilibrio',
  valendo: (c, mundo) => c.eixo !== null && mundo.equilibrios.includes(c.eixo),
  passo(c, e) {
    const eixo = c.eixo
    if (!eixo) return 'direto'
    geometria(eixo, g)
    const ao = e.pedidoX * g.ux + e.pedidoZ * g.uz
    // A direita do tronco olhando de `a` para `b`, no chão.
    const lado = e.pedidoX * -g.uz + e.pedidoZ * g.ux
    velNoEixo.x = c.velNoEixo
    velNoEixo.z = 0
    aproximarVelocidade(velNoEixo, ao * EQUILIBRIO.velocidade * e.ritmo, 0, PERFIS.chao, e.dt)
    c.velNoEixo = velNoEixo.x
    c.noEixo = Math.max(0, Math.min(g.comprimento, c.noEixo + c.velNoEixo * e.dt))
    const k = 1 - Math.exp((-e.dt * 3) / EQUILIBRIO.correcao)
    c.balanco += (lado * EQUILIBRIO.inclinacaoMaxima - c.balanco) * k
    c.deLado = Math.abs(lado) > EQUILIBRIO.forcaDeLado ? c.deLado + e.dt : 0
    // O pé no tampo: o centro fica o tanto do pé mais a folga do controlador acima do eixo.
    const t = c.noEixo / g.comprimento
    c.alvo.x = eixo.a.x + (eixo.b.x - eixo.a.x) * t
    c.alvo.y = eixo.a.y + (eixo.b.y - eixo.a.y) * t + CORPO.doCentroAoPe + CORPO.folga
    c.alvo.z = eixo.a.z + (eixo.b.z - eixo.a.z) * t
    const encaixe = Math.min(1, c.noModo / CIPO.encaixe)
    c.prox.x = c.inicio.x + (c.alvo.x - c.inicio.x) * encaixe
    c.prox.y = c.inicio.y + (c.alvo.y - c.inicio.y) * encaixe
    c.prox.z = c.inicio.z + (c.alvo.z - c.inicio.z) * encaixe
    c.velDoPasso.x = g.ux * c.velNoEixo
    c.velDoPasso.z = g.uz * c.velNoEixo
    return 'direto'
  },
  depois(c, e, _mundo, _mov, _pisou, aviso) {
    const eixo = c.eixo
    if (!eixo) return false
    geometria(eixo, g)
    if (Math.abs(c.velNoEixo) > 0.1) c.direcao = Math.atan2(c.velDoPasso.x, c.velDoPasso.z)
    c.noChao = true
    c.nadando = false
    c.velPedida = Math.abs(c.velNoEixo)
    if (e.pulou) {
      // Pula para a frente no passo em que ia.
      const vx = c.velDoPasso.x
      const vz = c.velDoPasso.z
      mudarModo(c, 'chao', e.agora, aviso)
      c.embalo.x = vx
      c.embalo.z = vz
      c.velY = CORPO.pulo
      c.noChao = false
      return false
    }
    const naPonta =
      (c.noEixo <= 0 && c.velNoEixo < 0) || (c.noEixo >= g.comprimento && c.velNoEixo > 0)
    if (naPonta) {
      // Segue andando para fora do tronco, sem tranco.
      const vx = c.velDoPasso.x
      const vz = c.velDoPasso.z
      mudarModo(c, 'chao', e.agora, aviso)
      c.vel.x = vx
      c.vel.z = vz
      c.velY = 0
      return false
    }
    if (c.deLado > EQUILIBRIO.descerDeLado) {
      const sinal = c.balanco >= 0 ? 1 : -1
      mudarModo(c, 'chao', e.agora, aviso)
      c.embalo.x = -g.uz * sinal * EQUILIBRIO.passoParaFora
      c.embalo.z = g.ux * sinal * EQUILIBRIO.passoParaFora
      c.velY = EQUILIBRIO.pulinho
      c.noChao = false
      return false
    }
    return false
  },
}
