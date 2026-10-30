import { expect, test } from 'bun:test'
import {
  DIAS_CUIDADOS_MAXIMO,
  DIAS_PARA_CHOCAR,
  ID_DA_APARENCIA_MAXIMO,
  migrarDaV14,
  migrarDaV15,
  migrarDaV16,
  migrarDaV17,
  migrarDaV18,
  migrarSalvamento,
  SalvamentoV14Schema,
  SalvamentoV15Schema,
  VERSAO_SALVAMENTO,
} from '../src/salvamento'
import { inicialV14 } from './ajuda-salvamento'

const AGORA = new Date('2026-10-29T12:00:00Z')
const GANHO = AGORA.toISOString()

test('V14 migra para V15 sem tocar no resto, com o filhote ainda por vir', () => {
  const antiga = SalvamentoV14Schema.parse({
    ...inicialV14(AGORA),
    vale: { pegadas: true, escavacao: 3, ninhos: ['ninho-1', 'ninho-2', 'ninho-3'] },
    projetos: {
      geladeira: {
        ganhoEm: GANHO,
        aparencia: { origem: 'galeria', id: 'geladeira-classica' },
        aparencias: [
          { origem: 'galeria', id: 'geladeira-classica' },
          { origem: 'pinta', id: '0b8f3c9e-2d4a-4f61-9a7e-5c3b1d2e4f60' },
        ],
      },
    },
  })
  const copia = structuredClone(antiga)
  const atual = migrarDaV14(antiga)
  expect(VERSAO_SALVAMENTO).toBe(19)
  expect(atual).toEqual({ ...antiga, versao: 15, vale: { ...antiga.vale, filhote: null } })
  expect(migrarSalvamento(antiga)).toEqual(
    migrarDaV18(migrarDaV17(migrarDaV16(migrarDaV15(atual)))),
  )
  expect(antiga).toEqual(copia)
  // A V14 continua estrita: o filhote só existe da V15 em diante.
  expect(SalvamentoV14Schema.safeParse({ ...antiga, vale: atual.vale }).success).toBe(false)
})

test('uma aparência com id além de 40 sai das guardadas e, se estava em uso, da em uso', () => {
  const longa = { origem: 'criacao' as const, id: 'x'.repeat(ID_DA_APARENCIA_MAXIMO + 1) }
  const curta = { origem: 'molda' as const, id: 'x'.repeat(ID_DA_APARENCIA_MAXIMO) }
  const antiga = SalvamentoV14Schema.parse({
    ...inicialV14(AGORA),
    projetos: {
      forno: { ganhoEm: GANHO, aparencia: longa, aparencias: [curta, longa] },
      aquario: { ganhoEm: GANHO, aparencia: curta, aparencias: [longa, curta] },
    },
  })
  const atual = migrarDaV14(antiga)
  expect(atual.projetos.forno).toEqual({ ganhoEm: GANHO, aparencia: null, aparencias: [curta] })
  expect(atual.projetos.aquario).toEqual({ ganhoEm: GANHO, aparencia: curta, aparencias: [curta] })
  expect(SalvamentoV15Schema.safeParse(atual).success).toBe(true)
  // Na V15, um id além de 40 é recusado.
  const comLonga = {
    ...atual,
    projetos: { forno: { ganhoEm: GANHO, aparencia: null, aparencias: [longa] } },
  }
  expect(SalvamentoV15Schema.safeParse(comLonga).success).toBe(false)
})

test('o filhote atravessa o JSON, e nada fora da régua', () => {
  const s = migrarDaV14(inicialV14(AGORA))
  expect(s.vale.filhote).toBeNull()
  const filhote = {
    ovo: DIAS_PARA_CHOCAR,
    aquecidoEm: '2026-10-29',
    nome: 'Tricê',
    comeuEm: '2026-10-30',
    carinhoEm: null,
    dias: 4,
  }
  const com = { ...s, vale: { ...s.vale, filhote } }
  expect(migrarSalvamento(JSON.parse(JSON.stringify(com)))).toEqual(
    migrarDaV18(migrarDaV17(migrarDaV16(migrarDaV15(com)))),
  )
  const ruins: Record<string, unknown>[] = [
    { ovo: -1 },
    { ovo: DIAS_PARA_CHOCAR + 1 },
    { ovo: 1.5 },
    { aquecidoEm: '29/10/2026' },
    { nome: '' },
    { nome: '   ' },
    { nome: 'x'.repeat(17) },
    { dias: DIAS_CUIDADOS_MAXIMO + 1 },
    { dias: -1 },
    { outro: 1 },
  ]
  for (const ruim of ruins)
    expect(
      SalvamentoV15Schema.safeParse({ ...s, vale: { ...s.vale, filhote: { ...filhote, ...ruim } } })
        .success,
    ).toBe(false)
  const { filhote: _f, ...semFilhote } = s.vale
  expect(SalvamentoV15Schema.safeParse({ ...s, vale: semFilhote }).success).toBe(false)
  expect(migrarSalvamento({ ...s, versao: 16 })).toBeNull()
})
