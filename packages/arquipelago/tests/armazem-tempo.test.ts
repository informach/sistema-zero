import { expect, test } from 'bun:test'
import 'fake-indexeddb/auto'
import { criarArmazemDeTempo } from '../src/sistemas/armazem-tempo'

test('guarda segundos, recupera após reabertura e separa perfis', async () => {
  const perfil = crypto.randomUUID()
  const outroPerfil = crypto.randomUUID()
  const primeira = await criarArmazemDeTempo(perfil)
  for (let i = 0; i < 3; i++) await primeira.somarSegundo()
  expect(await primeira.listar()).toHaveLength(0)
  primeira.fechar()
  const segunda = await criarArmazemDeTempo(perfil)
  const outro = await criarArmazemDeTempo(outroPerfil)
  await segunda.fecharPendentes()
  const eventos = await segunda.listar()
  expect(eventos).toHaveLength(1)
  expect(eventos[0]?.segundos).toBe(3)
  expect(await outro.listar()).toHaveLength(0)
  await segunda.remover(eventos[0]!.id)
  expect(await segunda.listar()).toHaveLength(0)
  segunda.fechar()
  outro.fechar()
})

test('uma aba não altera evento fechado por outra aba', async () => {
  const perfil = crypto.randomUUID()
  const a = await criarArmazemDeTempo(perfil)
  const b = await criarArmazemDeTempo(perfil)
  await a.somarSegundo()
  await b.fecharPendentes()
  await a.somarSegundo()
  await a.fecharPendentes()
  expect((await a.listar()).map((e) => e.segundos)).toEqual([1, 1])
  a.fechar()
  b.fechar()
})

test('não mistura o tempo de dois dias no mesmo evento', async () => {
  const perfil = crypto.randomUUID()
  let agora = new Date('2026-10-28T02:59:59Z')
  const armazem = await criarArmazemDeTempo(perfil, () => agora)
  await armazem.somarSegundo()
  agora = new Date('2026-10-28T03:00:00Z')
  await armazem.somarSegundo()
  await armazem.fecharPendentes()
  const eventos = await armazem.listar()
  expect(eventos.map((evento) => [evento.dia, evento.segundos])).toEqual([
    ['2026-10-27', 1],
    ['2026-10-28', 1],
  ])
  armazem.fechar()
})
