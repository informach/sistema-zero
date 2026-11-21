import type { Transformacao } from './documento'
import { comEncosta, quaternionDoGiro } from './encosta'
import type { PontoDeEncaixe } from './entidades-schema'

/**
 * Juntar peças modulares pelos pontos de encaixe: a peça que se move procura, entre as vizinhas,
 * um ponto virado para o lado oposto, perto e de largura parecida; então gira em volta do próprio
 * eixo vertical e anda até os dois pontos coincidirem. Contas puras, no mundo.
 */
export interface PontoNoMundo {
  posicao: { x: number; y: number; z: number }
  /** Horizontal e unitária, para fora da peça. */
  direcao: { x: number; z: number }
  largura: number
}

export interface EncaixeAchado {
  /** Índice do ponto da peça que se move. */
  de: number
  /** Índice do ponto da vizinha. */
  para: number
  /** Giro em volta do eixo vertical da peça (radianos) que deixa os pontos de frente. */
  giro: number
  /** Distância entre os pontos antes de encaixar. */
  distancia: number
}

/** Até onde a peça é puxada para o encaixe. */
export const ALCANCE_DO_ENCAIXE = 0.6

/** Transforma os pontos do modelo pela matriz da instância (16 números, coluna a coluna). */
export function pontosNoMundo(
  pontos: readonly PontoDeEncaixe[],
  m: ArrayLike<number>,
): PontoNoMundo[] {
  return pontos.map((p) => {
    const { x, y, z } = p.posicao
    const posicao = {
      x: m[0]! * x + m[4]! * y + m[8]! * z + m[12]!,
      y: m[1]! * x + m[5]! * y + m[9]! * z + m[13]!,
      z: m[2]! * x + m[6]! * y + m[10]! * z + m[14]!,
    }
    let dx = m[0]! * p.direcao.x + m[8]! * p.direcao.z,
      dz = m[2]! * p.direcao.x + m[10]! * p.direcao.z
    const t = Math.hypot(dx, dz) || 1
    dx /= t
    dz /= t
    // A largura acompanha a escala no sentido de través da direção.
    const escala = Math.hypot(
      m[0]! * -p.direcao.z + m[8]! * p.direcao.x,
      m[2]! * -p.direcao.z + m[10]! * p.direcao.x,
    )
    return { posicao, direcao: { x: dx, z: dz }, largura: p.largura * (escala || 1) }
  })
}

/** O par mais perto que encaixa, ou nulo. */
export function acharEncaixe(
  movel: readonly PontoNoMundo[],
  vizinhos: readonly PontoNoMundo[],
  alcance = ALCANCE_DO_ENCAIXE,
): EncaixeAchado | null {
  let melhor: EncaixeAchado | null = null
  for (let i = 0; i < movel.length; i++) {
    const a = movel[i]!
    for (let j = 0; j < vizinhos.length; j++) {
      const b = vizinhos[j]!
      const distancia = Math.hypot(
        a.posicao.x - b.posicao.x,
        a.posicao.y - b.posicao.y,
        a.posicao.z - b.posicao.z,
      )
      if (distancia > alcance || (melhor !== null && distancia >= melhor.distancia)) continue
      // De frente: a direção de um é o contrário da do outro (até uns 45° de folga, que o giro corrige).
      if (a.direcao.x * b.direcao.x + a.direcao.z * b.direcao.z > -0.7) continue
      const menor = Math.min(a.largura, b.largura),
        maior = Math.max(a.largura, b.largura)
      if (menor < maior * 0.5) continue
      // Giro que leva a direção de a ao contrário da de b.
      const alvo = Math.atan2(-b.direcao.x, -b.direcao.z),
        atual = Math.atan2(a.direcao.x, a.direcao.z)
      let giro = alvo - atual
      while (giro > Math.PI) giro -= 2 * Math.PI
      while (giro < -Math.PI) giro += 2 * Math.PI
      melhor = { de: i, para: j, giro, distancia }
    }
  }
  return melhor
}

/** A matriz (16 números, coluna a coluna) de uma pose do documento (giro em Euler XYZ). */
export function matrizDaPose(t: Transformacao): number[] {
  const [x, y, z, w] = quaternionDoGiro(t.rotacao),
    { x: sx, y: sy, z: sz } = t.escala
  const x2 = x + x,
    y2 = y + y,
    z2 = z + z
  const xx = x * x2,
    xy = x * y2,
    xz = x * z2,
    yy = y * y2,
    yz = y * z2,
    zz = z * z2,
    wx = w * x2,
    wy = w * y2,
    wz = w * z2
  return [
    (1 - (yy + zz)) * sx,
    (xy + wz) * sx,
    (xz - wy) * sx,
    0,
    (xy - wz) * sy,
    (1 - (xx + zz)) * sy,
    (yz + wx) * sy,
    0,
    (xz + wy) * sz,
    (yz - wx) * sz,
    (1 - (xx + yy)) * sz,
    0,
    t.posicao.x,
    t.posicao.y,
    t.posicao.z,
    1,
  ]
}

/**
 * A pose (no mundo) da peça depois de encaixar pelo par mais perto: gira em volta do próprio
 * eixo vertical e anda até os dois pontos coincidirem. Nulo quando nenhum par encaixa.
 */
export function encaixarPose(
  pontos: readonly PontoDeEncaixe[],
  pose: Transformacao,
  vizinhos: readonly PontoNoMundo[],
  alcance = ALCANCE_DO_ENCAIXE,
): { pose: Transformacao; achado: EncaixeAchado } | null {
  const achado = acharEncaixe(pontosNoMundo(pontos, matrizDaPose(pose)), vizinhos, alcance)
  if (!achado) return null
  const girada: Transformacao = {
    ...pose,
    rotacao:
      Math.abs(achado.giro) > 1e-9
        ? comEncosta(pose.rotacao, { x: 0, y: achado.giro, z: 0 })
        : { ...pose.rotacao },
  }
  const a = pontosNoMundo([pontos[achado.de]!], matrizDaPose(girada))[0]!.posicao,
    b = vizinhos[achado.para]!.posicao
  return {
    pose: {
      ...girada,
      posicao: {
        x: pose.posicao.x + b.x - a.x,
        y: pose.posicao.y + b.y - a.y,
        z: pose.posicao.z + b.z - a.z,
      },
    },
    achado,
  }
}
