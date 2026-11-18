import { expect, test } from 'bun:test'
import {
  capturarFragmento,
  colarFragmento,
  criarDocumentoVazio,
  executarLote,
  idsDoFragmento,
  inverterLote,
  MarcadorSchema,
  pontoDoMarcador,
  validarConteudoDeConjunto,
} from '../src/v2'

function cena() {
  const d = criarDocumentoVazio('d', 'Pátio')
  d.formas = [{ id: 'f', nome: 'Caixa', tipo: 'caixa', largura: 1, altura: 1, comprimento: 1 }]
  d.grupos = [{ id: 'g', nome: 'Área', grupo: null, oculto: false, bloqueado: false }]
  d.instancias = [
    {
      id: 'o',
      nome: 'Oficina',
      modelo: 'f',
      grupo: 'g',
      oculto: false,
      bloqueado: false,
      colisao: 'caixa',
      apoio: { tipo: 'absoluto' },
      transformacao: {
        posicao: { x: 10, y: 0, z: 20 },
        rotacao: { x: 0, y: 0, z: 0 },
        escala: { x: 1, y: 1, z: 1 },
      },
    },
  ]
  d.marcadores = [
    MarcadorSchema.parse({
      id: 'm',
      nome: 'Vista',
      grupo: 'g',
      oculto: false,
      bloqueado: false,
      posicao: { x: 10, y: 2, z: 20 },
      giro: Math.PI / 2,
      noChao: false,
      objeto: 'o',
      propriedades: { dialogo: 'Oficina fechada', visitas: 2, ativo: true },
      configuracao: { tipo: 'camera', alvo: { x: 5, y: 1, z: 0 }, campoDeVisao: 48 },
    }),
  ]
  return d
}
test('pasta com objeto e câmera copia referências, propriedades e alvo local sem dupla translação', () => {
  const d = cena(),
    antes = structuredClone(d),
    f = capturarFragmento(d, ['g'], 'conta'),
    ids = idsDoFragmento(f, 'copia')
  const destino = colarFragmento(criarDocumentoVazio('n', 'Destino'), f, 'copia', {
      x: f.ancora.x + 30,
      y: f.ancora.y + 4,
      z: f.ancora.z - 10,
    }),
    m = destino.marcadores[0]!
  expect(m.id).toBe(ids.marcadores.get('m')!)
  expect(m.objeto).toBe(ids.instancias.get('o')!)
  expect(m.posicao).toEqual({ x: 40, y: 6, z: 10 })
  expect(m.configuracao).toEqual(d.marcadores[0]!.configuracao)
  expect(m.propriedades).toEqual(d.marcadores[0]!.propriedades)
  expect(pontoDoMarcador(destino, m, { x: 5, y: 1, z: 0 })).toEqual({ x: 40, y: 7, z: 5 })
  expect(d).toEqual(antes)
})
test('copiar só o marcador desliga a associação externa e conserva a posição resolvida do chão', () => {
  const d = cena()
  d.base = {
    tipo: 'terreno',
    cobertura: 'grade',
    origem: { x: -32, z: -32 },
    colunas: 64,
    linhas: 64,
    passo: 1,
    min: -10,
    max: 20,
    fundo: 0,
    pecas: [],
  }
  d.marcadores[0]!.noChao = true
  const f = capturarFragmento(d, ['m'], 'conta', () => 3),
    m = f.marcadores![0]!
  expect(m.noChao).toBe(false)
  expect(m.posicao.y).toBe(5)
  expect(m.objeto).toBeNull()
  expect(f.instancias).toEqual([])
  expect(() => capturarFragmento(d, ['m'], 'conta')).toThrow('carregado')
})
test('colagem de marcador usa o mesmo lote atômico e o mesmo undo; conjunto recusa metadados de jogo', () => {
  const d = cena(),
    f = capturarFragmento(d, ['g'], 'conta'),
    vazio = criarDocumentoVazio('n', 'N')
  const novo = executarLote(
    { documento: vazio, revisao: 0 },
    {
      revisaoEsperada: 0,
      comandos: [{ tipo: 'fragmento.colar', fragmento: f, prefixo: 'p', ponto: f.ancora }],
    },
  ).documento
  expect(novo.marcadores).toHaveLength(1)
  expect(
    executarLote(
      { documento: novo, revisao: 1 },
      { revisaoEsperada: 1, comandos: inverterLote(vazio, novo) },
    ).documento,
  ).toEqual(vazio)
  expect(() => validarConteudoDeConjunto(f, 'conta')).toThrow('Marcadores')
})
