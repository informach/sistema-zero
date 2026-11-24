import { expect, test } from 'bun:test'
import {
  capturarFragmento,
  criarDocumentoVazio,
  type InstanciaDeCenario,
  resolverConjuntos,
} from '@sistemazero/molda-cenarios-core/v2'
import { Euler, Matrix4, Quaternion, Vector3 } from 'three'

test('expansão rígida confere com matrizes Three em XYZ, escala por eixo e singularidades de Euler', () => {
  const giros = [
    { x: 0.7, y: -0.4, z: 1.2 },
    { x: Math.PI / 2, y: 0, z: 0 },
    { x: 0, y: Math.PI / 2, z: 0 },
    { x: 0, y: -Math.PI / 2, z: 0 },
    { x: -1.5, y: 0.8, z: -0.3 },
  ]
  const matriz = (t: InstanciaDeCenario['transformacao']) =>
    new Matrix4().compose(
      new Vector3(t.posicao.x, t.posicao.y, t.posicao.z),
      new Quaternion().setFromEuler(new Euler(t.rotacao.x, t.rotacao.y, t.rotacao.z, 'XYZ')),
      new Vector3(t.escala.x, t.escala.y, t.escala.z),
    )
  for (const giroDoPai of giros)
    for (const giroDaPeca of giros) {
      const fonte = criarDocumentoVazio('fonte', 'Fonte')
      fonte.formas = [
        { id: 'f', nome: 'Peça', tipo: 'caixa', largura: 2, altura: 3, comprimento: 1 },
      ]
      const objeto: InstanciaDeCenario = {
        id: 'o',
        nome: 'Peça',
        modelo: 'f',
        grupo: null,
        bloqueado: false,
        oculto: false,
        colisao: 'caixa',
        apoio: { tipo: 'absoluto' },
        transformacao: {
          posicao: { x: 2, y: 4, z: -3 },
          rotacao: giroDaPeca,
          escala: { x: 2, y: 0.5, z: 1.5 },
        },
      }
      fonte.instancias = [objeto]
      const conteudo = capturarFragmento(fonte, ['o'], 'conta'),
        doc = criarDocumentoVazio('c', 'Conjuntos')
      const transformacao = {
        posicao: { x: 10, y: 7, z: 15 },
        rotacao: giroDoPai,
        escala: { x: 1.7, y: 1.7, z: 1.7 },
      }
      doc.definicoesConjuntos = [
        { id: 'd', biblioteca: 'b', conjunto: 'c', revisao: 1, nome: 'Peça', conteudo },
      ]
      doc.montagens = [
        {
          id: 'copia',
          nome: 'Cópia',
          definicao: 'd',
          grupo: null,
          bloqueado: false,
          oculto: false,
          transformacao,
        },
      ]
      const o = resolverConjuntos(doc).documento.instancias[0]!
      const esperado = matriz(transformacao)
        .multiply(
          new Matrix4().makeTranslation(-conteudo.ancora.x, -conteudo.ancora.y, -conteudo.ancora.z),
        )
        .multiply(matriz(objeto.transformacao))
      const obtido = matriz(o.transformacao)
      for (let i = 0; i < 16; i++) expect(obtido.elements[i]!).toBeCloseTo(esperado.elements[i]!, 7)
    }
})
