import {
  AnimationClip,
  AnimationMixer,
  type Object3D,
  PropertyBinding,
  type Skeleton,
  type SkinnedMesh,
} from 'three'
import { clone } from 'three/addons/utils/SkeletonUtils.js'

/** Reserva conservadora para nós/extras e canais copiados por instância.
 * Geometrias e materiais permanecem compartilhados; não é uma medição do heap do aparelho. */
export function custoDaInstanciaCompilada(entrada: Object3D, clipes: readonly AnimationClip[]) {
  let bytes = 0
  entrada.traverse((n) => {
    bytes += 1536 + new TextEncoder().encode(JSON.stringify(n.userData)).length * 2
    const m = n as SkinnedMesh
    if (m.isSkinnedMesh) bytes += m.skeleton.bones.length * 128
    if (m.isMesh) bytes += (m.morphTargetInfluences?.length ?? 0) * 16
  })
  for (const c of clipes)
    for (const t of c.tracks) bytes += 1024 + (t.times.length + t.values.length) * 8
  return bytes
}

/** Uma instância mantém ossos e canais próprios, compartilhando só geometria/material imutáveis. */
export function instanciarModeloCompilado(entrada: Object3D, clipes: readonly AnimationClip[]) {
  const raiz = clone(entrada),
    originais: Object3D[] = [],
    copias: Object3D[] = [],
    destinos = new Map<string, Object3D>(),
    esqueletos = new Set<Skeleton>()
  entrada.traverse((n) => originais.push(n))
  raiz.traverse((n) => {
    copias.push(n)
    if ((n as SkinnedMesh).isSkinnedMesh) esqueletos.add((n as SkinnedMesh).skeleton)
  })
  const mixer = new AnimationMixer(raiz)
  let descartado = false
  const descartar = () => {
    if (descartado) return
    descartado = true
    mixer.stopAllAction()
    mixer.uncacheRoot(raiz)
    for (const s of esqueletos) s.dispose()
    raiz.removeFromParent()
    raiz.clear()
  }
  try {
    for (let i = 0; i < originais.length; i++) destinos.set(originais[i]!.uuid, copias[i]!)
    const animacoes = clipes.map((original) => {
      const tracks = original.tracks.map((track) => {
        const binding = PropertyBinding.parseTrackName(track.name),
          origem = PropertyBinding.findNode(entrada, binding.nodeName),
          destino =
            origem && 'uuid' in origem && typeof origem.uuid === 'string'
              ? destinos.get(origem.uuid)
              : undefined
        if (!destino || binding.objectName)
          throw Error('Um canal do modelo compilado não aponta para um nó portátil.')
        const copia = track.clone(),
          indice = binding.propertyIndex === undefined ? '' : `[${binding.propertyIndex}]`
        copia.name = `${destino.uuid}.${binding.propertyName}${indice}`
        return copia
      })
      return new AnimationClip(original.name, original.duration, tracks, original.blendMode)
    })
    let animavel = animacoes.length > 0 || esqueletos.size > 0
    raiz.traverse((n) => {
      const m = n as SkinnedMesh
      if (m.isMesh && Object.values(m.geometry.morphAttributes).some((a) => a?.length))
        animavel = true
    })
    return { raiz, animacoes, mixer, animavel, descartar }
  } catch (erro) {
    descartar()
    throw erro
  }
}
