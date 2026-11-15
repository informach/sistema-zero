/**
 * Os pés no chão de verdade (degrau, rampa, pedra): parado ou devagar no chão, cada pé desce ou
 * sobe até o chão embaixo dele, e o quadril baixa o tanto que o pé mais baixo precisa. A cápsula
 * do Rapier não muda: só o desenho, depois da pose do quadro, por IK de dois ossos (`ik.ts`).
 *
 * Andando depressa, no ar, nadando ou num modo especial, o peso vai a zero aos poucos e a pose da
 * animação volta inteira (o passo já levanta os pés).
 */
import { type Bone, type Object3D, Quaternion, Vector3 } from 'three'
import { CORPO } from '../sistemas/corpo'
import type { EntradaDaLocomocao } from '../sistemas/locomocao'
import { ikDeDoisOssos } from './ik'

/** A altura do chão embaixo de (x, z), procurando para baixo a partir de `deY`; `null` sem chão. */
export type AlturaDoChao = (x: number, z: number, deY: number) => number | null

const OSSOS = {
  quadril: 'Hips',
  esquerda: ['LeftUpLeg', 'LeftLeg', 'LeftFoot'],
  direita: ['RightUpLeg', 'RightLeg', 'RightFoot'],
} as const

export interface PernasDoAvatar {
  quadril: Bone
  esquerda: Bone[]
  direita: Bone[]
}

/** Acima disto (m/s) o pé já está no passo: o ajuste some. */
export const PES_ATE = 0.6
/**
 * Quanto o pé sobe ou desce no máximo: 70% da altura do joelho (uns 25 cm na ponte do mundo).
 * Chão mais longe que isto embaixo do pé é uma beirada, não um degrau: o pé fica como a animação
 * deixa (descer o quadril até lá dobraria a outra perna como quem ajoelha).
 */
export const AJUSTE_MAXIMO = CORPO.medidas.knee * 0.7
/** Rapidez (por segundo) com que o ajuste entra e sai. */
const RAPIDEZ = 10

export function acharPernas(raiz: Object3D): PernasDoAvatar | null {
  const quadril = raiz.getObjectByName(OSSOS.quadril) as Bone | undefined
  if (!quadril?.isBone) return null
  const pernas: PernasDoAvatar = { quadril, esquerda: [], direita: [] }
  for (const lado of ['esquerda', 'direita'] as const)
    for (const nome of OSSOS[lado]) {
      const osso = raiz.getObjectByName(nome) as Bone | undefined
      if (!osso?.isBone) return null
      pernas[lado].push(osso)
    }
  return pernas
}

/** O quanto o ajuste vale agora (0 a 1), pelo que o corpo está fazendo. */
export function pesoDosPes(e: EntradaDaLocomocao): number {
  if (!e.noChao || e.nadando || e.especial) return 0
  return Math.max(0, 1 - e.velocidade / PES_ATE)
}

/** Um passo do peso suavizado até o alvo. */
export function suavizarPeso(atual: number, alvo: number, dt: number): number {
  return atual + (alvo - atual) * Math.min(1, dt * RAPIDEZ)
}

const origem = new Vector3()
const pe = new Vector3()
const alvo = new Vector3()
const quadril = new Vector3()
const polo = new Vector3()
const giro = new Quaternion()
const desnivel = { esquerda: 0, direita: 0 }

/**
 * Assenta os pés (depois da pose). `raiz` é o grupo do desenho, com a origem no chão embaixo da
 * cápsula. `peso` de 0 (a pose da animação) a 1 (os pés no chão de verdade).
 */
export function assentarOsPes(
  pernas: PernasDoAvatar,
  raiz: Object3D,
  chao: AlturaDoChao,
  peso: number,
): void {
  if (peso < 0.001) return
  raiz.getWorldPosition(origem)
  // O desnível do chão embaixo de cada pé em relação ao chão embaixo da cápsula.
  let menor = 0
  for (const lado of ['esquerda', 'direita'] as const) {
    const p = pernas[lado][2]
    if (!p) return
    p.getWorldPosition(pe)
    const y = chao(pe.x, pe.z, origem.y + AJUSTE_MAXIMO)
    const d = y === null || Math.abs(y - origem.y) > AJUSTE_MAXIMO ? 0 : y - origem.y
    desnivel[lado] = d * peso
    menor = Math.min(menor, desnivel[lado])
  }
  // O quadril baixa o que o pé mais baixo precisa (a perna do pé mais alto dobra).
  if (menor < 0) {
    const q = pernas.quadril
    q.getWorldPosition(quadril)
    quadril.y += menor
    q.parent?.worldToLocal(quadril)
    q.position.copy(quadril)
    q.updateMatrixWorld(true)
  }
  raiz.getWorldQuaternion(giro)
  polo.set(0, 0, 1).applyQuaternion(giro)
  for (const lado of ['esquerda', 'direita'] as const) {
    const [coxa, canela, tornozelo] = pernas[lado]
    if (!coxa || !canela || !tornozelo) continue
    // O pé vai para onde ele estava na pose, mais o desnível do chão dele (o quadril já desceu).
    tornozelo.getWorldPosition(alvo)
    alvo.y += desnivel[lado] - menor
    ikDeDoisOssos(coxa, canela, tornozelo, alvo, polo)
  }
}
