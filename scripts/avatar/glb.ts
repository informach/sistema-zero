/**
 * O que a migração faz com cada GLB da arte antes de enviar.
 *
 * As peças do pack trazem, cada uma, uma cópia da MESMA textura (286 KB): são 115 dos 141 MB da
 * biblioteca. Aqui a textura sai de dentro da peça e vai uma vez só para o bucket; o material
 * guarda, em `extras.avatar`, a impressão digital da textura que ele usava, e o código que monta o
 * boneco a aplica. De quebra a peça fica sem imagem embutida, que a política de segurança do Kids
 * não deixaria abrir (`connect-src` sem `blob:`).
 *
 * ⚠️ Sem Draco, meshopt nem quantização: o descompressor é WASM, e o Kids não roda WASM.
 */
import { createHash } from 'node:crypto'
import {
  type Accessor,
  type AnimationSampler,
  type Document,
  type Node as GltfNode,
  NodeIO,
  PropertyType,
} from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { prune } from '@gltf-transform/functions'

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)

/** Extensões que só existem por causa da imagem embutida. */
const SO_DA_TEXTURA = new Set(['EXT_texture_webp', 'EXT_texture_avif', 'KHR_texture_basisu'])

export function digital(bytes: Uint8Array, tamanho = 12): string {
  return createHash('sha256').update(bytes).digest('hex').slice(0, tamanho)
}

export interface TexturaTirada {
  digital: string
  bytes: Uint8Array
  /** Extensão do arquivo, pelo tipo da imagem. */
  extensao: string
}

export interface PecaPronta {
  glb: Uint8Array
  texturas: TexturaTirada[]
  materiais: string[]
}

const EXTENSAO_DO_TIPO: Record<string, string> = {
  'image/webp': 'webp',
  'image/png': 'png',
  'image/jpeg': 'jpg',
}

/** Tira as texturas de dentro do GLB e anota em cada material qual ele usava. */
export async function prepararPeca(origem: Uint8Array): Promise<PecaPronta> {
  const doc = await io.readBinary(origem)
  const raiz = doc.getRoot()
  const texturas = new Map<string, TexturaTirada>()

  const tirar = (textura: ReturnType<typeof raiz.listTextures>[number] | null) => {
    const imagem = textura?.getImage()
    if (!textura || !imagem) return undefined
    const marca = digital(imagem)
    const extensao = EXTENSAO_DO_TIPO[textura.getMimeType()]
    if (!extensao) throw new Error(`Textura de tipo sem regra: ${textura.getMimeType()}`)
    texturas.set(marca, { digital: marca, bytes: imagem, extensao })
    return marca
  }

  for (const material of raiz.listMaterials()) {
    const mapa = tirar(material.getBaseColorTexture())
    const emissivo = tirar(material.getEmissiveTexture())
    for (const outra of [
      material.getNormalTexture(),
      material.getOcclusionTexture(),
      material.getMetallicRoughnessTexture(),
    ]) {
      if (outra) throw new Error(`Material ${material.getName()} usa uma textura sem regra.`)
    }
    material.setBaseColorTexture(null)
    material.setEmissiveTexture(null)
    material.setExtras({
      ...material.getExtras(),
      avatar: { ...(mapa ? { map: mapa } : {}), ...(emissivo ? { emissiveMap: emissivo } : {}) },
    })
  }
  for (const textura of raiz.listTextures()) textura.dispose()
  for (const extensao of raiz.listExtensionsUsed()) {
    if (SO_DA_TEXTURA.has(extensao.extensionName)) extensao.dispose()
  }
  const sobrou = raiz.listTextures().length
  if (sobrou > 0) throw new Error(`Sobraram ${sobrou} texturas dentro da peça.`)

  return {
    glb: await io.writeBinary(doc),
    texturas: [...texturas.values()],
    materiais: raiz.listMaterials().map((m) => m.getName()),
  }
}

/** O que a migração mede em cada clipe, no `Hips` (escala nativa, metros). */
export interface MedidaDoClipe {
  /** Deslocamento horizontal (XZ) do primeiro ao último quadro. */
  passada: number
  /** Deslocamento vertical do primeiro ao último quadro. */
  subida: number
}

/**
 * Mede o deslocamento do `Hips` em cada clipe pedido. O pack guarda o andar no `Hips` (o `Root`
 * fica parado): o jogo tira esse deslocamento para a animação ficar no lugar, e a passada medida
 * aqui é o que casa a velocidade do corpo com o passo, sem o pé escorregar.
 */
export async function medirClipes(
  origem: Uint8Array,
  clipes: readonly string[],
  osso = 'Hips',
): Promise<Record<string, MedidaDoClipe>> {
  const doc = await io.readBinary(origem)
  const medidas: Record<string, MedidaDoClipe> = {}
  for (const animacao of doc.getRoot().listAnimations()) {
    const nome = animacao.getName()
    if (!clipes.includes(nome)) continue
    const canal = animacao
      .listChannels()
      .find((c) => c.getTargetNode()?.getName() === osso && c.getTargetPath() === 'translation')
    const saida = canal?.getSampler()?.getOutput()?.getArray()
    if (!saida || saida.length < 6) {
      medidas[nome] = { passada: 0, subida: 0 }
      continue
    }
    const n = saida.length
    const dx = (saida[n - 3] ?? 0) - (saida[0] ?? 0)
    const dy = (saida[n - 2] ?? 0) - (saida[1] ?? 0)
    const dz = (saida[n - 1] ?? 0) - (saida[2] ?? 0)
    medidas[nome] = {
      passada: Math.round(Math.hypot(dx, dz) * 1000) / 1000,
      subida: Math.round(dy * 1000) / 1000,
    }
  }
  for (const clipe of clipes)
    if (!medidas[clipe]) throw new Error(`O esqueleto da arte não tem o clipe ${clipe}.`)
  return medidas
}

/** Uma animação em arquivo próprio (o esqueleto e um clipe só), como a arte entrega as dela. */
export interface AnimacaoAvulsa {
  id: string
  glb: Uint8Array
}

/**
 * Põe a animação de um arquivo avulso dentro do documento do esqueleto, com o nome `id`. Os canais
 * são religados aos nós daqui pelo NOME do osso. Osso que só o clipe tem (a `Luz` da lanterna, filha
 * do osso da mão) entra como nó, embaixo do mesmo pai: no jogo, o canal acha o osso de verdade na
 * lanterna pelo nome.
 */
async function juntarAnimacao(doc: Document, avulsa: AnimacaoAvulsa): Promise<void> {
  const outro = await io.readBinary(avulsa.glb)
  const [animacao, ...mais] = outro.getRoot().listAnimations()
  if (!animacao || mais.length > 0)
    throw new Error(`O arquivo da animação ${avulsa.id} não tem exatamente um clipe.`)
  const raiz = doc.getRoot()
  const buffer = raiz.listBuffers()[0]
  if (!buffer) throw new Error('O esqueleto não tem buffer.')
  const nos = new Map(raiz.listNodes().map((n) => [n.getName(), n]))
  const noDe = (origem: GltfNode): GltfNode => {
    const nome = origem.getName()
    const tem = nos.get(nome)
    if (tem) return tem
    const pai = origem.getParentNode()
    if (!pai)
      throw new Error(`A animação ${avulsa.id} mexe no nó ${nome}, que o esqueleto não tem.`)
    const novo = doc
      .createNode(nome)
      .setTranslation(origem.getTranslation())
      .setRotation(origem.getRotation())
      .setScale(origem.getScale())
    noDe(pai).addChild(novo)
    nos.set(nome, novo)
    return novo
  }
  const copias = new Map<Accessor, Accessor>()
  const copiar = (dados: Accessor | null): Accessor => {
    const vetor = dados?.getArray()
    if (!dados || !vetor) throw new Error(`A animação ${avulsa.id} tem um canal sem dados.`)
    let copia = copias.get(dados)
    if (!copia) {
      copia = doc
        .createAccessor()
        .setType(dados.getType())
        .setArray(vetor.slice())
        .setBuffer(buffer)
      copias.set(dados, copia)
    }
    return copia
  }
  const nova = doc.createAnimation(avulsa.id)
  const amostras = new Map<AnimationSampler, AnimationSampler>()
  for (const canal of animacao.listChannels()) {
    const alvo = canal.getTargetNode()
    const origem = canal.getSampler()
    const caminho = canal.getTargetPath()
    if (!alvo || !origem || !caminho) continue
    let amostra = amostras.get(origem)
    if (!amostra) {
      amostra = doc
        .createAnimationSampler()
        .setInterpolation(origem.getInterpolation())
        .setInput(copiar(origem.getInput()))
        .setOutput(copiar(origem.getOutput()))
      amostras.set(origem, amostra)
      nova.addSampler(amostra)
    }
    nova.addChannel(
      doc
        .createAnimationChannel()
        .setTargetNode(noDe(alvo))
        .setTargetPath(caminho)
        .setSampler(amostra),
    )
  }
}

/**
 * O esqueleto só com os clipes pedidos (o configurador não precisa dos 28 do pack), mais as
 * animações avulsas da arte (as do jogo, uma por arquivo), no mesmo arquivo.
 */
export async function prepararEsqueleto(
  origem: Uint8Array,
  clipes: readonly string[],
  avulsas: readonly AnimacaoAvulsa[] = [],
): Promise<{ glb: Uint8Array; clipes: string[] }> {
  const doc = await io.readBinary(origem)
  const raiz = doc.getRoot()
  const ficam = new Set(clipes)
  const existentes = new Set(raiz.listAnimations().map((a) => a.getName()))
  for (const clipe of clipes) {
    if (!existentes.has(clipe)) throw new Error(`O esqueleto da arte não tem o clipe ${clipe}.`)
  }
  for (const animacao of raiz.listAnimations()) {
    if (!ficam.has(animacao.getName())) animacao.dispose()
  }
  for (const avulsa of avulsas) {
    if (existentes.has(avulsa.id) || ficam.has(avulsa.id))
      throw new Error(`A animação avulsa ${avulsa.id} tem o nome de um clipe do pack.`)
    await juntarAnimacao(doc, avulsa)
  }
  // Só os dados que ficaram sem dono saem: nós, ossos e a pele continuam como vieram.
  await doc.transform(prune({ propertyTypes: [PropertyType.ACCESSOR, PropertyType.BUFFER] }))
  return { glb: await io.writeBinary(doc), clipes: raiz.listAnimations().map((a) => a.getName()) }
}
