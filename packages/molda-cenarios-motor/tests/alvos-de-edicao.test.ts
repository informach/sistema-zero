import { expect, test } from 'bun:test'
import {
  capturarConteudoDeConjunto,
  criarDocumentoVazio,
  resolverConjuntos,
} from '@sistemazero/molda-cenarios-core/v2'
import { Euler, Group, Matrix4, Quaternion, Vector3 } from 'three'
import { criarAlvosDeEdicao, type LocalDoObjeto } from '../src/alvos-de-edicao'
import { criarModeloDaForma } from '../src/formas'
import { LoteDoModelo } from '../src/lotes'
import { matrizDoObjeto, transformacaoDaMatriz } from '../src/matematica'
import { prepararPreviaDosApoios } from '../src/previa-dos-apoios'

test('alvo da montagem transforma o lote real como unidade, com giros XYZ e sem acumular erro entre gestos', () => {
  const origem = criarDocumentoVazio('origem', 'Jardim')
  origem.formas = [{ id: 'f', nome: 'Base', tipo: 'caixa', largura: 2, altura: 1, comprimento: 2 }]
  origem.instancias = Array.from({ length: 2 }, (_, i) => ({
    id: `p${i}`,
    nome: 'Peça',
    modelo: 'f',
    grupo: null,
    oculto: false,
    bloqueado: false,
    colisao: 'caixa' as const,
    apoio: { tipo: 'absoluto' as const },
    transformacao: {
      posicao: { x: i * 3, y: i, z: -i },
      rotacao: { x: 0.1 * i, y: 0.3 * i, z: 0.2 * i },
      escala: { x: 1 + i, y: 1, z: 0.5 },
    },
  }))
  const d = criarDocumentoVazio('cenario', 'Jardim')
  d.definicoesConjuntos = [
    {
      id: 'def',
      biblioteca: 'b',
      conjunto: 'j',
      revisao: 1,
      nome: 'Jardim',
      conteudo: capturarConteudoDeConjunto(origem, ['p0', 'p1'], 'conta'),
    },
  ]
  d.montagens = [
    {
      id: 'jardim',
      nome: 'Jardim',
      grupo: null,
      oculto: false,
      bloqueado: false,
      definicao: 'def',
      transformacao: {
        posicao: { x: 10, y: 0, z: 20 },
        rotacao: { x: 0.2, y: 0.4, z: 0.1 },
        escala: { x: 2, y: 2, z: 2 },
      },
    },
  ]
  d.formas = [{ ...origem.formas[0]!, id: 'exterior' }]
  d.instancias = [
    {
      ...structuredClone(origem.instancias[0]!),
      id: 'flor',
      modelo: 'exterior',
      apoio: { tipo: 'objeto', objeto: 'jardim', contato: { x: 1, y: 2, z: 0 }, deslocamento: 0.1 },
    },
    {
      ...structuredClone(origem.instancias[0]!),
      id: 'luz',
      modelo: 'exterior',
      apoio: { tipo: 'objeto', objeto: 'flor', contato: { x: 0, y: 1, z: 0 }, deslocamento: 0.2 },
    },
  ]
  const antes = structuredClone(d),
    projecao = resolverConjuntos(d),
    visual = projecao.documento
  const modelo = criarModeloDaForma(visual.formas![0]!),
    grupo = new Group(),
    lote = new LoteDoModelo(grupo, modelo.partes)
  try {
    const itens = visual.instancias.map((o) => ({
      id: o.id,
      matriz: matrizDoObjeto(visual, o, new Matrix4()),
    }))
    lote.preencher(itens)
    const locais = new Map<string, LocalDoObjeto>(
      itens.map((i, indice) => [i.id, { lote, indice, caixa: modelo.caixa, matriz: i.matriz }]),
    )
    const alvos = criarAlvosDeEdicao(d, locais, projecao.origens),
      alvo = alvos.get('jardim')!
    expect([...alvos.keys()]).toEqual(['flor', 'luz', 'jardim'])
    expect(alvo.uniforme).toBe(true)
    expect(alvo.caixa.isEmpty()).toBe(false)
    const geometria = lote.malhas[0]!.geometry,
      material = lote.malhas[0]!.material
    const atualizarApoios = prepararPreviaDosApoios(d, locais, ['jardim'])
    for (let n = 0; n < 20; n++) {
      const t = {
        posicao: { x: 30 + n, y: 5 - n / 10, z: -10 },
        rotacao: { x: 0.1 * n, y: 0.7 - n / 10, z: 0.2 },
        escala: { x: 3, y: 3, z: 3 },
      }
      alvo.matriz.compose(
        new Vector3(t.posicao.x, t.posicao.y, t.posicao.z),
        new Quaternion().setFromEuler(new Euler(t.rotacao.x, t.rotacao.y, t.rotacao.z, 'XYZ')),
        new Vector3(3, 3, 3),
      )
      alvo.atualizar()
      atualizarApoios(new Map([['jardim', alvo.matriz]]))
      const nova = structuredClone(d)
      nova.montagens![0]!.transformacao = t
      const esperado = resolverConjuntos(nova).documento
      esperado.instancias.forEach((o, indice) => {
        const matriz = new Matrix4()
        lote.malhas[0]!.getMatrixAt(indice, matriz)
        const correta = matrizDoObjeto(esperado, o, new Matrix4()).multiply(
          modelo.partes[0]!.matriz,
        )
        matriz.elements.forEach((v, eixo) => {
          expect(v).toBeCloseTo(correta.elements[eixo]!, 4)
        })
      })
    }
    const selecionados = ['jardim', 'flor'],
      misto = prepararPreviaDosApoios(d, locais, selecionados)
    const flor = locais.get('flor')!.matriz
    flor.elements[12]! += 3
    const florAntes = flor.clone()
    misto(
      new Map([
        ['jardim', alvo.matriz],
        ['flor', flor],
      ]),
    )
    expect(flor.elements).toEqual(florAntes.elements)
    const misturado = structuredClone(d)
    misturado.montagens![0]!.transformacao = transformacaoDaMatriz(alvo.matriz)
    misturado.instancias[0]!.transformacao = transformacaoDaMatriz(flor)
    misturado.instancias[0]!.apoio = { tipo: 'absoluto' }
    const correto = matrizDoObjeto(misturado, misturado.instancias[1]!, new Matrix4())
    locais.get('luz')!.matriz.elements.forEach((v, i) => {
      expect(v).toBeCloseTo(correto.elements[i]!, 6)
    })
    expect(lote.malhas).toHaveLength(1)
    expect(lote.malhas[0]!.geometry).toBe(geometria)
    expect(lote.malhas[0]!.material).toBe(material)
    expect(d).toEqual(antes)
  } finally {
    lote.descartar()
    modelo.descartar()
  }
})
