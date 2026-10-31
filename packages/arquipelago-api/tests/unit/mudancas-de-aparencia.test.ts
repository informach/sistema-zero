import { expect, test } from 'bun:test'
import { criarSalvamentoInicial, type OrigemDaAparencia } from '@sistemazero/arquipelago-contracts'
import { marcaDaCriacao, mudancasDeAparencia } from '../../src/domain/mudancas-de-aparencia'

const data = new Date('2026-09-01T12:00:00Z')
const base = criarSalvamentoInicial(data)
function com(origem: OrigemDaAparencia, id = 'aparencia') {
  const save = structuredClone(base)
  const aparencia = { origem, id }
  save.projetos.geladeira = { ganhoEm: data.toISOString(), aparencia, aparencias: [aparencia] }
  return save
}
test('base ausente ou ilegível não inventa aplicação na primeira importação', () => {
  for (const anterior of [null, undefined, {}, { versao: 999 }]) {
    expect(mudancasDeAparencia(anterior, com('pinta'))).toEqual([])
  }
})
test('origens separadas e troca de id são aplicações, não criação', () => {
  for (const origem of ['pinta', 'molda', 'criacao', 'galeria'] as const) {
    expect(mudancasDeAparencia(base, com(origem))).toEqual([
      { objeto: 'geladeira', origem, criacao: 'aparencia' },
    ])
    expect(mudancasDeAparencia(com(origem), com(origem))).toEqual([])
    expect(mudancasDeAparencia(com(origem), com(origem, 'outra'))).toEqual([
      { objeto: 'geladeira', origem, criacao: 'outra' },
    ])
  }
  expect(mudancasDeAparencia(com('pinta'), com('molda'))).toEqual([
    { objeto: 'geladeira', origem: 'molda', criacao: 'aparencia' },
  ])
})
test('guardar na coleção, retirar, mudar ganhoEm ou outro estado não é aplicação', () => {
  const antigo = com('pinta')
  const novo = structuredClone(antigo)
  novo.projetos.geladeira!.aparencias.push({ origem: 'molda', id: 'outra' })
  novo.projetos.geladeira!.ganhoEm = '2026-10-30T12:00:00Z'
  expect(mudancasDeAparencia(antigo, novo)).toEqual([])
  novo.projetos.geladeira!.aparencia = null
  expect(mudancasDeAparencia(antigo, novo)).toEqual([])
  expect(mudancasDeAparencia(antigo, base)).toEqual([])
  expect(mudancasDeAparencia(novo, antigo)).toEqual([
    { objeto: 'geladeira', origem: 'pinta', criacao: 'aparencia' },
  ])
})
test('uma base anterior ao V18 é migrada antes de comparar', () => {
  const {
    ilhasVisitadas: _,
    chaves: _chaves,
    segredos: _segredos,
    mapa: _mapa,
    companhia: _companhia,
    florada: _florada,
    ceu: _ceu,
    ...camposV17
  } = com('molda')
  const { galeria: _galeria, ...farol } = camposV17.farol
  const { nico: _nico, ...moradores } = camposV17.moradores
  const { fosseis: _fosseis, ...vale } = camposV17.vale
  const antigo = { ...camposV17, farol, moradores, vale, versao: 17 }
  expect(mudancasDeAparencia(antigo, com('molda'))).toEqual([])
  expect(mudancasDeAparencia(antigo, com('pinta'))).toEqual([
    { objeto: 'geladeira', origem: 'pinta', criacao: 'aparencia' },
  ])
})

test('a marca da criação é estável, por jogador, e não carrega o id (A33)', () => {
  const lia = '11111111-1111-4111-8111-111111111111'
  const tom = '33333333-3333-4333-8333-333333333333'
  const marca = marcaDaCriacao(lia, 'desenho-privado')
  expect(marca).toMatch(/^[0-9a-f]{32}$/)
  expect(marcaDaCriacao(lia, 'desenho-privado')).toBe(marca)
  expect(marcaDaCriacao(tom, 'desenho-privado')).not.toBe(marca)
  expect(marcaDaCriacao(lia, 'outro')).not.toBe(marca)
  expect(marca).not.toContain('desenho')
})
