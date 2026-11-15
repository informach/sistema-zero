/** Recorte do acervo já preparado da Morada. Não lê/escreve a casa ou a posse de ninguém. */
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { MORADA_CATALOG } from '../../avatar-quarto/src/morada/catalog'

export const PECAS_MORADA_FAISCA = {
  morada_parede: 'construcao/parede_4m',
  morada_portal: 'construcao/porta_2m',
  morada_janela: 'construcao/janela_arco_2m',
  morada_caixilho: 'construcao/janela_arco_folhas_branca',
  morada_chao: 'construcao/chao_4m',
  morada_telhado: 'construcao/telhado_duas_aguas_v4_i50_1m',
  morada_oitao: 'construcao/telhado_oitao_v4_i50',
  morada_telhado_quatro: 'construcao/telhado_quatro_aguas_ponta_v4_i50',
  morada_porta: 'construcao/porta_classica_2_madeira',
  morada_caixa_correio: 'construcao/caixa_correio',
  morada_banco: 'moveis/cadeiras/banco_comprido_tabua',
  morada_quadro: 'moveis/quadros/mural_cortica_desenhos',
} as const
export async function prepararPecasMorada() {
  const pasta = resolve(import.meta.dirname, '../../../output/morada-assets/morada'),
    io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
  const saida = []
  for (const [id, peca] of Object.entries(PECAS_MORADA_FAISCA)) {
    const meta = MORADA_CATALOG.pieces[peca]!
    if (!meta) throw Error(`Peça Morada ausente: ${peca}`)
    const origem = new Uint8Array(await Bun.file(resolve(pasta, meta.file)).arrayBuffer()),
      hash = createHash('sha256').update(origem).digest('hex')
    if (!meta.file.includes(hash.slice(0, 24))) throw Error(`Cache Morada divergente: ${peca}`)
    const doc = await io.readBinary(origem),
      textures = new Map<string, ReturnType<typeof doc.createTexture>>()
    for (const mat of doc.getRoot().listMaterials()) {
      if (
        ['morada_parede', 'morada_portal', 'morada_janela', 'morada_oitao'].includes(id) &&
        ['face_a', 'face_b'].includes(mat.getName())
      ) {
        const linear = (n: number) => (n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4)
        mat
          .setBaseColorTexture(null)
          .setBaseColorFactor([linear(247 / 255), linear(228 / 255), linear(189 / 255), 1])
          .setRoughnessFactor(0.9)
        continue
      }
      const dados = meta.materials.find((m) => m.name === mat.getName())
      for (const [arquivo, tipo] of [
        [dados?.map, 'map'],
        [dados?.emissiveMap, 'emissive'],
      ] as const) {
        if (!arquivo) continue
        let tex = textures.get(arquivo)
        if (!tex) {
          tex = doc
            .createTexture(arquivo)
            .setImage(new Uint8Array(await Bun.file(resolve(pasta, arquivo)).arrayBuffer()))
            .setMimeType(arquivo.endsWith('.png') ? 'image/png' : 'image/webp')
          textures.set(arquivo, tex)
        }
        if (tipo === 'map') mat.setBaseColorTexture(tex)
        else mat.setEmissiveTexture(tex)
      }
    }
    for (const node of [...doc.getRoot().listNodes()])
      if (meta.collisionMeshes.includes(node.getName()) || node.getExtras().colisao) node.dispose()
    const dados = Buffer.from(await io.writeBinary(doc)),
      digest = createHash('sha256').update(dados).digest('hex')
    const j = JSON.parse(dados.toString('utf8', 20, 20 + dados.readUInt32LE(12)).trim()),
      inicio = 20 + dados.readUInt32LE(12) + 8
    const imagens = (j.images ?? []).map((img: { bufferView: number }) => {
      const v = j.bufferViews[img.bufferView]
      return createHash('sha256')
        .update(
          dados.subarray(inicio + (v.byteOffset ?? 0), inicio + (v.byteOffset ?? 0) + v.byteLength),
        )
        .digest('hex')
    })
    saida.push({
      id,
      dados,
      meta: {
        id,
        ensaio: true,
        rotulo: meta.label,
        origem: 'Morada',
        pacote: false,
        caminho: meta.file,
        sourcePiece: peca,
        sourceCommit: MORADA_CATALOG.source.commit,
        sourceDigest: hash,
        acabamento: ['morada_parede', 'morada_portal', 'morada_janela', 'morada_oitao'].includes(id)
          ? { faces: ['face_a', 'face_b'], corSRGB: '#f7e4bd', rugosidade: 0.9 }
          : null,
        digest,
        arquivo: `${id}.${digest.slice(0, 12)}.glb`,
        dims: [meta.size[0], meta.size[2], meta.size[1]],
        tris: meta.triangles,
        bytes: dados.length,
        colisao: [{ min: meta.min, max: meta.max }],
        clipes: [],
        imagens,
        encaixe: null,
        lago: null,
      },
    })
  }
  return saida
}
