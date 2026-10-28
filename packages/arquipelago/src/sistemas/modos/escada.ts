import type { EscadaViva } from '../../estado/contexto'
import { CIPO } from '../cipo'
import { CORPO } from '../corpo'
import type {
  AvisoDeModo,
  EntradaDoPasso,
  EstadoDoCorpo,
  ModoDeMovimento,
  MundoDoMovimento,
} from './tipos'
import { mudarModo } from './trocas'

/** A escada reta (especificação, "Subir a escada"). Números de partida, conferidos na sala de testes. */
export const ESCADA = {
  /** Metros por segundo subindo ou descendo. */
  velocidade: 1.5,
  /** O corpo fica a isto da escada (do eixo dos degraus ao meio do corpo). */
  afastamento: CORPO.raio + 0.12,
  /** Embaixo: andar contra a escada por isto (segundos) pega nela; no ar, pega na hora. */
  esperaParaPegar: 0.15,
  /** Pega com o corpo até isto da escada e até isto acima do pé dela. */
  distanciaParaPegar: 0.65,
  alturaParaPegar: 0.6,
  /** Em cima: no deque, até isto do alto da escada, andando para ela, desce por ela. */
  distanciaParaDescer: 0.9,
  /** Indo e vindo, o pedido tem de apontar para a escada (cosseno). */
  alinhamento: 0.6,
  /** Chegando no alto, o corpo vai até a saída no deque em tanto tempo. */
  saida: 0.4,
  /** Pular solta para trás com isto (para longe da escada, e para cima). */
  pulo: { paraTras: 2.2, paraCima: 4 },
} as const

interface Geometria {
  altura: number
  /** Para onde quem sobe olha a escada estando de costas para ela: do deque para fora, no chão. */
  nx: number
  nz: number
}

function geometria(e: EscadaViva, saida: Geometria): Geometria {
  saida.altura = e.topo.y - e.base.y
  const dx = e.base.x - e.saida.x
  const dz = e.base.z - e.saida.z
  const d = Math.hypot(dx, dz) || 1
  saida.nx = dx / d
  saida.nz = dz / d
  return saida
}

const g: Geometria = { altura: 0, nx: 0, nz: 1 }

/**
 * Pode pegar uma escada agora? Embaixo, encostado nela e andando para ela (depois de
 * `esperaParaPegar`, ou na hora no ar); em cima, no deque, perto do alto e andando para fora. Devolve
 * a escada e de onde começa (a altura do pé nela), ou nulo; conta o tempo contra ela em `c`.
 */
export function escadaParaPegar(
  c: EstadoDoCorpo,
  e: EntradaDoPasso,
  mundo: MundoDoMovimento,
): { escada: EscadaViva; altura: number } | null {
  const pedido = Math.hypot(e.pedidoX, e.pedidoZ)
  if (pedido < 0.2) {
    c.contraAEscada = 0
    return null
  }
  const pe = c.prox.y - CORPO.doCentroAoPe
  for (const escada of mundo.escadas) {
    geometria(escada, g)
    // Na largura da escada (de lado, pelo plano dos degraus).
    const lx = c.prox.x - escada.base.x
    const lz = c.prox.z - escada.base.z
    if (Math.abs(lx * -g.nz + lz * g.nx) > escada.largura / 2) continue
    const para = (e.pedidoX * g.nx + e.pedidoZ * g.nz) / pedido
    // Embaixo: na frente dos degraus, perto, andando para a escada (contra a normal).
    const frente = lx * g.nx + lz * g.nz
    if (
      pe - escada.base.y < ESCADA.alturaParaPegar &&
      frente > 0 &&
      frente < ESCADA.distanciaParaPegar &&
      para < -ESCADA.alinhamento
    ) {
      c.contraAEscada += e.dt
      if (!c.noChao || c.contraAEscada >= ESCADA.esperaParaPegar) {
        return { escada, altura: Math.max(0, pe - escada.base.y) }
      }
      return null
    }
    // Em cima: no deque (atrás da escada), perto do alto, andando para fora.
    const tx = c.prox.x - escada.topo.x
    const tz = c.prox.z - escada.topo.z
    const atras = -(tx * g.nx + tz * g.nz)
    if (
      c.noChao &&
      Math.abs(pe - escada.topo.y) < 0.3 &&
      atras > 0 &&
      atras < ESCADA.distanciaParaDescer &&
      para > ESCADA.alinhamento
    ) {
      return { escada, altura: g.altura }
    }
  }
  c.contraAEscada = 0
  return null
}

/** Pega na escada com o pé em `altura` (desde a base). */
export function pegarEscada(
  c: EstadoDoCorpo,
  escada: EscadaViva,
  altura: number,
  agora: number,
  aviso: AvisoDeModo,
): void {
  geometria(escada, g)
  c.inicio.x = c.prox.x
  c.inicio.y = c.prox.y
  c.inicio.z = c.prox.z
  mudarModo(c, 'escada', agora, aviso)
  c.escada = escada
  c.naEscada = Math.min(g.altura, Math.max(0, altura))
  c.saindoDaEscada = 0
  c.velY = 0
}

/**
 * Subir a escada reta: frente e trás sobem e descem (a câmera não importa), de frente para os
 * degraus. No alto, o corpo vai até a saída no deque e volta ao chão (sem ficar preso na borda);
 * embaixo, solta; pular solta para trás; usar solta onde está. O corpo vai direto para o lugar.
 */
export const MODO_ESCADA: ModoDeMovimento = {
  id: 'escada',
  valendo: (c, mundo) => c.escada !== null && mundo.escadas.includes(c.escada),
  passo(c, e) {
    const escada = c.escada
    if (!escada) return 'direto'
    geometria(escada, g)
    if (c.saindoDaEscada > 0) {
      // Saindo em cima: do degrau de cima até a saída no deque, suave.
      c.saindoDaEscada = Math.min(1, c.saindoDaEscada + e.dt / ESCADA.saida)
      const t = c.saindoDaEscada
      const k = t * t * (3 - 2 * t)
      c.alvo.x = escada.saida.x
      c.alvo.y = escada.saida.y + CORPO.doCentroAoPe + CORPO.folga
      c.alvo.z = escada.saida.z
      c.prox.x = c.inicio.x + (c.alvo.x - c.inicio.x) * k
      // Sobe primeiro e depois avança: não raspa a quina do deque.
      const ky = Math.min(1, k * 1.6)
      c.prox.y = c.inicio.y + (c.alvo.y - c.inicio.y) * ky
      c.prox.z = c.inicio.z + (c.alvo.z - c.inicio.z) * k
      return 'direto'
    }
    c.naEscada = Math.max(0, Math.min(g.altura, c.naEscada + e.iz * ESCADA.velocidade * e.dt))
    const t = g.altura > 0 ? c.naEscada / g.altura : 0
    c.alvo.x = escada.base.x + (escada.topo.x - escada.base.x) * t + g.nx * ESCADA.afastamento
    c.alvo.y = escada.base.y + c.naEscada + CORPO.doCentroAoPe + CORPO.folga
    c.alvo.z = escada.base.z + (escada.topo.z - escada.base.z) * t + g.nz * ESCADA.afastamento
    const k = Math.min(1, c.noModo / CIPO.encaixe)
    c.prox.x = c.inicio.x + (c.alvo.x - c.inicio.x) * k
    c.prox.y = c.inicio.y + (c.alvo.y - c.inicio.y) * k
    c.prox.z = c.inicio.z + (c.alvo.z - c.inicio.z) * k
    if (e.iz > 0.3 && c.naEscada >= g.altura) {
      // Chegou no alto pedindo para subir: vai para a saída.
      c.inicio.x = c.prox.x
      c.inicio.y = c.prox.y
      c.inicio.z = c.prox.z
      c.saindoDaEscada = 1e-6
    }
    return 'direto'
  },
  depois(c, e, _mundo, _mov, _pisou, aviso) {
    const escada = c.escada
    if (!escada) return false
    geometria(escada, g)
    // De frente para os degraus (de costas para fora); saindo, de frente para o deque.
    c.direcao = Math.atan2(-g.nx, -g.nz)
    c.noChao = false
    c.nadando = false
    c.velPedida = 1
    if (c.saindoDaEscada >= 1) {
      mudarModo(c, 'chao', e.agora, aviso)
      c.noChao = true
      return false
    }
    if (c.saindoDaEscada > 0) return false
    if (e.pulou) {
      mudarModo(c, 'chao', e.agora, aviso)
      c.embalo.x = g.nx * ESCADA.pulo.paraTras
      c.embalo.z = g.nz * ESCADA.pulo.paraTras
      c.velY = ESCADA.pulo.paraCima
      c.direcao = Math.atan2(g.nx, g.nz)
      return false
    }
    if ((e.iz < -0.3 && c.naEscada <= 0) || (e.usou && !e.parado)) {
      // Embaixo (ou usando): solta, com um passinho para trás.
      mudarModo(c, 'chao', e.agora, aviso)
      c.embalo.x = g.nx * 0.8
      c.embalo.z = g.nz * 0.8
      c.velY = 0
      return e.usou
    }
    return false
  },
}
