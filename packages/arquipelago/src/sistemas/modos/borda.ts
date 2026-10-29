import type { BordaViva } from '../../estado/contexto'
import { CIPO, type Ponto } from '../cipo'
import { alturaDoPulo, CORPO } from '../corpo'
import type {
  AvisoDeModo,
  EntradaDoPasso,
  EstadoDoCorpo,
  ModoDeMovimento,
  MundoDoMovimento,
} from './tipos'
import { mudarModo } from './trocas'

/** Agarrar a borda e subir (especificação, "Agarrar a borda e subir"). Números de partida. */
export const BORDA = {
  /** As mãos, de braços para cima, ficam isto acima do meio do corpo (o avatar é chibi). */
  maosAcimaDoCentro: 0.9,
  /** Agarra com as mãos até isto acima ou abaixo da quina... */
  alcanceDeAltura: 0.35,
  /** ...e de fora até isto (os 0,35 da especificação mais os 0,25 da assistência de alcance). */
  alcanceDeFora: 0.6,
  /** Só agarra caindo (ou quase no alto do pulo): subindo, passa direto. */
  velYParaAgarrar: 0.5,
  /** Longe das pontas da quina (as mãos cabem nela). */
  longeDaPonta: 0.2,
  /** De pendurado até de pé em cima, em tanto tempo. */
  subida: 0.5,
  /**
   * Pendurado, o corpo fica a isto da parede (do meio do corpo à quina, no chão). ⚠️ Mais que o
   * raio com a folga do controlador: mais perto, o Rapier não deixa chegar, o encaixe vira
   * "bloqueado" no fim e a criança solta sozinha (achado em 29/10/2026 no navegador).
   */
  daParede: CORPO.raio + CORPO.folga + 0.02,
  /** Em cima, o corpo termina isto para dentro da quina. */
  paraDentro: 0.6,
  /** Pendurado, anda de lado na quina a isto (m/s). */
  deLado: 0.8,
  /** Soltou uma borda: não pega de novo nisto (segundos). */
  esperaParaPegarDeNovo: 0.5,
  /** Pular da borda sai para longe da parede com isto (e para cima). */
  pulo: { paraFora: 2.5, paraCima: 5 },
} as const

/** A beirada mais alta que se alcança pulando e agarrando a quina (as mãos no alto do pulo). */
export function beiradaMaximaAgarrando(gravidade: number): number {
  return (
    alturaDoPulo(gravidade) + CORPO.doCentroAoPe + BORDA.maosAcimaDoCentro + BORDA.alcanceDeAltura
  )
}

interface Geometria {
  comprimento: number
  ux: number
  uz: number
  /** Para fora da quina, no chão (unitário). */
  nx: number
  nz: number
}

function geometria(b: BordaViva, saida: Geometria): Geometria {
  const dx = b.b.x - b.a.x
  const dz = b.b.z - b.a.z
  const L = Math.hypot(dx, dz) || 1e-6
  saida.comprimento = L
  saida.ux = dx / L
  saida.uz = dz / L
  // A perpendicular que aponta para o ponto de fora.
  let nx = -saida.uz
  let nz = saida.ux
  if ((b.fora.x - b.a.x) * nx + (b.fora.z - b.a.z) * nz < 0) {
    nx = -nx
    nz = -nz
  }
  saida.nx = nx
  saida.nz = nz
  return saida
}

const g: Geometria = { comprimento: 1, ux: 1, uz: 0, nx: 0, nz: 1 }
const maos: Ponto = { x: 0, y: 0, z: 0 }

/**
 * Pode agarrar uma borda agora? No ar, caindo, com as mãos (acima de `c.prox`) perto de uma quina,
 * do lado de fora. Devolve a borda e onde nela (metros desde `a`), ou nulo.
 */
export function bordaAoAlcance(
  c: EstadoDoCorpo,
  e: EntradaDoPasso,
  mundo: MundoDoMovimento,
): { borda: BordaViva; s: number } | null {
  if (c.noChao || c.velY > BORDA.velYParaAgarrar) return null
  if (e.agora - c.soltouDaBorda < BORDA.esperaParaPegarDeNovo * 1000) return null
  maos.x = c.prox.x
  maos.y = c.prox.y + BORDA.maosAcimaDoCentro
  maos.z = c.prox.z
  for (const b of mundo.bordas) {
    geometria(b, g)
    const px = maos.x - b.a.x
    const pz = maos.z - b.a.z
    const s = px * g.ux + pz * g.uz
    if (s < BORDA.longeDaPonta || s > g.comprimento - BORDA.longeDaPonta) continue
    const fora = px * g.nx + pz * g.nz
    if (fora < -0.1 || fora > BORDA.alcanceDeFora) continue
    const quina = b.a.y + (b.b.y - b.a.y) * (s / g.comprimento)
    if (Math.abs(maos.y - quina) > BORDA.alcanceDeAltura) continue
    return { borda: b, s }
  }
  return null
}

/** Pendura na borda em `s` (metros desde `a`). */
export function agarrarBorda(
  c: EstadoDoCorpo,
  borda: BordaViva,
  s: number,
  agora: number,
  aviso: AvisoDeModo,
): void {
  c.inicio.x = c.prox.x
  c.inicio.y = c.prox.y
  c.inicio.z = c.prox.z
  mudarModo(c, 'borda', agora, aviso)
  c.borda = borda
  c.naBorda = s
  c.subindoNaBorda = 0
  c.velY = 0
}

function quina(b: BordaViva, s: number, saida: Ponto): Ponto {
  const t = Math.max(0, Math.min(1, s / g.comprimento))
  saida.x = b.a.x + (b.b.x - b.a.x) * t
  saida.y = b.a.y + (b.b.y - b.a.y) * t
  saida.z = b.a.z + (b.b.z - b.a.z) * t
  return saida
}

const ponto: Ponto = { x: 0, y: 0, z: 0 }

/**
 * Pendurado na borda: frente (para a parede) sobe, com o corpo indo do pendurado até de pé em cima
 * em 0,5 s; trás solta; os lados andam pela quina; pular sai para longe da parede. É a ajuda à
 * vista que troca o degrau automático no ar (que o controlador não usa mais).
 */
export const MODO_BORDA: ModoDeMovimento = {
  id: 'borda',
  valendo: (c, mundo) => c.borda !== null && mundo.bordas.includes(c.borda),
  passo(c, e) {
    const borda = c.borda
    if (!borda) return 'direto'
    geometria(borda, g)
    if (c.subindoNaBorda > 0) {
      c.subindoNaBorda = Math.min(1, c.subindoNaBorda + e.dt / BORDA.subida)
      const t = c.subindoNaBorda
      quina(borda, c.naBorda, ponto)
      c.alvo.x = ponto.x - g.nx * BORDA.paraDentro
      c.alvo.y = ponto.y + CORPO.doCentroAoPe + CORPO.folga
      c.alvo.z = ponto.z - g.nz * BORDA.paraDentro
      // Sobe primeiro (as mãos empurram) e depois entra (o joelho passa a quina).
      const sobe = Math.min(1, (t / 0.6) ** 0.8)
      const entra = Math.max(0, (t - 0.45) / 0.55)
      const k = entra * entra * (3 - 2 * entra)
      c.prox.x = c.inicio.x + (c.alvo.x - c.inicio.x) * k
      c.prox.y = c.inicio.y + (c.alvo.y - c.inicio.y) * sobe
      c.prox.z = c.inicio.z + (c.alvo.z - c.inicio.z) * k
      return 'direto'
    }
    const lado = e.pedidoX * g.ux + e.pedidoZ * g.uz
    c.naBorda = Math.max(
      BORDA.longeDaPonta,
      Math.min(g.comprimento - BORDA.longeDaPonta, c.naBorda + lado * BORDA.deLado * e.dt),
    )
    quina(borda, c.naBorda, ponto)
    c.alvo.x = ponto.x + g.nx * BORDA.daParede
    c.alvo.y = ponto.y - BORDA.maosAcimaDoCentro
    c.alvo.z = ponto.z + g.nz * BORDA.daParede
    const k = Math.min(1, c.noModo / CIPO.encaixe)
    c.prox.x = c.inicio.x + (c.alvo.x - c.inicio.x) * k
    c.prox.y = c.inicio.y + (c.alvo.y - c.inicio.y) * k
    c.prox.z = c.inicio.z + (c.alvo.z - c.inicio.z) * k
    const paraAParede = -(e.pedidoX * g.nx + e.pedidoZ * g.nz)
    if (paraAParede > 0.5 && k >= 1) {
      c.inicio.x = c.prox.x
      c.inicio.y = c.prox.y
      c.inicio.z = c.prox.z
      c.subindoNaBorda = 1e-6
    }
    return 'direto'
  },
  depois(c, e, _mundo, _mov, _pisou, aviso) {
    const borda = c.borda
    if (!borda) return false
    geometria(borda, g)
    c.direcao = Math.atan2(-g.nx, -g.nz)
    c.noChao = false
    c.nadando = false
    c.velPedida = 0
    if (c.subindoNaBorda >= 1) {
      mudarModo(c, 'chao', e.agora, aviso)
      c.noChao = true
      return false
    }
    if (c.subindoNaBorda > 0) return false
    if (e.pulou) {
      mudarModo(c, 'chao', e.agora, aviso)
      c.embalo.x = g.nx * BORDA.pulo.paraFora
      c.embalo.z = g.nz * BORDA.pulo.paraFora
      c.velY = BORDA.pulo.paraCima
      c.direcao = Math.atan2(g.nx, g.nz)
      return false
    }
    const paraFora = e.pedidoX * g.nx + e.pedidoZ * g.nz
    if (paraFora > 0.5 || (e.usou && !e.parado)) {
      // Solta e cai rente à parede.
      mudarModo(c, 'chao', e.agora, aviso)
      c.velY = 0
      return e.usou
    }
    return false
  },
}
