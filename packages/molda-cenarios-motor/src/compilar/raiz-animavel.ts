import { LIMITES_DA_EXPORTACAO } from '@sistemazero/molda-cenarios-core/compilar'
import type { InstanciaDeCenario } from '@sistemazero/molda-cenarios-core/v2'
import {
  type AnimationClip,
  type Box3,
  type BufferGeometry,
  Color,
  Group,
  type Material,
  Matrix4,
  Mesh,
  type Object3D,
  PropertyBinding,
  Scene,
  type Skeleton,
  SkinnedMesh,
  type Texture,
  type Vector3,
} from 'three'
import { clone } from 'three/addons/utils/SkeletonUtils.js'
import { materialDaTextura } from '../projecao-textura'
import { EspelhoAnimavel } from './espelho-animavel'
import { dividirGeometriaComDeformacoes } from './geometria-animavel'
import { projetarTexturaAnimavel } from './projecao-animavel'

export function temAnimacaoOuDeformacao(raiz: Object3D, animacoes: readonly AnimationClip[] = []) {
  let animavel = animacoes.length > 0
  raiz.traverse((no) => {
    const malha = no as Mesh
    if (
      (malha as SkinnedMesh).isSkinnedMesh ||
      (malha.isMesh && Object.values(malha.geometry.morphAttributes).some((a) => a?.length))
    )
      animavel = true
  })
  return animavel
}

/** Mantém hierarquia, pele e clipes; as partes compartilham o esqueleto clonado.
 * A geometria de cada material é dividida sem transformar poses em vértices estáticos. */
export function normalizarRaizAnimavel(
  entrada: Object3D,
  animacoes: readonly AnimationClip[] = [],
  aparencia: {
    caixa?: Box3
    espelho?: InstanciaDeCenario['espelho']
    cor?: string
    textura?: { mapa: Texture; repeticaoMetros: number; escala: Vector3 }
  } = {},
) {
  const espelhar = Object.values(aparencia.espelho ?? {}).some(Boolean)
  if (espelhar && (!aparencia.caixa || aparencia.caixa.isEmpty()))
    throw Error('O reflexo animável precisa da caixa real do modelo.')
  const reflexo = espelhar ? new EspelhoAnimavel(aparencia.caixa!, aparencia.espelho) : undefined,
    tinta = new Color(aparencia.cor ?? '#ffffff')
  const copiaRaiz = clone(entrada),
    raiz = new Scene(),
    originais: Object3D[] = [],
    copias: Object3D[] = [],
    porOrigem = new Map<string, Object3D>(),
    origemDaCopia = new Map<string, Object3D>(),
    substituicoes = new Map<string, Mesh[]>(),
    geometrias = new Set<BufferGeometry>(),
    materiais = new Map<Material, Material>(),
    esqueletos = new Set<Skeleton>(),
    nomes = new Set<string>()
  entrada.traverse((n) => originais.push(n))
  raiz.add(copiaRaiz)
  copiaRaiz.traverse((n) => {
    copias.push(n)
    nomes.add(n.name)
  })
  for (let i = 0; i < originais.length; i++) {
    porOrigem.set(originais[i]!.uuid, copias[i]!)
    origemDaCopia.set(copias[i]!.uuid, originais[i]!)
    if ((copias[i] as SkinnedMesh).isSkinnedMesh)
      esqueletos.add((copias[i] as SkinnedMesh).skeleton)
  }
  if (reflexo) {
    for (const no of copias) reflexo.no(no)
    const deslocamento = new Group()
    deslocamento.position.copy(reflexo.deslocamento)
    deslocamento.add(copiaRaiz)
    raiz.add(deslocamento)
  }
  let descartado = false,
    bytesGerados = 0,
    numero = 0,
    partesGeradas = 0
  const descartar = () => {
    if (descartado) return
    descartado = true
    for (const g of geometrias) g.dispose()
    for (const m of materiais.values()) m.dispose()
    for (const s of esqueletos) s.dispose()
    raiz.clear()
  }
  const proximoNome = () => {
    let nome: string
    do {
      nome = `cenario_parte_${numero++}`
    } while (nomes.has(nome))
    nomes.add(nome)
    return nome
  }
  try {
    for (const no of copias) {
      const malha = no as Mesh
      if (!malha.isMesh) continue
      if (!malha.parent) throw Error('A raiz animável precisa conter as malhas dentro de um grupo.')
      let visivel = true
      for (let ancestral: Object3D | null = malha; ancestral; ancestral = ancestral.parent)
        visivel &&= ancestral.visible
      const acabamento = aparencia.textura,
        original = acabamento
          ? projetarTexturaAnimavel(
              origemDaCopia.get(malha.uuid)! as Mesh,
              reflexo?.matriz ?? new Matrix4(),
              acabamento.escala,
              acabamento.repeticaoMetros,
            )
          : malha.geometry,
        quantidade = original.index?.count ?? original.getAttribute('position').count,
        inicio = original.drawRange.start,
        fim = Math.min(quantidade, inicio + original.drawRange.count),
        lista = Array.isArray(malha.material) ? malha.material : [malha.material],
        grupos = Array.isArray(malha.material)
          ? original.groups
          : [{ start: inicio, count: fim - inicio, materialIndex: 0 }],
        grupo = new Group(),
        partes: Mesh[] = []
      if (acabamento) geometrias.add(original)
      let esqueleto: Skeleton | undefined
      if (reflexo && (malha as SkinnedMesh).isSkinnedMesh) {
        esqueleto = reflexo.esqueleto(malha as SkinnedMesh)
        esqueletos.add(esqueleto)
      }
      grupo.copy(malha, false)
      grupo.uuid = malha.uuid
      for (const filho of [...malha.children]) grupo.add(filho)
      for (const faixa of grupos) {
        const de = Math.max(inicio, faixa.start),
          ate = Math.min(fim, faixa.start + faixa.count)
        if (ate <= de) continue
        const fonte = lista[faixa.materialIndex ?? 0]
        if (!fonte) throw Error('Uma parte animável aponta para um material ausente.')
        let material = materiais.get(fonte)
        if (!material) {
          if (acabamento) {
            const projetado = materialDaTextura(
              acabamento.mapa,
              acabamento.repeticaoMetros,
              fonte.side,
            )
            material = projetado.clone()
            projetado.dispose()
          } else material = fonte.clone()
          materiais.set(fonte, material)
          const cor = (material as Material & { color?: Color }).color
          if (cor?.isColor) cor.multiply(tinta)
          else if (tinta.getHex() !== 0xffffff)
            throw Error('O material não suporta a tonalidade da instância.')
        }
        const divididas = dividirGeometriaComDeformacoes(
          original,
          { inicio: de, quantidade: ate - de },
          LIMITES_DA_EXPORTACAO.malha.bytesDaSaida - bytesGerados,
        )
        for (const g of divididas) geometrias.add(g)
        for (const g of divididas) {
          reflexo?.geometria(g)
          if ((material as Material & { vertexColors?: boolean }).vertexColors !== true)
            g.deleteAttribute('color')
          if (++partesGeradas > LIMITES_DA_EXPORTACAO.malha.partes)
            throw Error('O modelo animável produz partes demais para a compilação.')
          bytesGerados +=
            Object.values(g.attributes).reduce((s, a) => s + a.count * a.itemSize * 4, 0) +
            Object.values(g.morphAttributes)
              .flat()
              .reduce((s, a) => s + (a ? a.count * a.itemSize * 4 : 0), 0) +
            (g.index?.array.byteLength ?? 0)
          let parte: Mesh
          if ((malha as SkinnedMesh).isSkinnedMesh) {
            const fonte = malha as SkinnedMesh,
              pele = new SkinnedMesh(g, material)
            esqueletos.add(fonte.skeleton)
            pele.bindMode = fonte.bindMode
            pele.bind(esqueleto ?? fonte.skeleton, esqueleto ? new Matrix4() : fonte.bindMatrix)
            parte = pele
          } else parte = new Mesh(g, material)
          parte.name = proximoNome()
          parte.castShadow = malha.castShadow
          parte.receiveShadow = malha.receiveShadow
          parte.frustumCulled = malha.frustumCulled
          parte.renderOrder = malha.renderOrder
          parte.visible = visivel
          if (malha.morphTargetInfluences)
            parte.morphTargetInfluences = [...malha.morphTargetInfluences]
          if (malha.morphTargetDictionary)
            parte.morphTargetDictionary = { ...malha.morphTargetDictionary }
          partes.push(parte)
          // glTF ignora transforms de pais da malha com skin. A hierarquia animada
          // continua nos ossos; as malhas ficam nas raízes da cena, com bind preservado.
          if ((parte as SkinnedMesh).isSkinnedMesh) raiz.add(parte)
          else grupo.add(parte)
        }
      }
      substituicoes.set(malha.uuid, partes)
      malha.parent.add(grupo)
      malha.removeFromParent()
      // UUID preserva a identidade TRS; os canais de morph serão distribuídos às partes.
      const origem = origemDaCopia.get(malha.uuid)
      if (origem) porOrigem.set(origem.uuid, grupo)
    }
    raiz.updateMatrixWorld(true)
    const clipes = animacoes.map((original) => {
      const clip = original.clone()
      clip.tracks = original.tracks.flatMap((track) => {
        const binding = PropertyBinding.parseTrackName(track.name),
          origem = PropertyBinding.findNode(entrada, binding.nodeName)
        if (!origem || !('uuid' in origem) || typeof origem.uuid !== 'string')
          throw Error(`A animação “${original.name}” aponta para um nó ausente.`)
        if (binding.objectName)
          throw Error('O clipe precisa usar canais de nó glTF antes da compilação.')
        if (
          !['position', 'quaternion', 'scale', 'morphTargetInfluences'].includes(
            binding.propertyName,
          ) ||
          (binding.propertyIndex !== undefined && binding.propertyName !== 'morphTargetInfluences')
        )
          throw Error('O canal de animação não tem representação portátil no glTF.')
        const destino = porOrigem.get(origem.uuid)
        if (!destino) throw Error('Não encontrei a cópia do nó animado.')
        const alvos =
          binding.propertyName === 'morphTargetInfluences'
            ? (substituicoes.get(destino.uuid) ?? [])
            : [destino]
        if (!alvos.length) throw Error('Um canal de morph ficou sem partes na compilação.')
        return alvos.map((alvo) => {
          const copia = track.clone(),
            indice = binding.propertyIndex !== undefined ? `[${binding.propertyIndex}]` : ''
          copia.name = `${alvo.uuid}.${binding.propertyName}${indice}`
          reflexo?.canal(copia, binding.propertyName)
          return copia
        })
      })
      return clip
    })
    return { raiz, animacoes: clipes, descartar }
  } catch (erro) {
    descartar()
    throw erro
  }
}
