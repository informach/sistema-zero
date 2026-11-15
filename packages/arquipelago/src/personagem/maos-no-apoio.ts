/**
 * As mãos no apoio de verdade (a quina da borda, os montantes da escada), por IK de dois ossos
 * (`ik.ts`), depois da pose do quadro, como os pés no chão (`pes-no-chao.ts`). Os clipes da arte já
 * põem as mãos onde o apoio estaria na medida dela (o jogo leva o desenho até lá); a IK corrige o
 * que o mundo tem de diferente: a quina inclinada ou mais alta num ponto, a escada mais perto ou mais
 * longe. Só a mão que está agarrada no clipe NESTE quadro (`hands` do catálogo: do quadro `on` ao
 * `off`); a que vai de um apoio ao outro segue a animação. Correção maior que `CORRECAO_MAXIMA` não
 * é deste apoio: a pose fica como está.
 *
 * O cipó e a barra do planador não precisam: o desenho é posto para as mãos do clipe caírem na corda
 * e na barra (`CORDA_NO_CORPO`, `BARRA_NO_AVATAR`), e os dois andam com ele.
 */
import type { AvatarGameClip } from '@sistemazero/avatar-quarto/avatar/pack-catalog'
import { type Bone, type Object3D, Quaternion, Vector3 } from 'three'
import { CORPO } from '../sistemas/corpo'
import { ikDeDoisOssos } from './ik'

export type Lado = 'esquerda' | 'direita'
type P = { x: number; y: number; z: number }
/** Um apoio: segmentos (de `a` a `b`, no mundo) em que as mãos se seguram. */
export interface ApoioDasMaos {
  segmentos: readonly { a: P; b: P }[]
}

/** A correção mais longa (m, no mundo): 30% do braço do avatar. */
export const CORRECAO_MAXIMA = 0.327 * CORPO.medidas.scale * 0.3

/**
 * A mão está agarrada no clipe neste quadro? Pelo `hands` do clipe (do quadro `on` ao `off`, que pode
 * dar a volta no laço). Clipe sem `hands`: não se sabe, a pose fica.
 */
export function maoAgarrada(clipe: AvatarGameClip | undefined, tempo: number, lado: Lado): boolean {
  const maos = (clipe as { hands?: { hand: 'left' | 'right'; on: number; off: number }[] })?.hands
  if (!clipe || !maos?.length || clipe.duration <= 0) return false
  const quadros = Math.max(1, clipe.frames)
  const q = ((tempo / clipe.duration) * quadros) % quadros
  const qual = lado === 'esquerda' ? 'left' : 'right'
  return maos.some((m) =>
    m.hand === qual ? (m.on <= m.off ? q >= m.on && q <= m.off : q >= m.on || q <= m.off) : false,
  )
}

/** O ponto do segmento mais perto de `p` (escreve em `saida`). */
export function pontoMaisPerto(a: P, b: P, p: P, saida: Vector3): Vector3 {
  const abx = b.x - a.x
  const aby = b.y - a.y
  const abz = b.z - a.z
  const l2 = abx * abx + aby * aby + abz * abz
  const t =
    l2 > 1e-12
      ? Math.max(0, Math.min(1, ((p.x - a.x) * abx + (p.y - a.y) * aby + (p.z - a.z) * abz) / l2))
      : 0
  return saida.set(a.x + abx * t, a.y + aby * t, a.z + abz * t)
}

/**
 * A escada como apoio: os dois montantes (os lados, a meia largura do eixo), de baixo a cima. As
 * mãos ficam na altura que o clipe pôs; a IK só as encosta na escada.
 */
export function apoioDaEscada(e: { base: P; topo: P; largura: number }): ApoioDasMaos {
  const dx = e.topo.x - e.base.x
  const dz = e.topo.z - e.base.z
  const l = Math.hypot(dx, dz)
  // De lado, no plano dos degraus: perpendicular à subida no chão (escada a prumo: o eixo x).
  const lx = l > 1e-6 ? -dz / l : 1
  const lz = l > 1e-6 ? dx / l : 0
  const m = e.largura / 2
  const lado = (s: number) => ({
    a: { x: e.base.x + lx * m * s, y: e.base.y, z: e.base.z + lz * m * s },
    b: { x: e.topo.x + lx * m * s, y: e.topo.y, z: e.topo.z + lz * m * s },
  })
  return { segmentos: [lado(1), lado(-1)] }
}

const OSSOS: Record<Lado, readonly [string, string, string, string]> = {
  esquerda: ['LeftArm', 'LeftForeArm', 'LeftHand', 'LeftHandProp'],
  direita: ['RightArm', 'RightForeArm', 'RightHand', 'RightHandProp'],
}
export type BracosDoAvatar = Record<Lado, [Bone, Bone, Bone, Object3D]>

export function acharBracos(raiz: Object3D): BracosDoAvatar | null {
  const achar = (lado: Lado) => {
    const ossos = OSSOS[lado].map((n) => raiz.getObjectByName(n))
    return ossos.every(Boolean) ? (ossos as [Bone, Bone, Bone, Object3D]) : null
  }
  const esquerda = achar('esquerda')
  const direita = achar('direita')
  return esquerda && direita ? { esquerda, direita } : null
}

const palma = new Vector3()
const alvo = new Vector3()
const melhor = new Vector3()
const punho = new Vector3()
const polo = new Vector3()
const giro = new Quaternion()

/**
 * Leva a palma da mão (`HandProp`) ao apoio mais perto, pelo `peso` (0 a 1). `raiz` é o desenho (o
 * cotovelo dobra para trás e para baixo dele). Devolve quanto andou (0 se nada).
 */
export function maoNoApoio(
  bracos: BracosDoAvatar,
  lado: Lado,
  raiz: Object3D,
  apoio: ApoioDasMaos,
  peso: number,
): number {
  if (peso < 0.001) return 0
  const [braco, antebraco, mao, prop] = bracos[lado]
  prop.getWorldPosition(palma)
  let distancia = Number.POSITIVE_INFINITY
  for (const s of apoio.segmentos) {
    pontoMaisPerto(s.a, s.b, palma, alvo)
    const d = alvo.distanceTo(palma)
    if (d < distancia) {
      distancia = d
      melhor.copy(alvo)
    }
  }
  if (distancia > CORRECAO_MAXIMA || distancia < 1e-4) return 0
  // O alvo da palma, pelo peso; o punho anda o que a palma ainda precisa andar. Dobrar o antebraço
  // gira a mão (e a palma, que fica além do punho): três passadas assentam a palma no alvo.
  melhor.sub(palma).multiplyScalar(peso).add(palma)
  raiz.getWorldQuaternion(giro)
  polo.set(0, -0.6, -1).normalize().applyQuaternion(giro)
  for (let passada = 0; passada < 3; passada++) {
    prop.getWorldPosition(palma)
    if (palma.distanceToSquared(melhor) < 1e-8) break
    mao.getWorldPosition(punho)
    punho.add(melhor).sub(palma)
    ikDeDoisOssos(braco, antebraco, mao, punho, polo)
  }
  return distancia * peso
}
