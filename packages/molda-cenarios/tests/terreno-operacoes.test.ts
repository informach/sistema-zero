import { expect, test } from 'bun:test'
import {
  abrirEdicaoDeTerreno,
  type BaseDeTerreno,
  BaseDeTerrenoSchema,
  baseComPecasEditadas,
  pintarChao,
  prepararPecasEditadas,
} from '@sistemazero/molda-cenarios-core/v2'
import {
  baseInicialDeTerreno,
  prepararCamadas,
  prepararDimensoes,
  prepararImagemDeAlturas,
} from '../src/oficina/operacoes-de-terreno'

const base = (): BaseDeTerreno => ({
  tipo: 'terreno',
  origem: { x: -32, z: -32 },
  colunas: 64,
  linhas: 64,
  passo: 1,
  min: -20,
  max: 50,
  fundo: 0,
  pecas: [],
  solo: {
    camadas: [
      { id: 'grama', nome: 'Grama', cor: '#00aa00' },
      { id: 'terra', nome: 'Terra', cor: '#997733' },
    ],
    pecas: [],
  },
})
test('retirar o chão pintado redistribui pesos; trocar todas as oito camadas continua válido', () => {
  const b = base(),
    e = abrirEdicaoDeTerreno(b, new Map())
  pintarChao(e.campo, e.pintura, { x: 0, z: 0, raio: 6, dureza: 1, forca: 1 }, 1)
  const r = prepararCamadas(b, e, [b.solo!.camadas[0]!])
  expect(r.estado.pintura.pesos.every((p) => p === 255)).toBe(true)
  expect(e.pintura.camadas).toBe(2)
  const oito = Array.from({ length: 8 }, (_, i) => ({
    id: `a${i}`,
    nome: `Solo ${i}`,
    cor: '#223344',
  }))
  const a = prepararCamadas(b, e, oito)
  expect(a.estado.pintura.camadas).toBe(8)
  const troca = prepararCamadas(
    a.base,
    a.estado,
    oito.map((c) => ({ ...c, id: `novo-${c.id}` })),
  )
  expect(troca.estado.pintura.camadas).toBe(8)
  const somas = new Set<number>()
  for (let i = 0; i < troca.estado.pintura.pesos.length; i += 8)
    somas.add(troca.estado.pintura.pesos.slice(i, i + 8).reduce((a, b) => a + b, 0))
  expect(somas).toEqual(new Set([255]))
})
test('reamostrar limpa referências antigas e conserva relevo e máscaras em coordenadas do mundo', () => {
  const b = base(),
    e = abrirEdicaoDeTerreno(b, new Map())
  e.campo.alturas.fill(12)
  e.buracos.celulas[0] = 1
  b.pecas.push({ coluna: 0, linha: 0, digest: 'a'.repeat(64) })
  const r = prepararDimensoes(b, e, { ...b, colunas: 128, linhas: 128, passo: 0.5 })
  expect(r.base.pecas).toEqual([])
  expect(r.estado.campo.alturas[0]).toBe(12)
  expect(r.estado.buracos.celulas[0]).toBe(1)
  expect(r.estado.buracos.celulas[1]).toBe(1)
  const larga = { ...b, colunas: 128, pecas: [{ coluna: 1, linha: 0, digest: 'a'.repeat(64) }] }
  const campoLargo = abrirEdicaoDeTerreno({ ...larga, pecas: [] }, new Map())
  expect(prepararDimensoes(larga, campoLargo, { ...larga, colunas: 64 }).base.pecas).toEqual([])
})

test('redimensionar o terreno importado sem camadas não tenta gravar pintura inexistente', () => {
  const { solo: _, ...b } = base(),
    e = abrirEdicaoDeTerreno(b, new Map())
  const r = prepararDimensoes(b, e, { ...b, passo: 2 })
  expect(r.regioes.pintura).toBeUndefined()
  const pecas = prepararPecasEditadas(r.base, r.estado, r.regioes)
  expect(pecas.every((p) => p.papel !== 'pintura' && p.conteudo === null)).toBe(true)
  expect(
    baseComPecasEditadas(
      r.base,
      pecas.map((p) => ({ ...p, digest: null })),
    ).solo,
  ).toBeUndefined()
})
test('PNG mapeia preto e branco sem apagar pintura e buracos', () => {
  const b = base(),
    e = abrirEdicaoDeTerreno(b, new Map())
  e.buracos.celulas[0] = 1
  const r = prepararImagemDeAlturas(
    b,
    e,
    { largura: 2, altura: 2, valores: new Float32Array([0, 1, 0, 1]) },
    -10,
    40,
  )
  expect(r.estado.campo.alturas[0]).toBe(-10)
  expect(r.estado.campo.alturas[64]).toBe(40)
  expect(r.estado.buracos.celulas[0]).toBe(1)
  expect(() =>
    prepararImagemDeAlturas(
      b,
      e,
      { largura: 2, altura: 2, valores: new Float32Array(4) },
      -100,
      40,
    ),
  ).toThrow()
})
test('iniciar a partir do plano respeita os limites de células e não converte um perfil silenciosamente', () => {
  const minimo = baseInicialDeTerreno({ tipo: 'plano', largura: 8, comprimento: 8 })
  expect(minimo.origem.x + (minimo.colunas * minimo.passo) / 2).toBe(0)
  expect(minimo.origem.z + (minimo.linhas * minimo.passo) / 2).toBe(0)
  for (const largura of [8, 256, 8192])
    expect(
      BaseDeTerrenoSchema.safeParse(
        baseInicialDeTerreno({ tipo: 'plano', largura, comprimento: largura }),
      ).success,
    ).toBe(true)
  expect(() =>
    baseInicialDeTerreno({ tipo: 'perfil', perfil: 'arquipelago', versao: '1', carimbos: [] }),
  ).toThrow('Converta')
})
