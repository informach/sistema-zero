import { normalizeGlbImagePadding } from '@sistemazero/molda/gltf'
import { LIMITES_DA_EXPORTACAO } from '@sistemazero/molda-cenarios-core/compilar'
import type { AnimationClip, Mesh, Object3D } from 'three'
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js'
import type { ArquivosDaCompilacao } from './arquivos'
import { prepararImagensDoGlb } from './imagens-glb'
import { inspecionarGlbDaCompilacao } from './inspecao-glb'

/** Serializa somente raízes já preparadas: shaders de solo/água precisam de acabamento portátil.
 * O navegador fornece encoder de imagens/FileReader; não precisa existir renderer WebGL. */
export async function gravarGlbCompilado(
  raiz: Object3D,
  caminho: string,
  papel: 'modelo' | 'terreno' | 'agua' | 'caminho' | 'colisao',
  arquivos: ArquivosDaCompilacao,
  sinal: AbortSignal,
  animacoes: readonly AnimationClip[] = [],
) {
  sinal.throwIfAborted()
  let memoria = 0,
    malhas = 0
  raiz.traverseVisible((no) => {
    const m = no as Mesh & {
      isInstancedMesh?: boolean
      isBatchedMesh?: boolean
      isLine?: boolean
      isPoints?: boolean
    }
    if (m.isInstancedMesh || m.isBatchedMesh || m.isLine || m.isPoints)
      throw Error('Materialize as instâncias e exclua as guias antes de gravar o GLB compilado.')
    if (!m.isMesh) return
    malhas++
    const g = m.geometry,
      posicao = g.getAttribute('position'),
      quantidade = g.index?.count ?? posicao?.count ?? 0
    if (
      Object.entries(g.morphAttributes).some(
        ([nome, canais]) => canais?.length && !['position', 'normal'].includes(nome),
      )
    )
      throw Error(
        'O exportador glTF instalado preserva morphs de posição e normal; outro canal não pode ser omitido silenciosamente.',
      )
    if (!posicao || posicao.count > 65_000 || quantidade > 390_000)
      throw Error('A geometria precisa ser dividida antes de gravar o GLB compilado.')
    if (
      g.drawRange.start !== 0 ||
      (g.drawRange.count !== Infinity && g.drawRange.count !== quantidade)
    )
      throw Error('Materialize o intervalo de desenho antes de gravar o GLB compilado.')
    for (const a of [...Object.values(g.attributes), ...Object.values(g.morphAttributes).flat()])
      if (a) memoria += a.count * a.itemSize * 4
    memoria += (g.index?.count ?? 0) * 4
    if (
      memoria > LIMITES_DA_EXPORTACAO.malha.bytesDaSaida ||
      malhas > LIMITES_DA_EXPORTACAO.malha.partes
    )
      throw Error('O GLB excede o orçamento de memória ou de partes da compilação.')
  })
  const imagens = prepararImagensDoGlb(raiz)
  let resultado: ArrayBuffer | { [key: string]: unknown }
  try {
    resultado = await new GLTFExporter().parseAsync(raiz, {
      binary: true,
      onlyVisible: true,
      maxTextureSize: 4096,
      animations: [...animacoes],
      includeCustomExtensions: false,
    })
  } finally {
    imagens.descartar()
  }
  sinal.throwIfAborted()
  if (!(resultado instanceof ArrayBuffer)) throw Error('O exportador não produziu um arquivo GLB.')
  const bytes = normalizeGlbImagePadding(new Uint8Array(resultado)),
    medidas = inspecionarGlbDaCompilacao(bytes)
  sinal.throwIfAborted()
  return arquivos.adicionarDeduplicado(caminho, bytes, {
    mime: 'model/gltf-binary',
    papel,
    malhas: medidas.malhas,
    triangulos: medidas.triangulos,
    verticesMaximos: medidas.verticesMaximos,
  })
}
