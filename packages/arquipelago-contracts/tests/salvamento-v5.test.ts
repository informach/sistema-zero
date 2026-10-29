import { expect, test } from 'bun:test'
import {
  BICHOS_DO_BOSQUE,
  migrarDaV4,
  migrarDaV5,
  migrarDaV6,
  migrarDaV7,
  migrarDaV8,
  migrarDaV9,
  migrarDaV10,
  migrarDaV11,
  migrarDaV12,
  migrarDaV13,
  migrarDaV14ParaAtual,
  migrarSalvamento,
  SALVAMENTO_MAX_BYTES,
  SalvamentoV1Schema,
  SalvamentoV2Schema,
  SalvamentoV3Schema,
  SalvamentoV4Schema,
  type SalvamentoV5,
  SalvamentoV5Schema,
} from '../src/salvamento'
import { inicialV14 } from './ajuda-salvamento'

const AGORA = new Date('2026-10-28T12:00:00Z')
function antiga() {
  const {
    presenteDosBichosEntregue: _,
    turnos: _t,
    lumis: _l,
    rotinas: _r,
    recife: _recife,
    vale: _vale,
    pico: _pico,
    ...base
  } = inicialV14(AGORA)
  return SalvamentoV4Schema.parse({
    ...base,
    versao: 4,
    bichos: { achados: [...BICHOS_DO_BOSQUE], adotado: null },
    inventario: { salada: 2 },
    moradores: { capi: { amizade: 300, conversaEm: '2026-10-27', presenteEm: null, pedido: null } },
    projetos: {
      geladeira: { ganhoEm: AGORA.toISOString(), aparencia: null, guardado: { milho: 2 } },
    },
  })
}

test('V4 migra sem alterar progresso e sem presumir entrega do presente', () => {
  const v4 = antiga()
  const clone = structuredClone(v4)
  const esperado = { ...v4, versao: 5, presenteDosBichosEntregue: false } satisfies SalvamentoV5
  expect(migrarDaV4(v4)).toEqual(esperado)
  expect(migrarSalvamento(v4)).toEqual(
    migrarDaV14ParaAtual(
      migrarDaV13(
        migrarDaV12(
          migrarDaV11(
            migrarDaV10(migrarDaV9(migrarDaV8(migrarDaV7(migrarDaV6(migrarDaV5(esperado)))))),
          ),
        ),
      ),
    ),
  )
  expect(v4).toEqual(clone)
  expect(SalvamentoV5Schema.parse(esperado)).toEqual(esperado)
})

test('os schemas V1 a V4 continuam aceitando apenas seu formato original', () => {
  const v4 = antiga()
  const { construcao: _, projetos: __, ...capi } = v4
  const v3 = SalvamentoV3Schema.parse({ ...capi, versao: 3 })
  const { moradores: _m, bichos: _b, ...percursos } = v3
  const v2 = SalvamentoV2Schema.parse({ ...percursos, versao: 2 })
  const { percursos: _p, ...base } = v2
  const v1 = SalvamentoV1Schema.parse({ ...base, versao: 1 })
  for (const [schema, versao] of [
    [SalvamentoV1Schema, v1],
    [SalvamentoV2Schema, v2],
    [SalvamentoV3Schema, v3],
    [SalvamentoV4Schema, v4],
  ] as const) {
    expect(schema.safeParse(versao).success).toBe(true)
    expect(schema.safeParse({ ...versao, presenteDosBichosEntregue: true }).success).toBe(false)
    expect(migrarSalvamento(versao)).toMatchObject({ versao: 16, presenteDosBichosEntregue: false })
  }
})

test('V5 exige marca booleana e preserva entrega após serializar', () => {
  const s = { ...inicialV14(AGORA), presenteDosBichosEntregue: true }
  expect(migrarSalvamento(JSON.parse(JSON.stringify(s)))).toEqual(migrarDaV14ParaAtual(s))
  for (const valor of [undefined, 'true', 1, null])
    expect(migrarSalvamento({ ...s, presenteDosBichosEntregue: valor })).toBeNull()
  // Versão futura (ainda não existe) volta nula.
  expect(migrarSalvamento({ ...s, versao: 17 })).toBeNull()
  expect(SALVAMENTO_MAX_BYTES).toBe(64 * 1024)
})
