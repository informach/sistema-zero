import { expect, test } from 'bun:test'
import {
  CasaDaVisitaAdultaSchema,
  CodigoDaVisitaAdultaSchema,
  ConviteAdultoCriadoSchema,
  EstadoDoConviteAdultoSchema,
  PedidoDeVisitaAdultaSchema,
} from '../src/visitas-adultas'

test('código adulto é opaco, limitado e não aceita URL nem chaves extras', () => {
  const codigo = 'Abcd_efgh-IJKL01'.repeat(2)
  expect(CodigoDaVisitaAdultaSchema.parse(codigo)).toBe(codigo)
  for (const v of ['', codigo.slice(1), `${codigo}a`, ` ${codigo}`, `https://${codigo}`])
    expect(CodigoDaVisitaAdultaSchema.safeParse(v).success).toBe(false)
  expect(PedidoDeVisitaAdultaSchema.safeParse({ codigo, perfilId: 'outra pessoa' }).success).toBe(
    false,
  )
  expect(EstadoDoConviteAdultoSchema.safeParse({ versao: 1, ativo: true, codigo }).success).toBe(
    false,
  )
  expect(ConviteAdultoCriadoSchema.parse({ versao: 1, codigo }).codigo).toBe(codigo)
})

test('a casa compartilhada não transporta identidade, saldo, save ou outras versões', () => {
  const casa = { versao: 1 as const, obra: null, horta: [], completos: [], quarto: null }
  expect(CasaDaVisitaAdultaSchema.parse(casa)).toEqual(casa)
  for (const campo of ['perfilId', 'nome', 'salvamento', 'saldo', 'codigo'])
    expect(CasaDaVisitaAdultaSchema.safeParse({ ...casa, [campo]: 'privado' }).success).toBe(false)
  expect(CasaDaVisitaAdultaSchema.safeParse({ ...casa, versao: 2 }).success).toBe(false)
})
