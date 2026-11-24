import { expect, test } from 'bun:test'
import { janelaDoCenario, prepararCenarioPublicado } from '../src/mundo/preparar-cenario-publicado'
import { CORPO } from '../src/sistemas/corpo'
import { cenarioPublicadoParaTeste } from './fixtures/cenario-publicado'

test('preparo conserva a cena isolada, usa chão real e troca detalhes sem produzir piso sob vazios', async () => {
  const fonte = await cenarioPublicadoParaTeste(),
    antes = JSON.stringify(fonte.pacote.cena),
    pronto = await prepararCenarioPublicado(
      fonte,
      { x: 10, z: -4 },
      new AbortController().signal,
      4096,
    )
  try {
    expect(pronto.cena.parent).toBeNull()
    expect(pronto.colisao.triangulos).toBe(2)
    expect(pronto.piso(10, -4)).toBeCloseTo(3)
    expect(pronto.piso(500, 500)).toBeNull()
    expect(pronto.chegada()).toEqual({ x: 10, y: 3 + CORPO.folga + CORPO.doCentroAoPe, z: -4 })
    expect(pronto.chegada({ x: 999, y: 0, z: 999 }).x).toBe(10)
    expect(pronto.chaveDoEnsaio).toContain(fonte.publicacao.id)
    expect(pronto.atualizarDetalhe({ x: 500, z: 500 }).triangulos).toBe(0)
    expect(pronto.raiz.children[0]!.visible).toBe(false)
    expect(pronto.atualizarDetalhe({ x: 10, z: -4 }).triangulos).toBe(2)
    expect(pronto.raiz.children[0]!.visible).toBe(true)
    expect(JSON.stringify(fonte.pacote.cena)).toBe(antes)
  } finally {
    pronto.descartar()
  }
  pronto.descartar()
  expect(pronto.cena.children).toHaveLength(0)
  expect(() => pronto.atualizarDetalhe({ x: 0, z: 0 })).toThrow(/descartado/)
})

test('chegada em ilha sem suporte é recusada e cancelamento não entrega cena parcial', async () => {
  const fonte = await cenarioPublicadoParaTeste()
  fonte.pacote.cena.marcadores[0]!.posicao = { x: 500, y: 0, z: 500 }
  const pronto = await prepararCenarioPublicado(
    fonte,
    { x: 0, z: 0 },
    new AbortController().signal,
    4096,
  )
  try {
    expect(() => pronto.chegada()).toThrow(/seguro/)
  } finally {
    pronto.descartar()
  }
  const c = new AbortController()
  c.abort()
  await expect(prepararCenarioPublicado(fonte, { x: 0, z: 0 }, c.signal, 4096)).rejects.toThrow()
})

test('janela de detalhe acompanha a grade local usada pelo LOD, inclusive centros fora da grade global', () => {
  const janela = janelaDoCenario({ x: 572, z: -330 }, { x: 580, z: -320 })
  expect(janela.min.x).toBe(412)
  expect(janela.max.x).toBe(812)
  expect(janela.min.z).toBe(-490)
  expect(janela.max.z).toBe(-90)
})
