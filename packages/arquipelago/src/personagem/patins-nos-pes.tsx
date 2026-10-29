import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { partGlbUrl } from '@sistemazero/avatar-quarto/avatar/catalog'
import { type RefObject, useEffect, useMemo, useRef } from 'react'
import {
  type BufferGeometry,
  Float32BufferAttribute,
  type Group,
  Matrix4,
  type Mesh,
  type Object3D,
  type Skeleton,
  SkinnedMesh,
  Uint16BufferAttribute,
  Vector3,
} from 'three'
import patinsGlb from '../assets/movimento/patins.glb'

const PATINS_URL = new URL(patinsGlb, import.meta.url).href

/**
 * Cada patim do `patins.glb` (`arte/festas/movimento.py`) e os ossos que o levam: a sola, o chassi,
 * as rodas e a parte de baixo da bota seguem o pé; o cano segue a canela, como o cano da bota do
 * próprio avatar. Assim a perna e a barra da calça, que seguem a canela, ficam sempre dentro dele.
 */
export const PES_DOS_PATINS = [
  { peca: 'patim-esq', pe: 'mixamorigLeftFoot', canela: 'mixamorigLeftLeg' },
  { peca: 'patim-dir', pe: 'mixamorigRightFoot', canela: 'mixamorigRightLeg' },
] as const

/**
 * Até esta altura (no referencial do avatar, a sola em 0) a bota é só do pé; daí até `CANELA_DE`
 * passa aos poucos para a canela (o tornozelo dobra no meio, sem amassar a bota).
 */
export const PE_ATE = 0.05
export const CANELA_DE = 0.17

/** Quanto do vértice na altura `y` segue a canela (0 a 1, suave nas duas pontas). */
export function pesoDaCanela(y: number): number {
  const t = Math.min(1, Math.max(0, (y - PE_ATE) / (CANELA_DE - PE_ATE)))
  return t * t * (3 - 2 * t)
}

const doArquivo = new Matrix4()
const escala = new Vector3()

/**
 * A escala do avatar: as peças do avatar estão no referencial do `Armature.glb` e vão ao mundo por
 * `osso.matrixWorld × boneInverse`; no referencial do avatar do jogo isso tem escala uniforme `s`.
 */
function escalaDoAvatar(avatar: Object3D, esqueleto: Skeleton): number | null {
  const osso = esqueleto.bones[0]
  const inversa = esqueleto.boneInverses[0]
  if (!osso || !inversa) return null
  avatar.updateWorldMatrix(true, true)
  doArquivo.copy(avatar.matrixWorld).invert().multiply(osso.matrixWorld).multiply(inversa)
  escala.setFromMatrixScale(doArquivo)
  return (escala.x + escala.y + escala.z) / 3
}

/**
 * Faz de cada malha do patim uma malha com o esqueleto do avatar, no referencial das peças do avatar
 * (o do arquivo dividido pela escala `s`), com os pesos do pé e da canela por altura.
 */
export function patimNoEsqueleto(
  no: Object3D,
  esqueleto: Skeleton,
  s: number,
  ossos: { pe: string; canela: string },
): SkinnedMesh[] {
  const pe = esqueleto.bones.findIndex((b) => b.name === ossos.pe)
  const canela = esqueleto.bones.findIndex((b) => b.name === ossos.canela)
  if (pe < 0 || canela < 0) return []
  // A cena do arquivo pode estar montada em outro lugar (a sala de arte mostra o par ao lado): as
  // contas são relativas a ela, que tem o referencial do avatar.
  let cena: Object3D = no
  while (cena.parent && cena.name !== 'Scene') cena = cena.parent
  cena.updateMatrixWorld(true)
  const daCena = new Matrix4().copy(cena.matrixWorld).invert()
  const doNo = new Matrix4()
  const malhas: SkinnedMesh[] = []
  no.traverse((o) => {
    const m = o as Mesh
    if (!m.isMesh) return
    doNo.copy(daCena).multiply(m.matrixWorld)
    const g = m.geometry.clone()
    g.applyMatrix4(doNo)
    const pos = g.attributes.position
    if (!pos) return
    const indices = new Uint16Array(pos.count * 4)
    const pesos = new Float32Array(pos.count * 4)
    for (let i = 0; i < pos.count; i++) {
      const w = pesoDaCanela(pos.getY(i))
      indices[i * 4] = pe
      indices[i * 4 + 1] = canela
      pesos[i * 4] = 1 - w
      pesos[i * 4 + 1] = w
    }
    g.setAttribute('skinIndex', new Uint16BufferAttribute(indices, 4))
    g.setAttribute('skinWeight', new Float32BufferAttribute(pesos, 4))
    g.scale(1 / s, 1 / s, 1 / s)
    const sm = new SkinnedMesh(g, m.material)
    sm.name = `${no.name}-${malhas.length}`
    sm.frustumCulled = false
    sm.skeleton = esqueleto
    malhas.push(sm)
  })
  return malhas
}

/**
 * O par calçado: as malhas do patim com o esqueleto do avatar, e o calçado do avatar some enquanto
 * isso (a bota do patim fica no lugar dele, com o pé, a perna e a barra da calça por dentro). O
 * avatar sobe `ELEVACAO_DOS_PATINS` (quem monta isto) para as rodinhas tocarem o chão.
 */
export function PatinsNosPes({
  avatar,
  personagem,
  calcado,
}: {
  avatar: RefObject<Object3D | null>
  personagem: RefObject<Object3D | null>
  /** A peça de calçado do avatar (`shoes-01`...), escondida enquanto os patins estão nos pés. */
  calcado: string
}) {
  const gltf = useGLTF(PATINS_URL, false, false)
  const doCalcado = useGLTF(partGlbUrl(calcado), false, false)
  const geometriasDoCalcado = useMemo(() => {
    const g = new Set<BufferGeometry>()
    doCalcado.scene.traverse((o) => {
      const m = o as Mesh
      if (m.isMesh) g.add(m.geometry)
    })
    return g
  }, [doCalcado])
  const grupo = useRef<Group>(null)
  const montado = useRef<{ esqueleto: Skeleton; malhas: SkinnedMesh[] } | null>(null)
  const escondidos = useMemo(() => new Set<Object3D>(), [])

  const desmontar = () => {
    for (const m of montado.current?.malhas ?? []) {
      m.removeFromParent()
      m.geometry.dispose()
    }
    montado.current = null
  }
  // biome-ignore lint/correctness/useExhaustiveDependencies: desmontar só lê refs
  useEffect(
    () => () => {
      desmontar()
      for (const o of escondidos) o.visible = true
      escondidos.clear()
    },
    [gltf, escondidos],
  )

  useFrame(() => {
    const a = avatar.current
    const corpo = personagem.current
    const g = grupo.current
    if (!a || !corpo || !g) return
    // O calçado some e acha o esqueleto (o avatar pode remontar as peças: confere a cada quadro).
    let esqueleto: Skeleton | null = null
    corpo.traverse((o) => {
      const m = o as SkinnedMesh
      if (!m.isSkinnedMesh) return
      esqueleto ??= m.skeleton
      if (m.visible && geometriasDoCalcado.has(m.geometry)) {
        m.visible = false
        escondidos.add(m)
      }
    })
    if (!esqueleto || montado.current?.esqueleto === esqueleto) return
    desmontar()
    const s = escalaDoAvatar(a, esqueleto)
    if (!s) return
    const malhas: SkinnedMesh[] = []
    for (const p of PES_DOS_PATINS) {
      const no = gltf.scene.getObjectByName(p.peca)
      if (no) malhas.push(...patimNoEsqueleto(no, esqueleto, s, p))
    }
    for (const m of malhas) g.add(m)
    montado.current = { esqueleto, malhas }
  })
  // O lugar das malhas na cena não importa (o esqueleto as leva); ficam dentro do avatar.
  return <group ref={grupo} name="patins-calcados" />
}
