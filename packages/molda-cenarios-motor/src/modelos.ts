import {
  Box3,
  type BufferGeometry,
  type Material,
  Matrix4,
  type Mesh,
  type Object3D,
  type Texture,
  TextureLoader,
  Vector3,
} from 'three'
import { GLTFLoader, type GLTFParser } from 'three/addons/loaders/GLTFLoader.js'

/** Um pedaço do modelo: uma malha com um material, já no lugar dentro do modelo. */
export interface ParteDoModelo {
  geometria: BufferGeometry
  material: Material
  matriz: Matrix4
}

export interface ModeloCarregado {
  partes: ParteDoModelo[]
  caixa: Box3
  triangulos: number
  raiz: Object3D
  descartar(): void
}

function novoLeitor(): GLTFLoader {
  const leitor = new GLTFLoader()
  // No Chrome o GLTFLoader lê as imagens de dentro do .glb com fetch(blob:), que a política de
  // segurança dos apps recusa (connect-src não libera blob:), e o modelo sairia sem textura,
  // em silêncio. Pela <img>, que o img-src blob: deixa, funciona em qualquer host.
  leitor.register((parser: GLTFParser) => {
    const alvo = parser as unknown as {
      textureLoader?: { isImageBitmapLoader?: boolean } | TextureLoader
      options: { manager: ConstructorParameters<typeof TextureLoader>[0]; crossOrigin: string }
    }
    if (
      (alvo.textureLoader as { isImageBitmapLoader?: boolean } | undefined)?.isImageBitmapLoader
    ) {
      const imagens = new TextureLoader(alvo.options.manager)
      imagens.setCrossOrigin(alvo.options.crossOrigin)
      alvo.textureLoader = imagens
    }
    return { name: 'sz_texturas_pela_img' }
  })
  return leitor
}

const CHAVES_DE_TEXTURA = [
  'map',
  'normalMap',
  'roughnessMap',
  'metalnessMap',
  'emissiveMap',
  'aoMap',
  'alphaMap',
] as const

function descartarMaterial(material: Material) {
  const comTexturas = material as unknown as Record<string, Texture | null | undefined>
  for (const chave of CHAVES_DE_TEXTURA) comTexturas[chave]?.dispose()
  material.dispose()
}

/** Lê um GLB e o deixa pronto para desenhar muitas cópias. Quem chama descarta. */
export async function lerGlb(bytes: ArrayBuffer): Promise<ModeloCarregado> {
  const gltf = await novoLeitor().parseAsync(bytes, '')
  const raiz = gltf.scene
  raiz.updateMatrixWorld(true)
  const partes: ParteDoModelo[] = []
  const geometrias = new Set<BufferGeometry>()
  const materiais = new Set<Material>()
  let triangulos = 0
  raiz.traverse((no) => {
    const malha = no as Mesh
    if (!malha.isMesh) return
    const geometria = malha.geometry
    geometrias.add(geometria)
    const lista = Array.isArray(malha.material) ? malha.material : [malha.material]
    const grupos = geometria.groups
    if (lista.length > 1 && grupos.length > 0) {
      // Malha com vários materiais: uma parte por grupo, sobre a mesma geometria.
      for (const grupo of grupos) {
        const material = lista[grupo.materialIndex ?? 0]
        if (!material) continue
        const recorte = geometria.clone()
        recorte.clearGroups()
        recorte.setDrawRange(grupo.start, grupo.count)
        geometrias.add(recorte)
        materiais.add(material)
        partes.push({ geometria: recorte, material, matriz: malha.matrixWorld.clone() })
      }
    } else {
      const material = lista[0]
      if (!material) return
      materiais.add(material)
      partes.push({ geometria, material, matriz: malha.matrixWorld.clone() })
    }
    const indice = geometria.index
    const pontos = indice ? indice.count : (geometria.getAttribute('position')?.count ?? 0)
    triangulos += Math.floor(pontos / 3)
  })
  const caixa = new Box3().setFromObject(raiz)
  if (caixa.isEmpty()) caixa.set(new Vector3(-0.5, 0, -0.5), new Vector3(0.5, 1, 0.5))
  let descartado = false
  return {
    partes,
    caixa,
    triangulos,
    raiz,
    descartar() {
      if (descartado) return
      descartado = true
      for (const g of geometrias) g.dispose()
      for (const m of materiais) descartarMaterial(m)
    },
  }
}

export const MATRIZ_IDENTIDADE = new Matrix4()
