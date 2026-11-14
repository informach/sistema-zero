/**
 * As medidas do corpo do avatar, tiradas do esqueleto do catálogo (ossos em repouso + altura do
 * corpo padrão). É a régua única do personagem no jogo: a cápsula física, a câmera, a linha d'água,
 * o Zappy no ombro e as alturas de agarrar saem daqui, nunca de número escrito à mão.
 *
 * Tudo em metros, do pé para cima, já multiplicado pela escala do herói que o mundo declara (o
 * mundo de hoje do Arquipélago usa 1,85; os mundos novos, 1).
 */
import type { AvatarSkeleton } from './types'

export interface BodyMeasures {
  scale: number
  /** Do pé ao topo da cabeça, sem cabelo nem chapéu. */
  height: number
  /** Base do pescoço (onde a cabeça começa). */
  neck: number
  /** Centro e raio da cabeça (a cabeça do pack é quase uma bola). */
  headCenter: number
  headRadius: number
  /** Altura dos olhos (o encaixe `olhos` da arte; sem ele, estimada pela cabeça). */
  eyes: number
  /** Altura do ombro (junta do braço). */
  shoulder: number
  /** Distância entre as juntas dos dois ombros. */
  shoulderWidth: number
  /** Altura do quadril (o osso `Hips`). */
  hips: number
  /** Altura do joelho. */
  knee: number
  /** Do ombro ao punho. */
  arm: number
  /** Da junta do quadril ao chão. */
  leg: number
  /** Altura da mão com o braço caído. */
  handDown: number
  /** Até onde a mão chega com o braço esticado para cima (o braço do pack é curto). */
  reachUp: number
}

type Vec3 = readonly [number, number, number]

function bone(s: AvatarSkeleton, name: string): Vec3 {
  const b = s.bones[name]
  if (!b) throw new Error(`O esqueleto do catálogo não tem o osso ${name}.`)
  return b.head
}

const dist = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])

/** As medidas do corpo na escala pedida. */
export function bodyMeasures(s: AvatarSkeleton, scale = 1): BodyMeasures {
  if (!(s.height > 0)) throw new Error('O esqueleto do catálogo não tem a altura do corpo.')
  const neck = bone(s, 'Neck')[1]
  const top = s.height
  const shoulderL = bone(s, 'LeftArm')
  const shoulderR = bone(s, 'RightArm')
  const elbow = bone(s, 'LeftForeArm')
  const wrist = bone(s, 'LeftHand')
  const hipJoint = bone(s, 'LeftUpLeg')
  const knee = bone(s, 'LeftLeg')
  const ankle = bone(s, 'LeftFoot')
  const arm = dist(shoulderL, elbow) + dist(elbow, wrist)
  const leg = dist(hipJoint, knee) + dist(knee, ankle) + ankle[1]
  const shoulder = shoulderL[1]
  const k = scale
  return {
    scale,
    height: top * k,
    neck: neck * k,
    headCenter: ((neck + top) / 2) * k,
    headRadius: ((top - neck) / 2) * k,
    // Sem o encaixe, nos rostos do pack os olhos ficam a uns 40% da cabeça, a partir do pescoço.
    eyes: (s.sockets.olhos?.rest[1] ?? neck + 0.4 * (top - neck)) * k,
    shoulder: shoulder * k,
    shoulderWidth: dist(shoulderL, shoulderR) * k,
    hips: bone(s, 'Hips')[1] * k,
    knee: knee[1] * k,
    arm: arm * k,
    leg: leg * k,
    handDown: (shoulder - arm) * k,
    reachUp: (shoulder + arm) * k,
  }
}

/** O corpo físico do personagem (a cápsula do Rapier e o que depende dela). */
export interface PhysicalBody {
  /** Meia altura do cilindro da cápsula. */
  halfHeight: number
  radius: number
  /** Do centro da cápsula ao pé (a cápsula encosta no chão pelo pé). */
  centerToFoot: number
  /** Altura da linha d'água, do pé, quando nada (a cintura). */
  waist: number
  /**
   * O corpo como é desenhado, para as cordas encostarem nele (do pé): o tronco e as pernas como
   * uma cápsula (`from` → `to`, raio `radius`) e a cabeça como uma bola.
   */
  drawn: { from: number; to: number; radius: number; head: number; headRadius: number }
}

/**
 * As regras do corpo físico, escritas uma vez:
 * - a cápsula vai do pé até 45% do caminho dos olhos ao topo da cabeça (a cabeça grande do pack
 *   passa um pouco dela, como no avatar de antes; mais alta, ela rasparia no teto das passagens
 *   feitas para o corpo de antes, como a cúpula do iglu);
 * - o raio da cápsula é 62% do raio da cabeça (o tronco do pack é estreito; mais largo, ele não
 *   passaria nas portas);
 * - a linha d'água é o quadril;
 * - o desenho para as cordas vai do meio da coxa ao ombro.
 */
export function physicalBody(m: BodyMeasures): PhysicalBody {
  const top = m.eyes + (m.height - m.eyes) * 0.45
  const radius = m.headRadius * 0.62
  const halfHeight = top / 2 - radius
  return {
    halfHeight,
    radius,
    centerToFoot: halfHeight + radius,
    waist: m.hips,
    drawn: {
      from: (m.knee + m.hips) / 2,
      to: m.shoulder,
      radius,
      head: m.headCenter,
      headRadius: m.headRadius,
    },
  }
}
