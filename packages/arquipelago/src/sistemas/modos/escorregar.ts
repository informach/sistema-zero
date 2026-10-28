import type { Escorregador } from '../../estado/contexto'
import { CIPO, type Ponto } from '../cipo'
import { CORPO } from '../corpo'
import { MATERIAIS } from '../materiais-fisicos'
import type { AvisoDeModo, EstadoDoCorpo, ModoDeMovimento, MundoDoMovimento } from './tipos'
import { mudarModo } from './trocas'

/** O escorregador (especificação, "Escorregar"). Números de partida, conferidos na sala de testes. */
export const ESCORREGAR = {
  /** O atrito da pista (`a = g × (sen θ − μ × cos θ)`). */
  atrito: MATERIAIS.plastico.atrito,
  /** A velocidade mais alta na pista (m/s): rápido, mas uma criança acompanha. */
  velocidadeMaxima: 5.5,
  /** Nunca para no meio: a pista leva o corpo pelo menos nesta velocidade. */
  velocidadeMinima: 0.8,
  /** Metros por segundo de lado, pedindo, dentro da pista. */
  deLado: 1.2,
  /** Não entra a menos disto do fim (sairia na hora). */
  longeDoFim: 0.6,
  /** Entra com o pé até isto acima ou abaixo da pista. */
  alturaParaEntrar: 0.35,
  /** Pular na pista sai com esta fração do pulo. */
  pulo: 0.6,
} as const

/** Um ponto da pista: onde, para onde ela desce (no chão, unitário) e a inclinação (descendo > 0). */
export interface PontoDaPista extends Ponto {
  dx: number
  dz: number
  inclinacao: number
}

/** O comprimento da pista (somando os trechos, em 3D). */
export function comprimentoDaPista(e: Escorregador): number {
  let total = 0
  for (let i = 1; i < e.pontos.length; i++) {
    const a = e.pontos[i - 1]
    const b = e.pontos[i]
    if (a && b) total += Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z)
  }
  return total
}

/** O ponto da pista a `s` metros do alto (o último trecho se `s` passar do fim). */
export function pontoDaPista(e: Escorregador, s: number, saida: PontoDaPista): PontoDaPista {
  let resto = Math.max(0, s)
  for (let i = 1; i < e.pontos.length; i++) {
    const a = e.pontos[i - 1]
    const b = e.pontos[i]
    if (!a || !b) continue
    const comp = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z) || 1e-6
    if (resto <= comp || i === e.pontos.length - 1) {
      const t = Math.min(1, resto / comp)
      const chao = Math.hypot(b.x - a.x, b.z - a.z) || 1e-6
      saida.x = a.x + (b.x - a.x) * t
      saida.y = a.y + (b.y - a.y) * t
      saida.z = a.z + (b.z - a.z) * t
      saida.dx = (b.x - a.x) / chao
      saida.dz = (b.z - a.z) / chao
      saida.inclinacao = Math.atan2(a.y - b.y, chao)
      return saida
    }
    resto -= comp
  }
  return saida
}

const aqui: PontoDaPista = { x: 0, y: 0, z: 0, dx: 1, dz: 0, inclinacao: 0 }

/**
 * A pista debaixo dos pés (com o corpo em `c.prox`): na largura dela, na altura dela e longe do fim.
 * Devolve o escorregador, onde o pé está nela e de que lado, ou nulo.
 */
export function pistaSobOsPes(
  c: EstadoDoCorpo,
  mundo: MundoDoMovimento,
): { escorregador: Escorregador; s: number; lado: number } | null {
  const pe = c.prox.y - CORPO.doCentroAoPe
  for (const e of mundo.escorregadores) {
    const total = comprimentoDaPista(e)
    let s0 = 0
    for (let i = 1; i < e.pontos.length; i++) {
      const a = e.pontos[i - 1]
      const b = e.pontos[i]
      if (!a || !b) continue
      const comp = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z)
      const chao = Math.hypot(b.x - a.x, b.z - a.z) || 1e-6
      const ux = (b.x - a.x) / chao
      const uz = (b.z - a.z) / chao
      const px = c.prox.x - a.x
      const pz = c.prox.z - a.z
      const t = (px * ux + pz * uz) / chao
      if (t >= 0 && t <= 1) {
        const lado = px * -uz + pz * ux
        const s = s0 + t * comp
        const superficie = a.y + (b.y - a.y) * t
        if (
          Math.abs(lado) < e.largura / 2 &&
          Math.abs(pe - superficie) < ESCORREGAR.alturaParaEntrar &&
          s < total - ESCORREGAR.longeDoFim
        ) {
          return { escorregador: e, s, lado }
        }
      }
      s0 += comp
    }
  }
  return null
}

/** Senta no escorregador em `s`, com a velocidade de quem chegou andando (só a que desce). */
export function entrarNoEscorregador(
  c: EstadoDoCorpo,
  e: Escorregador,
  s: number,
  lado: number,
  agora: number,
  aviso: AvisoDeModo,
): void {
  pontoDaPista(e, s, aqui)
  const desce = c.velDoPasso.x * aqui.dx + c.velDoPasso.z * aqui.dz
  c.inicio.x = c.prox.x
  c.inicio.y = c.prox.y
  c.inicio.z = c.prox.z
  mudarModo(c, 'escorregar', agora, aviso)
  c.escorregador = e
  c.naPista = s
  c.velNaPista = Math.max(0, desce)
  c.ladoNaPista = lado
  c.velY = 0
}

/**
 * Escorregar: o corpo segue a pista sentado; a velocidade cresce com a inclinação
 * (`a = g × (sen θ − μ × cos θ)`, com o atrito do plástico), com teto, e nunca para no meio. Pedir o
 * lado mexe um pouco dentro da pista. No fim, a velocidade vira passo no chão (continua correndo um
 * pouco e para sozinho); pular sai. A mesma descida dá sempre o mesmo tempo (passo fixo).
 */
export const MODO_ESCORREGAR: ModoDeMovimento = {
  id: 'escorregar',
  valendo: (c, mundo) => c.escorregador !== null && mundo.escorregadores.includes(c.escorregador),
  passo(c, e) {
    const pista = c.escorregador
    if (!pista) return 'direto'
    pontoDaPista(pista, c.naPista, aqui)
    const a =
      e.gravidade * (Math.sin(aqui.inclinacao) - ESCORREGAR.atrito * Math.cos(aqui.inclinacao))
    c.velNaPista = Math.max(
      ESCORREGAR.velocidadeMinima,
      Math.min(ESCORREGAR.velocidadeMaxima, c.velNaPista + a * e.dt),
    )
    c.naPista += c.velNaPista * e.dt
    const lado = e.pedidoX * -aqui.dz + e.pedidoZ * aqui.dx
    const limite = pista.largura / 2 - CORPO.raio * 0.8
    c.ladoNaPista = Math.max(
      -limite,
      Math.min(limite, c.ladoNaPista + lado * ESCORREGAR.deLado * e.dt),
    )
    pontoDaPista(pista, c.naPista, aqui)
    c.alvo.x = aqui.x - aqui.dz * c.ladoNaPista
    c.alvo.y = aqui.y + CORPO.doCentroAoPe + CORPO.folga
    c.alvo.z = aqui.z + aqui.dx * c.ladoNaPista
    const k = Math.min(1, c.noModo / CIPO.encaixe)
    c.prox.x = c.inicio.x + (c.alvo.x - c.inicio.x) * k
    c.prox.y = c.inicio.y + (c.alvo.y - c.inicio.y) * k
    c.prox.z = c.inicio.z + (c.alvo.z - c.inicio.z) * k
    c.velDoPasso.x = aqui.dx * c.velNaPista
    c.velDoPasso.z = aqui.dz * c.velNaPista
    return 'direto'
  },
  depois(c, e, _mundo, _mov, _pisou, aviso) {
    const pista = c.escorregador
    if (!pista) return false
    c.direcao = Math.atan2(c.velDoPasso.x, c.velDoPasso.z)
    c.noChao = true
    c.nadando = false
    c.velPedida = c.velNaPista
    const vx = c.velDoPasso.x
    const vz = c.velDoPasso.z
    if (e.pulou) {
      mudarModo(c, 'chao', e.agora, aviso)
      c.embalo.x = vx
      c.embalo.z = vz
      c.velY = CORPO.pulo * ESCORREGAR.pulo
      c.noChao = false
      return false
    }
    if (c.naPista >= comprimentoDaPista(pista)) {
      // No fim: a velocidade vira passo no chão (o peso do chão freia sozinho).
      mudarModo(c, 'chao', e.agora, aviso)
      c.vel.x = vx
      c.vel.z = vz
      c.velY = 0
    }
    return false
  },
}
