import { expect, test } from 'bun:test'
import {
  criarFonteDeAlturas,
  digestDosBytes,
  lerPecaDeAlturas,
  posicaoNoMundo,
} from '@sistemazero/molda-cenarios-core/v2'
import { converterFaiscaV1 } from '../src/molda/converter-v1'
import { assentarInstancias } from '../src/molda/importacao-v1/apoio'
import { criarTerrenoDeCenario } from '../src/molda/importacao-v1/terreno'
import { catalogoInicialDaFaisca, cenarioInicialDaFaisca } from '../src/sistemas/cenario-inicial'

const catalogo = new Map(catalogoInicialDaFaisca().map((m) => [m.id, m]))
const resolver = (id: string) => {
  const m = catalogo.get(id)
  return m && { biblioteca: 'biblioteca-de-teste', modelo: id, digest: m.digest, nome: m.nome }
}

test('conversão conserva autoria, assentamento visível, recortes e relevo real sem depender de GLBs privados', async () => {
  const original = cenarioInicialDaFaisca('a'.repeat(64))
  original.relevo = [
    {
      id: 'morro-autoral',
      tipo: 'elevar',
      centro: { x: 80, z: 140 },
      raio: 12,
      valor: 3,
      intensidade: 1,
    },
  ]
  const antes = JSON.stringify(original)
  const resultado = await converterFaiscaV1(original, catalogo, resolver)
  const b = resultado.documento.base
  if (b.tipo !== 'terreno') throw new Error('A conversão não produziu alturas')
  expect(resultado.origem.carimbos).toBe(1)
  expect(resultado.erroMaximoDeQuantizacao).toBeLessThan(0.001)
  expect(resultado.documento.instancias.length).toBe(original.instancias.length)
  expect(resultado.documento.caminhos).toEqual(original.caminhos)
  expect(resultado.documento.aguas).toEqual(
    original.aguas.map((a) => ({
      ...a,
      tipo: 'lago',
      encaixeModelo: {
        nivelLocal: 1.4,
        materiaisDaAgua: ['agua'],
        materiaisSolidos: ['cor', 'cor_2'],
      },
    })),
  )
  expect(resultado.documento.marcadores.length).toBe(original.marcos.length)
  expect(b.recortes?.length).toBe(2)
  const dados = new Map(resultado.recursos.map((r) => [r.digest, lerPecaDeAlturas(r.conteudo)]))
  for (const r of resultado.recursos) expect(await digestDosBytes(r.conteudo)).toBe(r.digest)
  const fonte = criarFonteDeAlturas(b, dados)
  const nativo = criarTerrenoDeCenario(original)
  for (let z = -200; z <= 200; z += 20)
    for (let x = -200; x <= 200; x += 20)
      expect(Math.abs(fonte(x, z) - nativo.altura(x, z))).toBeLessThanOrEqual(
        resultado.erroMaximoDeQuantizacao + 1e-8,
      )
  for (const [x, z] of [
    [1.3, 115.7],
    [78.6, 139.7],
    [-44.1, 125.8],
  ])
    expect(Math.abs(fonte(x!, z!) - nativo.exata(x!, z!))).toBeLessThan(
      resultado.erroMaximoDeQuantizacao + 0.0001,
    )
  const assentadas = new Map(
    assentarInstancias(original, catalogo, nativo.exata).map((o) => [o.id, o]),
  )
  for (const o of resultado.documento.instancias) {
    const n = assentadas.get(o.id)!
    const p = posicaoNoMundo(resultado.documento, o, fonte)
    expect(p.x).toBe(n.transformacao.posicao.x)
    expect(p.y).toBeCloseTo(n.transformacao.posicao.y, 8)
    expect(p.z).toBe(n.transformacao.posicao.z)
    expect(o.transformacao.rotacao).toEqual(n.transformacao.rotacao)
    expect(o.propriedades?.['arquipelago.importacao.apoio']).toBe(
      JSON.stringify(original.instancias.find((i) => i.id === o.id)!.apoio),
    )
  }
  const repetido = await converterFaiscaV1(original, catalogo, resolver)
  expect(repetido.documento).toEqual(resultado.documento)
  expect(repetido.recursos.map((r) => r.digest)).toEqual(resultado.recursos.map((r) => r.digest))
  expect(JSON.stringify(original)).toBe(antes)
})

test('uma geografia desconhecida e referências sem catálogo impedem conversão parcial', async () => {
  const original = cenarioInicialDaFaisca('a'.repeat(64))
  await expect(
    converterFaiscaV1(
      { ...original, base: { ...original.base, versao: 'desconhecida' } },
      catalogo,
      resolver,
    ),
  ).rejects.toThrow('geografia')
  await expect(converterFaiscaV1(original, new Map(), resolver)).rejects.toThrow('catálogo')
})
