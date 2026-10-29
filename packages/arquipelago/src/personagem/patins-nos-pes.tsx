import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { type RefObject, useEffect, useMemo } from 'react'
import { type Bone, Matrix4, type Object3D, Vector3 } from 'three'
import patinsGlb from '../assets/movimento/patins.glb'

const PATINS_URL = new URL(patinsGlb, import.meta.url).href

/**
 * Cada patim do `patins.glb` (`arte/festas/movimento.py`): a peça, o vazio no lugar do osso do pé
 * (as duas no referencial do avatar, com a origem nos pés) e o osso do esqueleto Mixamo que leva a
 * peça.
 */
export const PES_DOS_PATINS = [
  { peca: 'patim-esq', vazio: 'pe-esq', osso: 'mixamorigLeftFoot' },
  { peca: 'patim-dir', vazio: 'pe-dir', osso: 'mixamorigRightFoot' },
] as const

/** Como cada pé fica com o avatar parado em pé (medido uma vez por avatar carregado). */
export interface PesEmPe {
  ossos: Bone[]
  /** Do referencial do avatar ao do osso: `inverso(osso.matrixWorld) × avatar.matrixWorld`. */
  doAvatarAoOsso: Matrix4[]
  /** Onde o osso fica no referencial do avatar. */
  ondeNoAvatar: Vector3[]
}

const inverso = new Matrix4()

function dentroDe(o: Object3D, raiz: Object3D): boolean {
  for (let p: Object3D | null = o; p; p = p.parent) if (p === raiz) return true
  return false
}

/**
 * Mede os pés parados (a pose em pé, a mesma em que os patins aparecem mais). Devolve a medida que
 * já havia se os ossos são os mesmos, `null` se o avatar ainda não tem os ossos.
 */
export function medirPesEmPe(
  avatar: Object3D,
  personagem: Object3D,
  antes: PesEmPe | null,
): PesEmPe | null {
  if (antes?.ossos.every((o) => dentroDe(o, personagem))) return antes
  const ossos: Bone[] = []
  for (const p of PES_DOS_PATINS) {
    const o = personagem.getObjectByName(p.osso) as Bone | undefined
    if (!o?.isBone) return null
    ossos.push(o)
  }
  avatar.updateWorldMatrix(true, true)
  inverso.copy(avatar.matrixWorld).invert()
  return {
    ossos,
    doAvatarAoOsso: ossos.map((o) =>
      new Matrix4().copy(o.matrixWorld).invert().multiply(avatar.matrixWorld),
    ),
    ondeNoAvatar: ossos.map((o) =>
      new Vector3().setFromMatrixPosition(o.matrixWorld).applyMatrix4(inverso),
    ),
  }
}

const noOsso = new Matrix4()
const deslocar = new Matrix4()

/**
 * O par calçado: cada patim vira filho do osso do pé dele, deslocado para o vazio cair sobre o osso
 * (a regra do README de `arte/festas`), então segue os passos das animações. O avatar sobe
 * `ELEVACAO_DOS_PATINS` (quem monta isto) para as rodinhas tocarem o chão.
 */
export function PatinsNosPes({ pes }: { pes: RefObject<PesEmPe | null> }) {
  const gltf = useGLTF(PATINS_URL, false, false)
  const pecas = useMemo(
    () =>
      PES_DOS_PATINS.map((p) => {
        const peca = gltf.scene.getObjectByName(p.peca)
        const vazio = gltf.scene.getObjectByName(p.vazio)
        if (!peca || !vazio) throw new Error(`Sem ${p.peca} ou ${p.vazio} no patins.glb.`)
        const copia = peca.clone(true)
        copia.matrixAutoUpdate = false
        return {
          copia,
          local: new Matrix4().compose(peca.position, peca.quaternion, peca.scale),
          vazio: vazio.position.clone(),
        }
      }),
    [gltf],
  )
  useEffect(
    () => () => {
      for (const p of pecas) p.copia.removeFromParent()
    },
    [pecas],
  )

  useFrame(() => {
    const m = pes.current
    if (!m) return
    pecas.forEach((p, i) => {
      const osso = m.ossos[i]
      const doAvatar = m.doAvatarAoOsso[i]
      const onde = m.ondeNoAvatar[i]
      if (!osso || !doAvatar || !onde || p.copia.parent === osso) return
      // No plano, o vazio vai para onde o pé está; na altura, a sola do patim fica na sola do
      // avatar (a origem dele): o tornozelo parado fica uns 4 cm acima do vazio do arquivo.
      deslocar.makeTranslation(onde.x - p.vazio.x, 0, onde.z - p.vazio.z)
      noOsso.copy(doAvatar).multiply(deslocar).multiply(p.local)
      p.copia.matrix.copy(noOsso)
      osso.add(p.copia)
    })
  })
  return null
}
