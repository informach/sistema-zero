import {
  type AnimationAction,
  LoopOnce,
  LoopRepeat,
  type Material,
  type Mesh,
  MeshStandardMaterial,
  type Object3D,
} from 'three'
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js'
import {
  bocaDaIris,
  CLIPES_DE_UMA_VEZ,
  faseDaAnimacao,
  luzNoturna,
} from '../sistemas/ajustes-da-arte'

export function prepararLuzesNoturnas(materiais: readonly Material[]) {
  return [...new Set(materiais)].flatMap((material) =>
    material instanceof MeshStandardMaterial && luzNoturna(material.name)
      ? [{ material, forca: material.emissiveIntensity }]
      : [],
  )
}

/** Ossos e pesos de morfos próprios. Só duplica materiais cujo brilho será alterado. */
export function copiarArteAnimada(original: Object3D) {
  const cena = clone(original)
  const materiais = new Map<Material, MeshStandardMaterial>()
  const bocas: Mesh[] = []
  cena.traverse((o) => {
    const malha = o as Mesh
    if (!malha.isMesh) return
    if (malha.name.startsWith('iris-cabeca') && malha.morphTargetDictionary) bocas.push(malha)
    const copiar = (m: Material) => {
      if (!(m instanceof MeshStandardMaterial) || !luzNoturna(m.name)) return m
      let copia = materiais.get(m)
      if (!copia) {
        copia = m.clone()
        materiais.set(m, copia)
      }
      return copia
    }
    malha.material = Array.isArray(malha.material)
      ? malha.material.map(copiar)
      : copiar(malha.material)
  })
  const luzes = prepararLuzesNoturnas([...materiais.values()])
  return {
    cena,
    bocas,
    luzes,
    soltar: () => {
      for (const m of materiais.values()) m.dispose()
    },
  }
}

export function iluminarArte(luzes: ReturnType<typeof copiarArteAnimada>['luzes'], noite: boolean) {
  for (const { material, forca } of luzes) material.emissiveIntensity = noite ? forca : 0
}

export function configurarAcao(acao: AnimationAction, umaVez: readonly string[]) {
  const nome = acao.getClip().name
  const unica = (CLIPES_DE_UMA_VEZ as readonly string[]).includes(nome) || umaVez.includes(nome)
  acao.setLoop(unica ? LoopOnce : LoopRepeat, unica ? 1 : Infinity)
  acao.clampWhenFinished = unica
}

export function iniciarClipe(acao: AnimationAction, id: string, mistura: number) {
  acao.reset()
  if (acao.loop !== LoopOnce)
    acao.time = faseDaAnimacao(id, acao.getClip().name) * acao.getClip().duration
  acao.fadeIn(mistura).play()
}

export function animarBocas(bocas: readonly Mesh[], texto: string, segundos: number) {
  const { forma, peso } = bocaDaIris(texto, segundos)
  for (const boca of bocas) {
    const dic = boca.morphTargetDictionary
    const valores = boca.morphTargetInfluences
    if (!dic || !valores) continue
    for (const nome of ['B', 'C', 'D']) {
      const i = dic[nome]
      if (i !== undefined) valores[i] = nome === forma ? peso : 0
    }
  }
}
