import { expect, test } from 'bun:test'
import { montarProjetoCadeTodoMundoCompleto } from '../../../docs/aulas-interativas/qa/cade-todo-mundo-projeto'
import { readProjectPlayFile } from '../src/lib/project-play-authoring'

test('importa projeto exportado preservando programa, blocos e recursos', async () => {
  const source = montarProjetoCadeTodoMundoCompleto()
  const result = await readProjectPlayFile(JSON.stringify(source))
  expect(result.files).toEqual(source.files)
  expect(result.blocksState).toEqual(source.blocksState)
  expect(result.assets).toEqual(source.assets)
})

test('recusa JSON inválido, limite excedido, formato futuro e Pro antes de substituir', async () => {
  await expect(readProjectPlayFile('{')).rejects.toThrow('JSON')
  await expect(readProjectPlayFile(' '.repeat(1_500_001))).rejects.toThrow('1.500.000')
  await expect(readProjectPlayFile('{}')).rejects.toThrow()
  await expect(
    readProjectPlayFile(JSON.stringify({ ...montarProjetoCadeTodoMundoCompleto(), kind: 'pro' })),
  ).rejects.toThrow('Pro')
  await expect(
    readProjectPlayFile(
      JSON.stringify({ ...montarProjetoCadeTodoMundoCompleto(), formatVersion: 100 }),
    ),
  ).rejects.toThrow()
})
