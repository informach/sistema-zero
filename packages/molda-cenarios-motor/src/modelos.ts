import { conferirGlb, digestDosBytes } from '@sistemazero/molda-cenarios-core/v2'
import {
  type AnimationClip,
  Box3,
  type BufferGeometry,
  LoadingManager,
  type Material,
  Matrix4,
  type Mesh,
  type Object3D,
  type Skeleton,
  type SkinnedMesh,
  type Texture,
  TextureLoader,
  Vector3,
} from 'three'
import { GLTFLoader, type GLTFParser } from 'three/addons/loaders/GLTFLoader.js'
import { transformarGeometriaEstatica } from './geometria-instanciada'
import { ArquivoDoConjunto, RecursosDoConjunto } from './importacao/recursos'
import { geometriaDaPoseInicial } from './modelo-estatico'

/** Confere o conteúdo fixado no documento antes de entregar qualquer dado ao carregador 3D. */
export async function conferirConteudoDoModelo(
  bytes: ArrayBuffer,
  digest: string,
): Promise<ArrayBuffer> {
  const dados = new Uint8Array(bytes)
  conferirGlb(dados)
  if ((await digestDosBytes(dados)) !== digest)
    throw Error('O arquivo do modelo não corresponde à versão guardada no cenário')
  return bytes
}

/** Um pedaço do modelo: uma malha com um material, já no lugar dentro do modelo. */
export interface ParteDoModelo {
  geometria: BufferGeometry
  material: Material
  matriz: Matrix4
}

export interface ModeloCarregado {
  animacoes?: readonly AnimationClip[]
  partes: ParteDoModelo[]
  caixa: Box3
  triangulos: number
  raiz: Object3D
  descartar(): void
}

function novoLeitor(falhas: unknown[]): GLTFLoader {
  const externas = new Set<string>(),
    gerenciador = new LoadingManager(),
    leitor = new GLTFLoader(gerenciador)
  // O parser revoga seus Blob URLs no sucesso, mas a via de erro não o faz.
  // URLs que já vieram declaradas no GLB pertencem ao chamador, não a este loader.
  gerenciador.onError = (url) => {
    if (url.startsWith('blob:') && !externas.has(url)) URL.revokeObjectURL(url)
  }
  // No Chrome o GLTFLoader lê as imagens de dentro do .glb com fetch(blob:), que a política de
  // segurança dos apps recusa (connect-src não libera blob:), e o modelo sairia sem textura,
  // em silêncio. Pela <img>, que o img-src blob: deixa, funciona em qualquer host.
  leitor.register((parser: GLTFParser) => {
    if (Array.isArray(parser.json.images))
      for (const imagem of parser.json.images)
        if (imagem && typeof imagem.uri === 'string') externas.add(imagem.uri)
    // O GLTFLoader converte falha de imagem em textura null. A cena inteira deve
    // falhar, em vez de parecer válida com parte da arte perdida silenciosamente.
    const carregarImagem = parser.loadImageSource.bind(parser)
    parser.loadImageSource = async (...argumentos) => {
      try {
        return await carregarImagem(...argumentos)
      } catch (erro) {
        falhas.push(erro)
        throw erro
      }
    }
    parser.fileLoader = new ArquivoDoConjunto(
      parser.options.manager,
      new RecursosDoConjunto(new Map(), 'modelo.glb'),
    )
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
  const falhas: unknown[] = [],
    gltf = await novoLeitor(falhas).parseAsync(bytes, '')
  const raiz = gltf.scene
  raiz.updateMatrixWorld(true)
  const partes: ParteDoModelo[] = []
  const geometrias = new Set<BufferGeometry>()
  const materiais = new Set<Material>()
  const esqueletos = new Set<Skeleton>()
  raiz.traverse((no) => {
    const m = no as Mesh
    if (!m.isMesh) return
    const pele = m as SkinnedMesh
    if (pele.isSkinnedMesh) esqueletos.add(pele.skeleton)
    geometrias.add(m.geometry)
    for (const material of Array.isArray(m.material) ? m.material : [m.material])
      materiais.add(material)
  })
  let triangulos = 0
  try {
    if (falhas.length)
      throw Error('Não consegui decodificar uma imagem do modelo GLB.', { cause: falhas[0] })
    raiz.traverse((no) => {
      const malha = no as Mesh
      if (!malha.isMesh) return
      geometrias.add(malha.geometry)
      const geometria = geometriaDaPoseInicial(malha)
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
    // InstancedMesh não aceita escalas negativas. Materializa somente esses nós do GLB.
    for (let i = 0; i < partes.length; i++) {
      const p = partes[i]!
      if (p.matriz.determinant() >= 0) continue
      const geometria = transformarGeometriaEstatica(p.geometria, p.matriz)
      geometrias.add(geometria)
      partes[i] = { ...p, geometria, matriz: new Matrix4() }
    }
    const caixa = new Box3().setFromObject(raiz)
    if (![...caixa.min, ...caixa.max].every(Number.isFinite))
      throw new Error('As medidas do modelo são inválidas')
    if (caixa.isEmpty()) caixa.set(new Vector3(-0.5, 0, -0.5), new Vector3(0.5, 1, 0.5))
    let descartado = false
    return {
      animacoes: gltf.animations,
      partes,
      caixa,
      triangulos,
      raiz,
      descartar() {
        if (descartado) return
        descartado = true
        for (const g of geometrias) g.dispose()
        for (const m of materiais) descartarMaterial(m)
        for (const s of esqueletos) s.dispose()
      },
    }
  } catch (e) {
    for (const g of geometrias) g.dispose()
    for (const m of materiais) descartarMaterial(m)
    for (const s of esqueletos) s.dispose()
    throw e
  }
}

export const MATRIZ_IDENTIDADE = new Matrix4()
