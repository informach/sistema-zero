import { expect, test } from 'bun:test'
import { criarSalvamentoInicial, migrarSalvamento, SalvamentoV16Schema } from '../src/salvamento'

import { inicialV17 } from './ajuda-salvamento'

const agora = new Date('2026-10-29T12:00:00Z')
const nomes = ['mare', 'floco', 'jade', 'irie'] as const

test('V16 migra sem perder moradores, inventário ou final', () => {
  const inicial = inicialV17(agora)
  const antiga = SalvamentoV16Schema.parse({
    ...inicial,
    versao: 16,
    moradores: { capi: inicial.moradores.capi, bento: inicial.moradores.bento },
    farol: { pagina: true, concluido: true },
  })
  const copia = structuredClone(antiga)
  const atual = migrarSalvamento(antiga)
  expect(atual?.versao).toBe(21)
  expect(atual?.moradores.capi).toEqual(antiga.moradores.capi)
  expect(atual?.moradores.bento).toEqual(antiga.moradores.bento)
  expect(atual?.inventario).toEqual(antiga.inventario)
  expect(atual?.farol).toEqual({ ...antiga.farol, galeria: [] })
  for (const nome of nomes)
    expect(atual?.moradores[nome]).toEqual({
      amizade: 0,
      conversaEm: null,
      presenteEm: null,
      pedido: null,
    })
  expect(antiga).toEqual(copia)
})

test('amizade nova atravessa JSON e continua estrita', () => {
  const s = criarSalvamentoInicial(agora)
  for (const nome of nomes) {
    const salvo = {
      ...s,
      moradores: {
        ...s.moradores,
        [nome]: {
          amizade: 200,
          conversaEm: '2026-10-29',
          presenteEm: null,
          pedido: { dia: '2026-10-29', id: 'milho-1', entregue: true },
        },
      },
    }
    expect(migrarSalvamento(JSON.parse(JSON.stringify(salvo)))).toEqual(salvo)
    expect(
      migrarSalvamento({
        ...salvo,
        moradores: { ...salvo.moradores, [nome]: { ...salvo.moradores[nome], amizade: 501 } },
      }),
    ).toBeNull()
  }
  expect(SalvamentoV16Schema.safeParse(s).success).toBe(false)
  expect(migrarSalvamento({ ...s, versao: 22 })).toBeNull()
})
