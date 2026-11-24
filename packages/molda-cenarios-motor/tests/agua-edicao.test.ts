import { expect, test } from 'bun:test'
import { criarDocumentoVazio, prepararOperacaoDeAgua } from '@sistemazero/molda-cenarios-core/v2'
import { EdicaoComTerreno } from '../src/edicao-com-terreno'
import { PontosDeAutoria } from '../src/pontos-de-autoria'

const preparar = () => {
  const documento = criarDocumentoVazio('c', 'Água')
  const r = prepararOperacaoDeAgua({ id: 'mar', nome: 'Mar' }, { tipo: 'mar', nivel: -1 }, null)
  let restauracoes = 0
  const edicao = new EdicaoComTerreno({
    prever() {},
    restaurar() {
      restauracoes++
    },
  })
  return { documento, r, edicao, restauracoes: () => restauracoes }
}
test('prévia não altera a cabeça nem deixa água depois de cancelar', () => {
  const q = preparar(),
    antes = JSON.stringify(q.documento)
  q.edicao.prever(q.documento, q.documento, q.r)
  expect(q.edicao.ativa).toBe(true)
  expect(q.edicao.projetar(q.documento).aguas).toEqual([q.r.agua])
  expect(JSON.stringify(q.documento)).toBe(antes)
  q.edicao.finalizar(true)
  expect(q.edicao.projetar(q.documento)).toBe(q.documento)
  expect(q.edicao.ativa).toBe(false)
  // O mar não mexe no relevo: cancelar não reconstrói terreno, caminhos e profundidade.
  expect(q.restauracoes()).toBe(0)
  // Prévia que escavou (lago, rio, represa) devolve o relevo ao cancelar.
  q.edicao.prever(q.documento, q.documento, { ...q.r, terreno: {} as never })
  q.edicao.finalizar(true)
  expect(q.restauracoes()).toBe(1)
})
test('uma cabeça nova invalida a prévia e respostas antigas são recusadas', () => {
  const q = preparar(),
    nova = { ...q.documento, nome: 'Nova' }
  q.edicao.prever(q.documento, q.documento, q.r)
  expect(q.edicao.projetar(nova)).toBe(nova)
  expect(q.restauracoes()).toBe(0)
  expect(() => q.edicao.prever(q.documento, nova, q.r)).toThrow('O cenário mudou')
  expect(q.edicao.ativa).toBe(false)
})
test('substituir prévia restaura o relevo e aceitar não reverte o estado assumido pela fila', () => {
  const q = preparar()
  if (q.r.agua.tipo !== 'mar') throw Error('Esperava mar')
  q.edicao.prever(q.documento, q.documento, q.r)
  q.edicao.prever(q.documento, q.documento, { ...q.r, agua: { ...q.r.agua, nivel: 2 } })
  expect(q.restauracoes()).toBe(0)
  q.edicao.finalizar(false)
  expect(q.restauracoes()).toBe(0)
  expect(q.edicao.ativa).toBe(false)
  // Substituir uma prévia que escavou devolve o relevo antes da nova.
  q.edicao.prever(q.documento, q.documento, { ...q.r, terreno: {} as never })
  q.edicao.prever(q.documento, q.documento, q.r)
  expect(q.restauracoes()).toBe(1)
})
test('prévia inválida não destrói uma prévia válida nem publica dois mares', () => {
  const q = preparar()
  q.documento.aguas = [q.r.agua]
  q.edicao.prever(q.documento, q.documento, q.r)
  expect(() =>
    q.edicao.prever(q.documento, q.documento, { ...q.r, agua: { ...q.r.agua, id: 'outro' } }),
  ).toThrow()
  expect(q.edicao.projetar(q.documento).aguas).toHaveLength(1)
  expect(q.restauracoes()).toBe(0)
})
test('pontos são alças finitas limitadas, com descarte explícito e sem mutar entradas', () => {
  const p = new PontosDeAutoria(),
    pontos = [
      { x: 2, y: 1, z: 3 },
      { x: 8, y: 0, z: 6 },
    ]
  try {
    p.definir(pontos)
    expect(p.habilitada).toBe(true)
    expect(p.grupo.children).toHaveLength(2)
    expect(pontos[0]!.y).toBe(1)
    expect(() => p.definir([{ x: NaN, y: 0, z: 0 }])).toThrow()
    expect(() => p.definir(Array.from({ length: 129 }, () => pontos[0]!))).toThrow()
    p.definir(null)
    expect(p.habilitada).toBe(false)
    expect(p.grupo.visible).toBe(false)
  } finally {
    p.descartar()
  }
})
