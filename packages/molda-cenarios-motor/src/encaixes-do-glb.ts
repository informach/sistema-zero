import { readGltfDocument } from '@sistemazero/molda/gltf'
import { conferirGlb, type PontoDeEncaixe } from '@sistemazero/molda-cenarios-core/v2'
import { BufferAttribute, BufferGeometry, Matrix4, Quaternion, Vector3 } from 'three'
import { EXTENSOES_MATERIAIS } from './compilar/inspecao-glb'
import { pontosDeEncaixeDaGeometria } from './pontos-de-encaixe'

/**
 * Os pontos de encaixe de um `.glb` sem janela (o agente, no Bun): só a geometria importa, então
 * as imagens nem são decodificadas. A cena é a mesma que o GLTFLoader do palco monta (as malhas
 * no mundo da cena do arquivo), e os pontos saem da mesma função que a oficina usa.
 */
export function pontosDeEncaixeDoGlb(bytes: Uint8Array): PontoDeEncaixe[] {
  conferirGlb(bytes)
  const leitura = readGltfDocument(bytes, [], 'modelo.glb', {
    acceptedRequiredExtensions: EXTENSOES_MATERIAIS,
  })
  if (leitura.status !== 'ready') throw Error('O GLB precisa ser autocontido.')
  const d = leitura.document
  const raizes = d.graph.scenes.length
    ? d.graph.scenes[d.graph.defaultScene ?? 0]!.roots
    : d.graph.roots
  const partes: { geometria: BufferGeometry; matriz: Matrix4 }[] = []
  const pilha = raizes.map((indice) => ({ indice, pai: new Matrix4() }))
  try {
    while (pilha.length) {
      const { indice, pai } = pilha.pop()!
      const no = d.graph.nodes[indice]!
      const t = no.transform
      const local =
        t.kind === 'affine'
          ? new Matrix4().fromArray(t.matrix)
          : new Matrix4().compose(
              new Vector3(...t.translation),
              new Quaternion(...t.rotation),
              new Vector3(...t.scale),
            )
      const mundo = pai.clone().multiply(local)
      if (no.mesh !== null)
        for (const p of d.meshes[no.mesh]!.primitives) {
          const posicao = p.attributes.get('POSITION')
          if (posicao === undefined || p.topology.kind !== 'triangles') continue
          const geometria = new BufferGeometry()
          geometria.setAttribute(
            'position',
            new BufferAttribute(Float32Array.from(d.accessors[posicao]!.values), 3),
          )
          geometria.setIndex(new BufferAttribute(p.topology.indices, 1))
          partes.push({ geometria, matriz: mundo })
        }
      for (const filho of no.children) pilha.push({ indice: filho, pai: mundo })
    }
    return pontosDeEncaixeDaGeometria(partes)
  } finally {
    for (const p of partes) p.geometria.dispose()
  }
}
