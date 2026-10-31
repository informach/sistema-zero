import { expect, test } from 'bun:test'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { GALERIA, IDS_DA_GALERIA } from '../src/galeria'
import { INSUMOS, precoDosInsumos } from '../src/insumos'
import {
  BIT_DO_LUMI_DE_LUZ,
  LUMIS_DE_LUZ,
  lumiDeLuzDoSegredo,
  quantosLumis,
} from '../src/lumis-de-luz'
import { PRATOS_DA_FEIRA, precoNaFeira } from '../src/vendas-na-feira'
import { VESTUARIO_DAS_FESTAS } from '../src/vestuario-festas'

/**
 * A28 (revisão de 31/10/2026): nada que se paga com moedas é sorteado, e os Lumis de luz não se
 * compram nem se sorteiam: só saem dos baús dos segredos. A regra já existia espalhada; aqui ela
 * fica protegida por teste.
 */
const SRC = join(import.meta.dir, '..', 'src')

test('nenhuma regra do contrato sorteia: nada de Math.random nem bytes aleatórios', () => {
  const comSorteio = readdirSync(SRC)
    .filter((f) => f.endsWith('.ts'))
    .filter((f) =>
      /Math\.random|getRandomValues|randomUUID|randomInt/.test(readFileSync(join(SRC, f), 'utf8')),
    )
  expect(comSorteio).toEqual([])
})

test('a galeria vende sempre a mesma aparência, pelo mesmo preço fixo', () => {
  for (const id of IDS_DA_GALERIA) {
    const a = GALERIA[id]
    expect(typeof a.preco, id).toBe('number')
    expect(Number.isInteger(a.preco), id).toBe(true)
    // Cada compra é uma aparência escolhida, não um pacote surpresa.
    expect(a.id, id).toBe(id)
    expect(typeof a.objeto, id).toBe('string')
  }
})

test('insumos e a banca da feira têm preço fixo por item e quantidade', () => {
  for (const item of Object.keys(INSUMOS) as (keyof typeof INSUMOS)[])
    for (const quantidade of [1, 5, 10]) {
      const preco = precoDosInsumos({ item, quantidade })
      expect(preco).toBe(precoDosInsumos({ item, quantidade }))
      expect(preco).toBe(INSUMOS[item].preco * quantidade)
    }
  for (const prato of PRATOS_DA_FEIRA) expect(precoNaFeira(prato)).toBe(precoNaFeira(prato))
})

test('nenhum Lumi de luz aparece num catálogo com preço, e eles só saem dos segredos', () => {
  const pagos = new Set<string>([
    ...IDS_DA_GALERIA,
    ...Object.keys(INSUMOS),
    ...PRATOS_DA_FEIRA,
    ...Object.values(VESTUARIO_DAS_FESTAS).flatMap((v) => [...v.pecas, ...v.conquista]),
  ])
  for (const lumi of LUMIS_DE_LUZ) expect(pagos.has(lumi), lumi).toBe(false)
  for (const lumi of LUMIS_DE_LUZ) {
    // Contador de Lumis não conta para os de luz: só o bit do baú aberto.
    expect(quantosLumis({ lumis: { [lumi]: 9 } }, lumi)).toBe(0)
    expect(quantosLumis({ lumis: {}, segredos: BIT_DO_LUMI_DE_LUZ[lumi] }, lumi)).toBe(1)
    expect(lumiDeLuzDoSegredo(BIT_DO_LUMI_DE_LUZ[lumi])).toBe(lumi)
  }
})
