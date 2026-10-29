import {
  AparenciaLidaSchema,
  escalaDaCaixaDoMolda,
  type FaceDoMolde,
  type MoldeDeObjeto,
  type Plataforma,
  planificacaoDoMolde,
  tamanhoDoPng,
} from '@sistemazero/arquipelago-contracts'
import {
  Box3,
  Group,
  type Material,
  type Mesh,
  MeshStandardMaterial,
  NearestFilter,
  type Object3D,
  SRGBColorSpace,
  Texture,
  Vector3,
} from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { liberarObjeto } from './carregar-ilha'

/** Nomes do contrato da arte, com UV vista de fora e v para cima. */
export const NOMES_DAS_FACES: Record<FaceDoMolde, string> = {
  frente: 'pintaFrente',
  'lado-esq': 'pintaLadoEsq',
  'lado-dir': 'pintaLadoDir',
  topo: 'pintaTopo',
  tela: 'tela',
}

/** O Blender pode guardar a face como material de uma primitiva, ou como nó separado. */
function partesDaFace(raiz: Object3D, nome: string) {
  const partes: { mesh: Mesh; indices: number[] }[] = []
  raiz.traverse((o) => {
    const mesh = o as Mesh
    if (!mesh.isMesh) return
    let no: Object3D | null = mesh
    while (no && no.name !== nome) no = no.parent
    const materiais = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    const indices = materiais.flatMap((m, i) => (no || m.name === nome ? [i] : []))
    if (indices.length) partes.push({ mesh, indices })
  })
  return partes
}

export function trocarMaterialDaFace(raiz: Object3D, nome: string, material: Material): () => void {
  const partes = partesDaFace(raiz, nome)
  const anteriores = partes.map(({ mesh }) => mesh.material)
  partes.forEach(({ mesh, indices }) => {
    mesh.material = Array.isArray(mesh.material)
      ? mesh.material.map((m, i) => (indices.includes(i) ? material : m))
      : material
  })
  return () =>
    partes.forEach(({ mesh }, i) => {
      mesh.material = anteriores[i]!
    })
}

export interface AparenciaNoMundo {
  raiz: Object3D
  liberar(): void
}
/** Contadores sem ids pessoais, expostos só pelo playground. */
export const medicaoDasAparencias = { ativas: 0, carregadas: 0, liberadas: 0, molda: 0, pinta: 0 }

/** Preserva proporção e frente +z. A caixa da oficina determina a escala, não o tamanho da arte. */
export function encaixarCriacao(raiz: Object3D, molde: MoldeDeObjeto): Group {
  raiz.updateMatrixWorld(true)
  const box = new Box3().setFromObject(raiz)
  const size = box.getSize(new Vector3())
  if (![...box.min, ...box.max, ...size].every(Number.isFinite) || size.lengthSq() === 0)
    throw new Error('criação vazia')
  const c = molde.caixa
  const escala = Math.min(
    1 / escalaDaCaixaDoMolda(molde),
    c.largura / size.x,
    c.altura / size.y,
    c.fundo / size.z,
  )
  const grupo = new Group()
  grupo.name = 'aparencia-molda'
  const posicao = new Group()
  posicao.position.set(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2)
  posicao.add(raiz)
  grupo.scale.setScalar(escala)
  grupo.add(posicao)
  return grupo
}

/** O parser possui sua própria cena. Até resultados atrasados são descartados pelo chamador. */
function soltarModelo(raiz: Object3D) {
  const imagens = new Set<ImageBitmap>()
  raiz.traverse((o) => {
    const mesh = o as Mesh
    if (!mesh.isMesh) return
    for (const mat of Array.isArray(mesh.material) ? mesh.material : [mesh.material])
      for (const value of Object.values(mat))
        if (value instanceof Texture && typeof value.image?.close === 'function')
          imagens.add(value.image)
  })
  liberarObjeto(raiz)
  for (const image of imagens) image.close()
}

/** Uma leitura por montagem, sem cache de malhas, materiais ou texturas compartilhados. */
export async function carregarAparencia(
  ler: NonNullable<Plataforma['lerAparencia']>,
  id: string,
  molde: MoldeDeObjeto,
  modelo: Object3D,
  sinal: AbortSignal,
): Promise<AparenciaNoMundo | null> {
  let proprio: AparenciaNoMundo | null = null
  try {
    sinal.throwIfAborted()
    const lido = AparenciaLidaSchema.safeParse(await ler(id, sinal))
    sinal.throwIfAborted()
    if (!lido.success) return null
    const { bytes, tipo } = lido.data
    if (tipo === 'molda') {
      const gltf = await new GLTFLoader().parseAsync(Uint8Array.from(bytes).buffer, '')
      proprio = { raiz: gltf.scene, liberar: () => soltarModelo(gltf.scene) }
      sinal.throwIfAborted()
      proprio.raiz = encaixarCriacao(gltf.scene, molde)
    } else {
      const plan = planificacaoDoMolde(molde)
      const size = tamanhoDoPng(bytes)
      if (
        !plan ||
        size?.largura !== plan.largura ||
        size.altura !== plan.altura ||
        plan.faces.some((f) => partesDaFace(modelo, NOMES_DAS_FACES[f.face]).length === 0)
      )
        return null
      const bitmap = await createImageBitmap(
        new Blob([Uint8Array.from(bytes).buffer], { type: 'image/png' }),
        { imageOrientation: 'flipY' },
      )
      const texturas: Texture[] = []
      const materiais: Material[] = []
      const raiz = modelo.clone(true)
      raiz.name = 'aparencia-pinta'
      proprio = {
        raiz,
        liberar() {
          for (const t of texturas) t.dispose()
          for (const m of materiais) m.dispose()
          bitmap.close()
        },
      }
      sinal.throwIfAborted()
      for (const f of plan.faces) {
        const textura = new Texture(bitmap)
        textura.flipY = false
        textura.colorSpace = SRGBColorSpace
        textura.minFilter = textura.magFilter = NearestFilter
        textura.generateMipmaps = false
        textura.repeat.set((f.largura - 1) / plan.largura, (f.altura - 1) / plan.altura)
        textura.offset.set((f.x + 0.5) / plan.largura, 1 - (f.y + f.altura - 0.5) / plan.altura)
        textura.needsUpdate = true
        texturas.push(textura)
        const material = new MeshStandardMaterial({
          map: textura,
          roughness: 1,
          transparent: true,
        })
        material.name = NOMES_DAS_FACES[f.face]
        materiais.push(material)
        trocarMaterialDaFace(raiz, material.name, material)
      }
    }
    sinal.throwIfAborted()
    const pronto = proprio
    medicaoDasAparencias.ativas++
    medicaoDasAparencias.carregadas++
    medicaoDasAparencias[tipo]++
    let liberado = false
    return {
      raiz: pronto.raiz,
      liberar() {
        if (liberado) return
        liberado = true
        pronto.liberar()
        medicaoDasAparencias.ativas--
        medicaoDasAparencias.liberadas++
      },
    }
  } catch {
    proprio?.liberar()
    return null
  }
}
