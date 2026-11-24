import { expect, test } from 'bun:test'
import { lerPerfilDeCenario } from '../src/sistemas/perfil-de-cenario'

function cena() {
  return {
    formato: 'molda-cena-compilada',
    versao: 1,
    nome: 'Campos',
    unidade: 'metro',
    eixoVertical: 'y',
    fonte: { cenario: 'ensaio', revisao: 1, digest: 'a'.repeat(64) },
    arquivos: [],
    nos: [],
    entidades: [],
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
const destino = { tipo: 'arquipelago-v2', ilha: 'sua-ilha' }
const matriz = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 20, 4, 139, 1]
function objeto(
  id: string,
  propriedades: Record<string, string | number | boolean>,
  oculto = false,
) {
  return { id, nome: id, tipo: 'objeto', grupo: null, propriedades, matriz, oculto }
}

test('perfil recupera Íris, placas e física sem alterar propriedades desconhecidas ou coordenadas', () => {
  const entrada = {
    ...cena(),
    entidades: [
      objeto('iris', { 'arquipelago.ator': 'iris', 'outra.ferramenta': 'preservar' }),
      objeto('placa', {
        'arquipelago.sinal.texto': 'Costa',
        'arquipelago.sinal.destino': 'costa',
        'arquipelago.sinal.via.x': 20,
        'arquipelago.sinal.via.z': 153,
      }),
      objeto('ponte', { 'arquipelago.fisica': 'ponte', 'arquipelago.enterrada': 0.1 }),
    ],
  }
  const antes = JSON.stringify(entrada),
    p = lerPerfilDeCenario(entrada, destino)
  expect(p.atores).toEqual([{ entidade: 'iris', tipo: 'iris', matriz }])
  expect(p.placas[0]).toMatchObject({
    entidade: 'placa',
    texto: 'Costa',
    destino: 'costa',
    via: { x: 20, z: 153 },
    matriz,
  })
  expect(p.fisicas[0]).toMatchObject({ entidade: 'ponte', tipo: 'ponte', enterrada: 0.1 })
  expect(JSON.stringify(entrada)).toBe(antes)
})
test('entidade oculta não registra ator, placa ou parâmetro de física', () => {
  const p = lerPerfilDeCenario(
    { ...cena(), entidades: [objeto('oculto', { 'arquipelago.ator': 'iris' }, true)] },
    destino,
  )
  expect(p.atores).toHaveLength(0)
  expect(p.placas).toHaveLength(0)
  expect(p.fisicas).toHaveLength(0)
})
test('parâmetros reservados inválidos e sinalização incompleta são recusados explicitamente', () => {
  const invalidos: Record<string, string | number | boolean>[] = [
    { 'arquipelago.ator': 'humano' },
    { 'arquipelago.fisica': 'teleporte' },
    { 'arquipelago.sinal.texto': 'Costa' },
    { 'arquipelago.raioDoTronco': -1 },
    { 'arquipelago.enterrada': 2 },
    { 'arquipelago.fundacao.min.x': 0 },
  ]
  for (const propriedades of invalidos)
    expect(() =>
      lerPerfilDeCenario({ ...cena(), entidades: [objeto('invalido', propriedades)] }, destino),
    ).toThrow()
})
test('marcos e chegada conservam o referencial do arquipélago e não deslocam a ilha de novo', () => {
  const entrada = {
    ...cena(),
    entidades: [{ id: 'chegada-bosque', nome: 'Chegada', tipo: 'marcador', grupo: null }],
    marcadores: [
      {
        id: 'chegada-bosque',
        nome: 'Chegada',
        posicao: { x: 0, y: 6, z: -700 },
        giro: Math.PI / 2,
        objeto: null,
        configuracao: { tipo: 'inicio', principal: true },
      },
    ],
  }
  const p = lerPerfilDeCenario(entrada, { tipo: 'arquipelago-v2', ilha: 'bosque' })
  expect(p.inicio?.posicao).toEqual({ x: 0, y: 6, z: -700 })
  expect(p.marcos[0]?.id).toBe('chegada-bosque')
  expect(p.ilha.centro).toEqual({ x: 0, z: -700 })
  expect(() => lerPerfilDeCenario(entrada, { tipo: 'arquipelago-v2', ilha: 'farol' })).toThrow()
})
test('perfil não cria outro sistema de personagens nem admite duas Íris para o mesmo interativo', () => {
  expect(() =>
    lerPerfilDeCenario(
      {
        ...cena(),
        entidades: [
          objeto('iris-1', { 'arquipelago.ator': 'iris' }),
          objeto('iris-2', { 'arquipelago.ator': 'iris' }),
        ],
      },
      destino,
    ),
  ).toThrow(/Íris/)
})
test('fundação preserva medidas locais e exige os seis limites coerentes', () => {
  const propriedades = {
    'arquipelago.fundacao.min.x': -2,
    'arquipelago.fundacao.min.y': -1,
    'arquipelago.fundacao.min.z': -3,
    'arquipelago.fundacao.max.x': 2,
    'arquipelago.fundacao.max.y': 0,
    'arquipelago.fundacao.max.z': 3,
  }
  const p = lerPerfilDeCenario({ ...cena(), entidades: [objeto('casa', propriedades)] }, destino)
  expect(p.fisicas[0]?.fundacao).toEqual({
    min: { x: -2, y: -1, z: -3 },
    max: { x: 2, y: 0, z: 3 },
  })
  expect(() =>
    lerPerfilDeCenario(
      {
        ...cena(),
        entidades: [objeto('casa', { ...propriedades, 'arquipelago.fundacao.max.x': -5 })],
      },
      destino,
    ),
  ).toThrow()
})
