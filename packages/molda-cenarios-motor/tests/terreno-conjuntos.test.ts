import { expect, test } from 'bun:test'
import {
  type BaseDeTerreno,
  capturarConteudoDeConjunto,
  criarDocumentoVazio,
  prepararOperacaoDeCaminho,
  resolverConjuntos,
} from '@sistemazero/molda-cenarios-core/v2'
import { Group, Matrix4 } from 'three'
import { criarAlvosDeEdicao, type LocalDoObjeto } from '../src/alvos-de-edicao'
import { criarModeloDaForma } from '../src/formas'
import { LoteDoModelo } from '../src/lotes'
import { matrizDoObjeto } from '../src/matematica'
import { prepararPreviaDosApoios } from '../src/previa-dos-apoios'
import { TerrenoDoPalco } from '../src/Terreno'

test.each([
  'escultura',
  'estrada',
])('a alça da raiz e sua pilha usam o terreno novo de %s, sem prender a prévia à altura anterior', (tipo) => {
  const origem = criarDocumentoVazio('fonte', 'Jardim')
  origem.formas = [{ id: 'f', nome: 'Bloco', tipo: 'caixa', largura: 1, altura: 1, comprimento: 1 }]
  origem.instancias = [
    {
      id: 'p',
      nome: 'Peça',
      modelo: 'f',
      grupo: null,
      oculto: false,
      bloqueado: false,
      colisao: 'caixa',
      apoio: { tipo: 'absoluto' },
      transformacao: {
        posicao: { x: 0, y: 0, z: 0 },
        rotacao: { x: 0, y: 0, z: 0 },
        escala: { x: 1, y: 1, z: 1 },
      },
    },
  ]
  const d = criarDocumentoVazio('cenario', 'Terreno')
  const base: BaseDeTerreno = {
    tipo: 'terreno',
    cobertura: 'grade',
    origem: { x: -32, z: -32 },
    colunas: 64,
    linhas: 64,
    passo: 1,
    min: -10,
    max: 100,
    fundo: 0,
    pecas: [],
  }
  d.base = base
  d.definicoesConjuntos = [
    {
      id: 'def',
      biblioteca: 'b',
      conjunto: 'j',
      revisao: 1,
      nome: 'Jardim',
      conteudo: capturarConteudoDeConjunto(origem, ['p'], 'conta'),
    },
  ]
  d.montagens = [
    {
      id: 'raiz',
      nome: 'Raiz',
      grupo: null,
      oculto: false,
      bloqueado: false,
      definicao: 'def',
      apoio: { tipo: 'terreno', deslocamento: 1 },
      transformacao: origem.instancias[0]!.transformacao,
    },
  ]
  d.formas = origem.formas
  d.instancias = [
    {
      ...origem.instancias[0]!,
      id: 'em-cima',
      apoio: { tipo: 'objeto', objeto: 'raiz', contato: { x: 0, y: 2, z: 0 }, deslocamento: 0 },
    },
  ]
  const antes = structuredClone(d),
    terreno = new TerrenoDoPalco(base, new Map())
  const estado = structuredClone(terreno.estado)
  estado.campo.alturas.fill(4)
  const estrada =
    tipo === 'estrada'
      ? prepararOperacaoDeCaminho(
          {
            id: 'via',
            nome: 'Entrada do jardim',
            tipo: 'estrada',
            grupo: null,
            oculto: false,
            bloqueado: false,
            acabamento: null,
            largura: 3,
            pontos: [
              { x: -8, z: 0 },
              { x: 8, z: 0 },
            ],
            molde: { deslocamento: -1.5, borda: 2, suavizacao: 4 },
          },
          estado,
        )
      : null
  if (estrada) d.caminhos = [estrada.caminho]
  terreno.prever(estrada?.terreno ?? estado, { alturas: { x0: 0, z0: 0, x1: 64, z1: 64 } })
  const projecao = resolverConjuntos(d, terreno.altura),
    visual = projecao.documento,
    modelo = criarModeloDaForma(visual.formas![0]!),
    lote = new LoteDoModelo(new Group(), modelo.partes)
  try {
    const itens = visual.instancias.map((o) => ({
      id: o.id,
      matriz: matrizDoObjeto(visual, o, new Matrix4(), terreno.altura),
    }))
    lote.preencher(itens)
    const locais = new Map<string, LocalDoObjeto>(
      itens.map((item, indice) => [
        item.id,
        { lote, indice, caixa: modelo.caixa, matriz: item.matriz },
      ]),
    )
    const alvos = criarAlvosDeEdicao(d, locais, projecao.origens, terreno.altura),
      raiz = alvos.get('raiz')!
    expect(raiz.matriz.elements[13]).toBe(tipo === 'estrada' ? 3.5 : 5)
    const filho = locais.get('em-cima')!,
      alturaInicial = filho.matriz.elements[13]!
    const atualizar = prepararPreviaDosApoios(d, locais, ['raiz'], terreno.altura)
    raiz.matriz.elements[13]! += 3
    raiz.atualizar()
    atualizar(new Map([['raiz', raiz.matriz]]))
    expect(filho.matriz.elements[13]! - alturaInicial).toBe(3)
    expect(d).toEqual(estrada ? { ...antes, caminhos: [estrada.caminho] } : antes)
    expect(estado.campo.alturas.every((h) => h === 4)).toBe(true)
  } finally {
    lote.descartar()
    modelo.descartar()
    terreno.descartar()
  }
})
