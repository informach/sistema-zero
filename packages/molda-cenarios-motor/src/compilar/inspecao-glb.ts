import {
  inspectReferenceRaster,
  normalizeGlbImagePadding,
  readGltfDocument,
} from '@sistemazero/molda/gltf'
import { LIMITES_DA_EXPORTACAO } from '@sistemazero/molda-cenarios-core/compilar'
import {
  conferirGlb,
  conferirImagemDeCenario,
  digestDosBytes,
} from '@sistemazero/molda-cenarios-core/v2'

// Apenas extensões materiais que o GLTFLoader instalado decodifica. Não aceitamos
// extensões que introduzam buffers, topologia comprimida ou instâncias adicionais.
const EXTENSOES_MATERIAIS = [
  'EXT_texture_webp',
  'KHR_texture_transform',
  'KHR_materials_unlit',
  'KHR_materials_clearcoat',
  'KHR_materials_ior',
  'KHR_materials_transmission',
  'KHR_materials_specular',
  'KHR_materials_sheen',
  'KHR_materials_volume',
  'KHR_materials_iridescence',
  'KHR_materials_anisotropy',
  'KHR_materials_dispersion',
  'KHR_materials_emissive_strength',
] as const

/** Confere bytes reais com os leitores limitados do Molda antes de chamar o GLTFLoader.
 * O teto de leitura compartilhado é 32 MiB por arquivo; o pacote pode conter várias partes. */
export function inspecionarGlbDaCompilacao(
  bytes: Uint8Array,
  opcoes: { fonte?: boolean; luzes?: boolean } = {},
) {
  conferirGlb(bytes)
  const extensoes: readonly string[] = opcoes.luzes
    ? [...EXTENSOES_MATERIAIS, 'KHR_lights_punctual']
    : EXTENSOES_MATERIAIS
  // Entradas de outros exportadores podem descrever o padding junto da imagem.
  // A conferência usa uma cópia canônica, mantendo bytes/digest originais na autoria.
  const leitura = readGltfDocument(
    opcoes.fonte ? normalizeGlbImagePadding(bytes) : bytes,
    [],
    'modelo.glb',
    {
      acceptedRequiredExtensions: extensoes,
    },
  )
  if (leitura.status !== 'ready') throw Error('O GLB precisa ser autocontido.')
  const d = leitura.document
  for (const e of d.extensions.unhandled)
    if (!extensoes.includes(e))
      throw Error(`A extensão “${e}” não pode entrar no pacote compilado sem um adaptador.`)
  const profundidades = new Uint16Array(d.graph.nodes.length)
  for (const indice of d.graph.order) {
    const pai = d.graph.nodes[indice]!.parent
    const profundidade = pai === null ? 1 : profundidades[pai]! + 1
    if (profundidade > 128) throw Error('A hierarquia do GLB é profunda demais para o carregador.')
    profundidades[indice] = profundidade
  }
  let bytesDePixels = 0
  const imagens: { bytes: Uint8Array; pixels: number }[] = []
  for (const imagem of d.resources.images) {
    const tipo = imagem.mimeType ?? imagem.uriMimeType
    const medidas =
      tipo === 'image/webp'
        ? conferirImagemDeCenario(imagem.bytes, 'image/webp')
        : (() => {
            const r = inspectReferenceRaster(imagem.bytes)
            if (tipo !== null && tipo !== r.mime)
              throw Error('O MIME da imagem do GLB é incompatível.')
            return { largura: r.width, altura: r.height }
          })()
    if (
      medidas.largura > 4096 ||
      medidas.altura > 4096 ||
      medidas.largura * medidas.altura > 8_388_608
    )
      throw Error(
        'Uma imagem do GLB excede o limite portátil de pixels; redimensione a fonte antes de exportar.',
      )
    bytesDePixels += medidas.largura * medidas.altura * 4
    imagens.push({ bytes: imagem.bytes, pixels: medidas.largura * medidas.altura * 4 })
    if (bytesDePixels > LIMITES_DA_EXPORTACAO.malha.bytesDaFonte)
      throw Error('As imagens do GLB excedem o orçamento de memória da compilação.')
  }
  let malhas = 0,
    triangulos = 0,
    verticesMaximos = 0,
    bytesNumericos = 0
  for (const a of d.accessors) bytesNumericos += a.values.byteLength
  const estatisticas = d.meshes.map((m) => {
    let partes = 0,
      tris = 0,
      bytesGeometria = 0
    for (const p of m.primitives) {
      if (
        p.targets.some((t) =>
          [...t.keys()].some((canal) => !['POSITION', 'NORMAL'].includes(canal)),
        )
      )
        throw Error(
          'Um canal de morph não pode ser preservado pelo leitor/exportador glTF instalado.',
        )
      if (p.topology.kind !== 'triangles') throw Error('A compilação exige malhas de triângulos.')
      const indice = p.attributes.get('POSITION')
      if (indice === undefined) throw Error('Uma malha não possui posições.')
      const vertices = d.accessors[indice]!.count
      bytesGeometria += p.topology.indices.length * 4
      for (const a of p.attributes.values()) bytesGeometria += d.accessors[a]!.values.length * 4
      for (const alvo of p.targets)
        for (const a of alvo.values()) bytesGeometria += d.accessors[a]!.values.length * 4
      if (!p.attributes.has('NORMAL')) bytesGeometria += vertices * 12
      verticesMaximos = Math.max(verticesMaximos, vertices)
      if (!opcoes.fonte && vertices > LIMITES_DA_EXPORTACAO.malha.verticesPorParte)
        throw Error(
          'Uma parte compilada excede 65.000 vértices; divida a geometria antes de exportar.',
        )
      if (!opcoes.fonte && p.topology.indices.length > LIMITES_DA_EXPORTACAO.malha.indicesPorParte)
        throw Error('Uma parte compilada excede o orçamento de índices.')
      partes++
      tris += p.topology.indices.length / 3
      bytesNumericos += p.topology.indices.byteLength
    }
    return { partes, tris, bytesGeometria }
  })
  if (bytesNumericos > LIMITES_DA_EXPORTACAO.malha.bytesDaFonte)
    throw Error('Os dados numéricos do GLB excedem o orçamento de memória.')
  const raizes = d.graph.scenes.length
    ? d.graph.scenes[d.graph.defaultScene ?? 0]!.roots
    : d.graph.roots
  const selecionados = [...raizes],
    partesNomeadas: { nome: string; triangulos: number; primitivas: number }[] = []
  // Reserva conservadora para as representações estáticas/poses e buffers de
  // transformação que o motor materializa por nó, mesmo com accessors compartilhados.
  let bytesDeMaterializacao = bytesNumericos
  for (let cursor = 0; cursor < selecionados.length; cursor++) {
    const no = d.graph.nodes[selecionados[cursor]!]!
    selecionados.push(...no.children)
    if (no.mesh !== null) {
      const e = estatisticas[no.mesh]!
      malhas += e.partes
      triangulos += e.tris
      bytesDeMaterializacao += e.bytesGeometria * 2
      if (no.name !== null)
        partesNomeadas.push({ nome: no.name, triangulos: e.tris, primitivas: e.partes })
    }
    if (malhas > LIMITES_DA_EXPORTACAO.malha.partes || triangulos > 16_000_000)
      throw Error('As instâncias do GLB excedem o orçamento de malhas ou triângulos.')
    if (bytesDeMaterializacao > LIMITES_DA_EXPORTACAO.malha.bytesDaFonte)
      throw Error('A materialização dos nós do GLB excede o orçamento de memória.')
  }
  if (!malhas) throw Error('O GLB não possui malhas na cena selecionada.')
  return {
    malhas,
    triangulos,
    verticesMaximos,
    bytesNumericos,
    bytesDeMaterializacao,
    bytesDePixels,
    /** Cada imagem embutida (os bytes do próprio GLB, sem cópia) e quanto ocupa decodificada:
     * modelos de um mesmo kit repetem o mesmo atlas, que só deve contar uma vez. */
    imagens,
    partesNomeadas,
    animavel:
      d.animations.length > 0 ||
      d.skins.length > 0 ||
      d.meshes.some((m) => m.primitives.some((p) => p.targets.length > 0)),
  }
}

/**
 * Os pixels das imagens ainda não contadas (na compilação, na conferência do pacote). A mesma
 * imagem embutida em outro modelo (o atlas de um kit) é decodificada uma vez só e não pesa de
 * novo no orçamento.
 */
export async function pixelsDasImagensNovas(
  imagens: readonly { bytes: Uint8Array; pixels: number }[],
  contadas: Set<string>,
): Promise<number> {
  let pixels = 0
  for (const imagem of imagens) {
    const chave = await digestDosBytes(imagem.bytes)
    if (contadas.has(chave)) continue
    contadas.add(chave)
    pixels += imagem.pixels
  }
  return pixels
}
