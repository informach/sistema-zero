import { expect, test } from 'bun:test'
import {
  abrirRotinaNaPlataforma,
  aplicarPasso,
  type CartaoDaRotina,
  comecarExecucao,
  conferirResultadoDaRotina,
  criarSalvamentoInicial,
  type MoldeDaRotina,
  MoldeDaRotinaSchema,
  proximoPasso,
  ResultadoDaFerramentaRotinaSchema,
  type Salvamento,
  terminarExecucao,
} from '@sistemazero/arquipelago-contracts'
import { respostaDasCartas } from '../src/plataforma/cartas-falsas'
import { criarPlataformaFalsa } from '../src/plataforma/falsa'
import { obraDeExemplo, PROJETOS_DE_EXEMPLO } from '../src/plataforma/obra-de-exemplo'
import { editarRotinaNaPlataforma } from '../src/sistemas/ferramenta-da-rotina'
import { mundoDaRotina, rodarRotina } from '../src/sistemas/rotina'

const agora = new Date('2026-10-29T12:00:00Z')
const cartas = respostaDasCartas('todas', 'kids')
function inicial(): Salvamento {
  const s = criarSalvamentoInicial(agora)
  return {
    ...s,
    lumis: { quindim: 1 },
    projetos: PROJETOS_DE_EXEMPLO,
    construcao: { ...s.construcao, casa: obraDeExemplo() },
    horta: s.horta.map((c, i) => ({
      ...c,
      semente: 'alface' as const,
      plantadoEm: '2026-10-29T10:00:00Z',
      regadoEm: i === 1 ? '2026-10-29T10:00:00Z' : null,
    })),
  }
}
function molde(rotina: CartaoDaRotina[] | null = null): MoldeDaRotina {
  return MoldeDaRotinaSchema.parse({
    versao: 1,
    abertura: crypto.randomUUID(),
    lumi: 'quindim',
    rotina,
    outrosCartoes: 0,
    cartas: cartas.corpo,
    mundo: mundoDaRotina(inicial()),
    agora: agora.toISOString(),
  })
}
const rotina: CartaoDaRotina[] = [
  { c: 'quando-amanhecer' },
  { c: 'voar-ate', a: 'horta' },
  { c: 'para-cada', d: [{ c: 'regar' }, { c: 'se', se: 'maduro', d: [{ c: 'colher' }] }] },
  { c: 'voar-ate', a: 'geladeira' },
  { c: 'guardar' },
]
test('prévia passo a passo é a execução do jogo, sem mudar o salvamento original', () => {
  const s = inicial(),
    antes = structuredClone(s),
    m = molde(rotina)
  const e = comecarExecucao('quindim', rotina),
    registro: string[] = [],
    passos: string[] = []
  let mundo = structuredClone(m.mundo)
  while (proximoPasso(e, mundo, agora.getTime())) {
    passos.push(e.passo.tipo)
    const r = aplicarPasso(e, mundo, agora)
    mundo = r.salvamento
    registro.push(r.texto)
    expect(e.cartaoAtual).not.toBeNull()
    if (e.passo.tipo === 'voar' && e.passo.canteiro > 0) expect(e.cartaoAtual?.c).toBe('para-cada')
  }
  const fim = terminarExecucao(e, mundo)
  if (fim.texto) registro.push(fim.texto)
  const real = rodarRotina('quindim', rotina, s, agora, new Set(m.cartas?.cartas.map((c) => c.id)))
  expect(registro).toEqual(real.registro)
  expect(passos).toEqual(real.passos)
  expect(mundoDaRotina(real.salvamento)).toEqual(mundo)
  expect(s).toEqual(antes)
})

test('chapéu da noite abre intacto, mas não pode ser guardado sem uma ação', async () => {
  const rascunho = [{ c: 'quando-anoitecer' }] as CartaoDaRotina[]
  const m = molde(rascunho)
  expect(m.rotina).toEqual(rascunho)
  expect('motivo' in conferirResultadoDaRotina(m, { ...m, rotina: rascunho })).toBe(true)
  let abriu = false
  const plataforma = criarPlataformaFalsa({
    cartas: 'todas',
    rotina: 'editor',
    editarRotina: async (x) => {
      abriu = true
      expect(x.rotina).toEqual(rascunho)
      return null
    },
  })
  await editarRotinaNaPlataforma({
    plataforma,
    lumi: 'quindim',
    rascunho,
    ler: inicial,
    ativo: () => true,
    guardar: () => {
      throw Error('não gravar cancelamento')
    },
  })
  expect(abriu).toBe(true)
})

test('permissão revogada durante a edição e teto conjunto recusam o retorno', async () => {
  const m = molde()
  let n = 0
  const r = await abrirRotinaNaPlataforma(
    { ferramenta: 'rotina-lumi', proposito: 'rotina', molde: m },
    async () => (++n === 1 ? cartas : respostaDasCartas('algumas', 'kids')),
    async (x) => ({ versao: 1, abertura: x.abertura, lumi: x.lumi, rotina }),
  )
  expect(n).toBe(2)
  expect(r.situacao).toBe('indisponivel')
  expect(
    'motivo' in
      conferirResultadoDaRotina(
        { ...m, outrosCartoes: 31 },
        {
          versao: 1,
          abertura: m.abertura,
          lumi: m.lumi,
          rotina,
        },
      ),
  ).toBe(true)
})

test('retorno não sobrescreve outra edição nem aplica após fechar; preserva mudanças do mundo', async () => {
  for (const caso of ['outra-rotina', 'fechou', 'mundo'] as const) {
    let s = inicial(),
      ativo = true,
      gravou = false
    const outra: CartaoDaRotina[] = [{ c: 'quando-anoitecer' }, { c: 'esperar', n: 1 }]
    const plataforma = criarPlataformaFalsa({
      cartas: 'todas',
      rotina: 'editor',
      editarRotina: async (m) => {
        if (caso === 'outra-rotina') s = { ...s, rotinas: { quindim: outra } }
        if (caso === 'fechou') ativo = false
        if (caso === 'mundo') s = { ...s, inventario: { ...s.inventario, milho: 7 } }
        return { versao: 1, abertura: m.abertura, lumi: m.lumi, rotina }
      },
    })
    const r = await editarRotinaNaPlataforma({
      plataforma,
      lumi: 'quindim',
      rascunho: rotina,
      ler: () => s,
      ativo: () => ativo,
      guardar: (novo) => {
        s = novo
        gravou = true
      },
    })
    expect(gravou).toBe(caso === 'mundo')
    if (caso === 'outra-rotina') {
      expect(r.motivo).toContain('mudou')
      expect(s.rotinas.quindim).toEqual(outra)
    }
    if (caso === 'mundo') {
      expect(s.inventario.milho).toBe(7)
      expect(s.rotinas.quindim).toEqual(rotina)
    }
  }
})
test('ponte relê serviço, ignora conquistas forjadas e valida versão e abertura', async () => {
  const m = molde(),
    pedido = { ferramenta: 'rotina-lumi' as const, proposito: 'rotina', molde: m }
  let leituras = 0
  const sucesso = await abrirRotinaNaPlataforma(
    pedido,
    async () => {
      leituras++
      return cartas
    },
    async (x) => ({ versao: 1, abertura: x.abertura, lumi: x.lumi, rotina }),
  )
  expect(sucesso.situacao).toBe('rotina-pronta')
  expect(leituras).toBe(2)
  const bloqueado = await abrirRotinaNaPlataforma(
    pedido,
    async () => respostaDasCartas('algumas', 'kids'),
    async (x) => ({ versao: 1, abertura: x.abertura, lumi: x.lumi, rotina }),
  )
  expect(bloqueado.situacao).toBe('indisponivel')
  expect(
    (
      await abrirRotinaNaPlataforma(
        pedido,
        async () => cartas,
        async (x) => ({ versao: 1, abertura: crypto.randomUUID(), lumi: x.lumi, rotina }),
      )
    ).situacao,
  ).toBe('indisponivel')
  expect(
    ResultadoDaFerramentaRotinaSchema.safeParse({
      versao: 2,
      abertura: m.abertura,
      lumi: m.lumi,
      rotina,
    }).success,
  ).toBe(false)
  expect(
    (
      await abrirRotinaNaPlataforma(
        { ...pedido, molde: { ...m, versao: 2 } },
        async () => cartas,
        async () => null,
      )
    ).situacao,
  ).toBe('indisponivel')
  expect(
    (
      await abrirRotinaNaPlataforma(
        pedido,
        async () => ({ status: 424, corpo: {} }),
        async () => {
          throw Error('não abrir')
        },
      )
    ).situacao,
  ).toBe('indisponivel')
})
test('a falsa tem o mesmo contrato e guardar usa o estado atual; cancelar não muda nada', async () => {
  let s = inicial(),
    gravou = 0
  const plataforma = criarPlataformaFalsa({
    cartas: 'todas',
    rotina: 'editor',
    editarRotina: async (m) => ({ versao: 1, abertura: m.abertura, lumi: m.lumi, rotina }),
  })
  const r = await editarRotinaNaPlataforma({
    plataforma,
    lumi: 'quindim',
    rascunho: [{ c: 'quando-amanhecer' }],
    ler: () => s,
    ativo: () => true,
    guardar: (novo) => {
      s = novo
      gravou++
    },
  })
  expect(r.rotina).toEqual(rotina)
  expect(gravou).toBe(1)
  expect(s.rotinas.quindim).toEqual(rotina)
  const cancelada = criarPlataformaFalsa({ cartas: 'todas', rotina: 'cancelado' })
  await editarRotinaNaPlataforma({
    plataforma: cancelada,
    lumi: 'quindim',
    rascunho: rotina,
    ler: () => s,
    ativo: () => true,
    guardar: () => {
      gravou++
    },
  })
  expect(gravou).toBe(1)
})
