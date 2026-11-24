import { expect, test } from 'bun:test'
import {
  criarDocumentoVazio,
  type DocumentoDeCenario,
  EncaixeDeComposicaoSchema,
  type PontoDeEncaixe,
} from '@sistemazero/molda-cenarios-core/v2'
import { renderToStaticMarkup } from 'react-dom/server'
import { Encaixes } from '../src/oficina/telas/Encaixes'
import { PontosDeEncaixe } from '../src/oficina/telas/PontosDeEncaixe'

const TRECHO: PontoDeEncaixe[] = [
  { posicao: { x: 0, y: 0.1, z: 2 }, direcao: { x: 0, z: 1 }, largura: 1.2 },
  { posicao: { x: 0, y: 0.1, z: -2 }, direcao: { x: 0, z: -1 }, largura: 1.2 },
]
const doc = (encaixes?: PontoDeEncaixe[]): DocumentoDeCenario => {
  const d = criarDocumentoVazio('11111111-1111-4111-8111-111111111111', 'Trilha')
  d.modelos = [
    {
      id: 'trecho',
      biblioteca: '22222222-2222-4222-8222-222222222222',
      modelo: '33333333-3333-4333-8333-333333333333',
      digest: 'a'.repeat(64),
      volume: { min: { x: -0.6, y: 0, z: -2 }, max: { x: 0.6, y: 0.1, z: 2 } },
      ...(encaixes ? { encaixes } : {}),
    },
  ]
  d.instancias = ['a', 'b'].map((id, i) => ({
    id,
    nome: id,
    grupo: null,
    bloqueado: false,
    oculto: false,
    modelo: 'trecho',
    transformacao: {
      posicao: { x: 0, y: 0, z: i * 4.5 },
      rotacao: { x: 0, y: 0, z: 0 },
      escala: { x: 1, y: 1, z: 1 },
    },
    apoio: { tipo: 'absoluto' },
    colisao: 'malha',
  }))
  return d
}
const tela = (d: DocumentoDeCenario) =>
  renderToStaticMarkup(
    <PontosDeEncaixe
      documento={d}
      id="b"
      executar={() => {}}
      pontosDaGeometria={() => TRECHO}
      aoRealcar={() => {}}
      desligado={false}
    />,
  )

test('sem pontos escritos, a lista mostra os da geometria e o botão de encaixar', () => {
  const html = tela(doc())
  expect(html).toContain('Encaixar na vizinha')
  expect(html).toContain('Pontos de encaixe deste modelo (2)')
  expect(html).toContain('Achados na geometria')
  expect(html).toContain('Somar ponto')
  expect(html).not.toContain('Voltar aos pontos da geometria')
})

test('com pontos escritos à mão, a lista é a do modelo e dá para voltar aos da geometria', () => {
  const html = tela(doc([TRECHO[0]!]))
  expect(html).toContain('Pontos de encaixe deste modelo (1)')
  expect(html).toContain('Escritos à mão')
  expect(html).toContain('Voltar aos pontos da geometria')
  // A direção da ponta da frente é 0°; a largura vem do ponto.
  expect(html).toContain('value="0"')
  expect(html).toContain('value="1.2"')
})

test('o painel de encaixe só mostra os pontos com uma peça escolhida', () => {
  const props = {
    documento: doc(),
    valor: EncaixeDeComposicaoSchema.parse({ grade: null, angulo: null }),
    aoMudar: () => {},
    ligado: true,
    aoLigar: () => {},
    executar: () => {},
    medir: () => null,
    pontosDaGeometria: () => TRECHO,
    aoRealcar: () => {},
  }
  expect(renderToStaticMarkup(<Encaixes {...props} selecao={['b']} />)).toContain(
    'Encaixar na vizinha',
  )
  expect(renderToStaticMarkup(<Encaixes {...props} selecao={['a', 'b']} />)).not.toContain(
    'Encaixar na vizinha',
  )
})
