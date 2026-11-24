import { LIMITES_DA_EXPORTACAO } from '@sistemazero/molda-cenarios-core/compilar'
import type { InstanciaDeCenario } from '@sistemazero/molda-cenarios-core/v2'
import {
  type BufferGeometry,
  Color,
  Group,
  type Material,
  Matrix4,
  Mesh,
  type MeshStandardMaterial,
  type Texture,
  Vector3,
} from 'three'
import type { ModeloCarregado } from '../modelos'
import { materializarUvDaTextura } from '../projecao-textura'
import { RepresentacoesDoModelo } from '../representacoes'
import { dividirParteEstatica } from './geometria'
import { temAnimacaoOuDeformacao } from './raiz-animavel'

/** Template local: a transformação final permanece no nó do manifesto.
 * Usa as variantes do renderer; não fabrica uma segunda regra de espelho ou projeção. */
export function prepararObjetoEstatico(
  objeto: InstanciaDeCenario,
  modelo: ModeloCarregado,
  textura?: Texture,
) {
  if (temAnimacaoOuDeformacao(modelo.raiz, modelo.animacoes))
    throw Error('Use a raiz animável para preservar pele, morphs e clipes deste modelo.')
  if (objeto.aparencia?.textura && !textura)
    throw Error(`A textura de “${objeto.nome}” precisa estar carregada para compilar.`)
  const temporario = new Group(),
    representacoes = new RepresentacoesDoModelo(temporario, modelo),
    raiz = new Group(),
    geometrias = new Set<BufferGeometry>(),
    materiais = new Map<Material, Material>(),
    tinta = new Color(objeto.aparencia?.cor ?? '#ffffff'),
    escala = objeto.transformacao.escala
  raiz.name = 'modelo'
  let descartado = false,
    bytes = 0,
    numero = 0
  const descartar = () => {
    if (descartado) return
    descartado = true
    for (const g of geometrias) g.dispose()
    for (const m of materiais.values()) m.dispose()
    raiz.clear()
  }
  try {
    const acabamento = objeto.aparencia?.textura,
      lote = representacoes.obter(
        objeto.espelho,
        acabamento && textura
          ? { textura, repeticaoMetros: acabamento.repeticaoMetros }
          : undefined,
      )
    for (const parte of lote.fontes()) {
      let fonte = parte.geometria,
        copia: BufferGeometry | undefined
      if (acabamento) {
        copia = fonte.clone()
        fonte = copia
        materializarUvDaTextura(
          fonte,
          new Vector3(escala.x, escala.y, escala.z),
          acabamento.repeticaoMetros,
        )
        fonte.deleteAttribute('normalDaFace')
      }
      let prontas: BufferGeometry[]
      try {
        prontas = dividirParteEstatica(
          { ...parte, geometria: fonte },
          new Matrix4(),
          LIMITES_DA_EXPORTACAO.malha.bytesDaSaida - bytes,
        )
      } finally {
        copia?.dispose()
      }
      for (const g of prontas) geometrias.add(g)
      let material = materiais.get(parte.material)
      if (!material) {
        material = parte.material.clone()
        materiais.set(parte.material, material)
        const cor = (material as Material & { color?: Color }).color
        if (cor?.isColor) cor.multiply(tinta)
        else if (tinta.getHex() !== 0xffffff)
          throw Error('O material não suporta a tonalidade da instância.')
      }
      for (const g of prontas) {
        if ((material as MeshStandardMaterial).vertexColors !== true) g.deleteAttribute('color')
        bytes +=
          Object.values(g.attributes).reduce((s, a) => s + a.count * a.itemSize * 4, 0) +
          (g.index?.array.byteLength ?? 0)
        const malha = new Mesh(g, material)
        malha.name = `parte_${numero++}`
        malha.castShadow = true
        malha.receiveShadow = true
        raiz.add(malha)
      }
    }
    return { raiz, descartar }
  } catch (erro) {
    descartar()
    throw erro
  } finally {
    representacoes.descartar()
    temporario.clear()
  }
}
