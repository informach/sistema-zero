import { expect, test } from 'bun:test'
import { conferirResultadoDaRotina, MoldeDaRotinaSchema } from '../src/rotina-ferramenta'
import { criarSalvamentoInicial } from '../src/salvamento'

const s = criarSalvamentoInicial(new Date('2026-10-29T12:00:00Z'))
const mundo = { horta: s.horta, inventario: s.inventario, geladeira: null, geladeiraPosta: false }
const comum = {
  abertura: 'f119e0dc-1097-4af7-b465-5a4790cef082',
  lumi: 'pluma',
  rotina: null,
  outrosCartoes: 0,
  cartas: null,
  mundo,
  agora: s.criadoEm,
}
const colheita = { clima: 'sol', necessidades: { fome: 80, energia: 80, diversao: 80 } }
const rotina = [{ c: 'quando-amanhecer' }, { c: 'voar-ate', a: 'horta' }]

test('V1 conserva o mundo original; V2 exige contexto válido sem mudar salvamento', () => {
  expect(MoldeDaRotinaSchema.parse({ ...comum, versao: 1 }).mundo).toEqual(mundo)
  expect(MoldeDaRotinaSchema.safeParse({ ...comum, versao: 2 }).success).toBe(false)
  const novo = { ...comum, versao: 2, mundo: { ...mundo, colheita } }
  expect(MoldeDaRotinaSchema.parse(novo).mundo).toEqual(novo.mundo)
  expect(MoldeDaRotinaSchema.safeParse({ ...novo, versao: 1 }).success).toBe(false)
  for (const invalido of [
    { ...colheita, clima: 'neve' },
    { ...colheita, necessidades: { fome: 101, energia: 80, diversao: 80 } },
    { ...colheita, qtd: 999 },
  ])
    expect(
      MoldeDaRotinaSchema.safeParse({ ...novo, mundo: { ...mundo, colheita: invalido } }).success,
    ).toBe(false)
})

test('resposta pertence à versão e à abertura exatas, sem aceitar downgrade do editor', () => {
  for (const versao of [1, 2] as const) {
    const molde = MoldeDaRotinaSchema.parse({
      ...comum,
      versao,
      mundo: versao === 1 ? mundo : { ...mundo, colheita },
    })
    const resultado = { versao, abertura: molde.abertura, lumi: molde.lumi, rotina }
    expect('resultado' in conferirResultadoDaRotina(molde, resultado)).toBe(true)
    expect(
      'motivo' in conferirResultadoDaRotina(molde, { ...resultado, versao: versao === 1 ? 2 : 1 }),
    ).toBe(true)
    expect(
      'motivo' in conferirResultadoDaRotina(molde, { ...resultado, abertura: crypto.randomUUID() }),
    ).toBe(true)
  }
})
