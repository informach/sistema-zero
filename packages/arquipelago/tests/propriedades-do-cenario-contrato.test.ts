import { expect, test } from 'bun:test'
import {
  conferirImplantacao,
  criarDocumentoVazio,
  gravarCamposDoArquipelago,
  type InstanciaDeCenario,
  lerCamposDoArquipelago,
  type MudancasNoArquipelago,
  TIPOS_DE_FISICA_DO_ARQUIPELAGO,
  transformacaoResolvida,
  validarCamposDoArquipelago,
} from '@sistemazero/molda-cenarios-core/v2'
import { Euler, Matrix4, Quaternion, Vector3 } from 'three'
import { prepararFisicaNativa, transformacaoNativa } from '../src/sistemas/fisica-nativa-do-cenario'
import { lerPerfilDeCenario } from '../src/sistemas/perfil-de-cenario'

/**
 * Contrato entre o editor (Molda Cenários) e o leitor do jogo: os campos `arquipelago.*` que o
 * editor grava são lidos pelo jogo com os mesmos valores, e o que o editor aponta como recusado
 * o jogo recusa. Régua do editor: `molda-cenarios-core/src/v2/propriedades-arquipelago.ts`.
 */

type Propriedades = Record<string, string | number | boolean>
const destino = { tipo: 'arquipelago-v2', ilha: 'sua-ilha' }
const EM_PE = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 20, 4, 139, 1]
function cena(entidades: unknown[]) {
  return {
    formato: 'molda-cena-compilada',
    versao: 1,
    nome: 'Contrato',
    unidade: 'metro',
    eixoVertical: 'y',
    fonte: { cenario: 'ensaio', revisao: 1, digest: 'a'.repeat(64) },
    arquivos: [],
    nos: [],
    entidades,
    colisoes: [],
    aguas: [],
    caminhos: [],
    marcadores: [],
    texturas: [],
    fontes: { modelos: [], texturas: [], conjuntos: [] },
    licencas: [],
    ambiente: { hora: 12 },
  }
}
const objeto = (id: string, propriedades: Propriedades, matriz: number[] = EM_PE) => ({
  id,
  nome: id,
  tipo: 'objeto',
  grupo: null,
  propriedades,
  matriz,
  oculto: false,
})
const lerUm = (propriedades: Propriedades, matriz?: number[]) =>
  lerPerfilDeCenario(cena([objeto('e', propriedades, matriz)]), destino)
const recusaPeloPerfil = (p: Propriedades) =>
  validarCamposDoArquipelago(p).some((a) => a.regra === 'perfil')

/** Cada grupo em combinações válidas, nas bordas dos limites do jogo, e todos juntos. */
const VALIDAS: MudancasNoArquipelago[] = [
  ...TIPOS_DE_FISICA_DO_ARQUIPELAGO.map((tipo) => ({ fisica: { tipo } })),
  { fisica: { tipo: 'tronco', raioDoTronco: 0.4 } },
  { fisica: { tipo: 'tronco', raioDoTronco: 100 } },
  { fisica: { raioDoTronco: 0.001 } },
  { enterrada: 0 },
  { enterrada: 0.28 },
  { enterrada: 1 },
  { fundacao: { min: { x: -2, y: -1, z: -3 }, max: { x: 2, y: 0, z: 3 } } },
  { placa: { texto: 'Praia', destino: 'praia', via: { x: 20, z: 153 } } },
  { placa: { texto: 'x'.repeat(24), destino: 'd'.repeat(240), via: { x: -0.5, z: 0 } } },
  { ator: 'iris' },
  {
    fisica: { tipo: 'tronco', raioDoTronco: 0.3 },
    enterrada: 0.18,
    fundacao: { min: { x: -1, y: -0.5, z: -1 }, max: { x: 1, y: 0, z: 1 } },
    placa: { texto: 'Farol', destino: 'farol', via: { x: 1, z: 2 } },
    ator: 'iris',
  },
]

test('o que o editor grava, o jogo lê com os mesmos valores', () => {
  for (const mudancas of VALIDAS) {
    const p = gravarCamposDoArquipelago({ 'outra.ferramenta': 'preservar' }, mudancas)
    expect(validarCamposDoArquipelago(p)).toEqual([])
    const campos = lerCamposDoArquipelago(p)
    expect(campos).toEqual(mudancas as typeof campos)
    const perfil = lerUm(p)
    expect(perfil.atores).toEqual(
      campos.ator ? [{ entidade: 'e', tipo: 'iris', matriz: EM_PE }] : [],
    )
    expect(perfil.placas).toEqual(
      campos.placa ? [{ entidade: 'e', ...campos.placa, matriz: EM_PE }] : [],
    )
    const fisica =
      campos.fisica || campos.enterrada !== undefined || campos.fundacao
        ? [
            {
              entidade: 'e',
              matriz: EM_PE,
              ...(campos.fisica?.tipo ? { tipo: campos.fisica.tipo } : {}),
              ...(campos.fisica?.raioDoTronco !== undefined
                ? { raioDoTronco: campos.fisica.raioDoTronco }
                : {}),
              ...(campos.enterrada !== undefined ? { enterrada: campos.enterrada } : {}),
              ...(campos.fundacao ? { fundacao: campos.fundacao } : {}),
            },
          ]
        : []
    expect(perfil.fisicas).toEqual(fisica)
    // Em pé e com escala 1, a física nativa também monta.
    expect(() => prepararFisicaNativa(perfil)).not.toThrow()
  }
})

test('o que o editor aponta como recusado, o jogo recusa; e só isso', () => {
  const placa = (troca: Propriedades = {}): Propriedades => ({
    'arquipelago.sinal.texto': 'Praia',
    'arquipelago.sinal.destino': 'praia',
    'arquipelago.sinal.via.x': 1,
    'arquipelago.sinal.via.z': 2,
    ...troca,
  })
  const fundacao = (troca: Propriedades = {}): Propriedades => ({
    'arquipelago.fundacao.min.x': -1,
    'arquipelago.fundacao.min.y': -1,
    'arquipelago.fundacao.min.z': -1,
    'arquipelago.fundacao.max.x': 1,
    'arquipelago.fundacao.max.y': 0,
    'arquipelago.fundacao.max.z': 1,
    ...troca,
  })
  const recusadas: Propriedades[] = [
    { 'arquipelago.ator': 'humano' },
    { 'arquipelago.ator': 'Iris' },
    { 'arquipelago.ator': true },
    { 'arquipelago.fisica': 'teleporte' },
    { 'arquipelago.fisica': 'Caixa' },
    { 'arquipelago.fisica': 1 },
    { 'arquipelago.raioDoTronco': -1 },
    { 'arquipelago.raioDoTronco': 0 },
    { 'arquipelago.raioDoTronco': 100.5 },
    { 'arquipelago.raioDoTronco': '0.3' },
    { 'arquipelago.enterrada': 2 },
    { 'arquipelago.enterrada': -0.01 },
    { 'arquipelago.enterrada': '0.5' },
    { 'arquipelago.fundacao.min.x': 0 },
    { 'arquipelago.fundacao.sobra': 1 },
    fundacao({ 'arquipelago.fundacao.max.x': -5 }),
    fundacao({ 'arquipelago.fundacao.min.y': '0' }),
    { 'arquipelago.sinal.texto': 'Praia' },
    { 'arquipelago.sinal.via.z': 3 },
    placa({ 'arquipelago.sinal.texto': 'x'.repeat(25) }),
    placa({ 'arquipelago.sinal.texto': '   ' }),
    placa({ 'arquipelago.sinal.texto': '' }),
    placa({ 'arquipelago.sinal.destino': 'd'.repeat(241) }),
    placa({ 'arquipelago.sinal.via.x': '1' }),
    placa({ 'arquipelago.sinal.destino': false }),
  ]
  for (const p of recusadas) {
    expect(recusaPeloPerfil(p)).toBe(true)
    expect(() => lerUm(p)).toThrow()
  }
  const aceitas: Propriedades[] = [
    { 'outra.ferramenta': 'qualquer' },
    { 'arquipelago.sinal.outro': 'o jogo não lê' },
    { 'arquipelago.raioDoTronco': 100 },
    { 'arquipelago.enterrada': 0 },
    fundacao({ 'arquipelago.fundacao.sobra': 1 }),
    placa({ 'arquipelago.sinal.texto': ` ${'x'.repeat(22)} ` }),
  ]
  for (const p of aceitas) {
    expect(recusaPeloPerfil(p)).toBe(false)
    expect(() => lerUm(p)).not.toThrow()
  }
})

test('fundação achatada: o perfil lê, a física nativa recusa, e o editor diz qual das duas', () => {
  const p = gravarCamposDoArquipelago(
    {},
    { fundacao: { min: { x: -1, y: 0, z: -1 }, max: { x: 1, y: 0, z: 1 } } },
  )
  expect(validarCamposDoArquipelago(p).map((a) => [a.tipo, a.regra])).toEqual([
    ['fundacao-invalida', 'fisica-nativa'],
  ])
  const perfil = lerUm(p)
  expect(perfil.fisicas[0]?.fundacao).toEqual(lerCamposDoArquipelago(p).fundacao)
  expect(() => prepararFisicaNativa(perfil)).toThrow()
})

/** A matriz que a compilação grava para o objeto: a pose resolvida, Euler XYZ. */
function matrizDe(doc: ReturnType<typeof criarDocumentoVazio>, o: InstanciaDeCenario) {
  const t = transformacaoResolvida(doc, o)
  return new Matrix4()
    .compose(
      new Vector3(t.posicao.x, t.posicao.y, t.posicao.z),
      new Quaternion().setFromEuler(new Euler(t.rotacao.x, t.rotacao.y, t.rotacao.z, 'XYZ')),
      new Vector3(t.escala.x, t.escala.y, t.escala.z),
    )
    .toArray()
}

test('papéis nativos: a conferência do editor aponta o que a física e a Íris do jogo recusam', () => {
  const doc = criarDocumentoVazio('c', 'Contrato')
  doc.modelos = [
    {
      id: 'arvore',
      biblioteca: 'bib',
      modelo: 'arvore',
      digest: 'b'.repeat(64),
      volume: { min: { x: -2, y: 0, z: -2 }, max: { x: 2, y: 6, z: 2 } },
    },
  ]
  const objetoV2 = (
    id: string,
    mudancas: MudancasNoArquipelago,
    rotacao = { x: 0, y: 0.7, z: 0 },
    escala = { x: 1.5, y: 1.5, z: 1.5 },
  ): InstanciaDeCenario => ({
    id,
    nome: id,
    modelo: 'arvore',
    grupo: null,
    bloqueado: false,
    oculto: false,
    colisao: 'nenhuma',
    apoio: { tipo: 'absoluto' },
    propriedades: gravarCamposDoArquipelago({}, mudancas),
    transformacao: { posicao: { x: 10, y: 0, z: 10 }, rotacao, escala },
  })
  const casos: [InstanciaDeCenario, boolean][] = [
    [objetoV2('tronco-certo', { fisica: { tipo: 'tronco' } }), false],
    [objetoV2('tronco-inclinado', { fisica: { tipo: 'tronco' } }, { x: 0.2, y: 0, z: 0 }), true],
    [
      objetoV2('tronco-achatado', { fisica: { tipo: 'tronco' } }, undefined, { x: 1, y: 1, z: 2 }),
      true,
    ],
    [
      objetoV2(
        'fundacao-inclinada',
        { fundacao: { min: { x: -1, y: -1, z: -1 }, max: { x: 1, y: 0, z: 1 } } },
        { x: 0, y: 0, z: 0.1 },
      ),
      true,
    ],
  ]
  for (const [o, recusa] of casos) {
    doc.instancias = [o]
    const papel = conferirImplantacao(doc).filter((a) => a.tipo === 'transformacao-do-papel')
    expect(papel.length > 0).toBe(recusa)
    const perfil = lerUm(o.propriedades!, matrizDe(doc, o))
    if (recusa) expect(() => prepararFisicaNativa(perfil)).toThrow()
    else expect(() => prepararFisicaNativa(perfil)).not.toThrow()
  }

  // A Íris: o jogo exige matriz em pé e escala igual nos três eixos (preparar-cenario-publicado).
  const iris = objetoV2('iris', { ator: 'iris' }, undefined, { x: 1, y: 1.2, z: 1 })
  doc.instancias = [iris]
  expect(conferirImplantacao(doc).map((a) => a.tipo)).toEqual(['transformacao-do-papel'])
  const perfil = lerUm(iris.propriedades!, matrizDe(doc, iris))
  const t = transformacaoNativa(perfil.atores[0]!.matriz)
  expect(Math.abs(t.escala.x - t.escala.y) > 1e-6).toBe(true)

  // Duas Íris: o editor aponta as duas; o jogo recusa a cena.
  const outra = objetoV2('iris-2', { ator: 'iris' })
  doc.instancias = [objetoV2('iris-1', { ator: 'iris' }), outra]
  expect(conferirImplantacao(doc).map((a) => [a.id, a.tipo])).toEqual([
    ['iris-1', 'ator-repetido'],
    ['iris-2', 'ator-repetido'],
  ])
  expect(() =>
    lerPerfilDeCenario(
      cena(doc.instancias.map((o) => objeto(o.id, o.propriedades!, matrizDe(doc, o)))),
      destino,
    ),
  ).toThrow(/Íris/)
})
