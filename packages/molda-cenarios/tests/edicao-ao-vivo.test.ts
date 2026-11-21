import { expect, test } from 'bun:test'
import { deveRecarregar } from '../src/oficina/edicao-ao-vivo'
import { criarHostEmMemoria } from '../src/oficina/host-memoria'

const guardado = { revisao: 3, salvamento: 'guardado' as const, ocupado: false }

test('recarrega só com a versão guardada mais nova, nada local pendente e fora de gesto', () => {
  expect(deveRecarregar(guardado, 4, true)).toBe(true)
  expect(deveRecarregar(guardado, 3, true)).toBe(false)
  expect(deveRecarregar(guardado, 4, false)).toBe(false)
  expect(deveRecarregar({ ...guardado, ocupado: true }, 4, true)).toBe(false)
  expect(deveRecarregar({ ...guardado, salvamento: 'guardando' }, 4, true)).toBe(false)
})

test('a consulta leve diz a revisão guardada e as pilhas, como abrir o cenário', async () => {
  const host = criarHostEmMemoria(),
    mundo = await host.criarMundo('conta', 'M'),
    c = await host.criarCenario(mundo.id, 'C')
  await host.editarCenario(c.id, 0, [{ tipo: 'cenario.renomear', nome: 'Outro' }], 'op-00000001')
  expect(await host.historicoDoCenario(c.id)).toEqual((await host.abrirCenario(c.id)).historico)
  expect((await host.historicoDoCenario(c.id)).revisao).toBe(1)
})
