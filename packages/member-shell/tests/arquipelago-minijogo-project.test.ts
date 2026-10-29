import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { prepareProjectForHost } from '@sistemazero/studio/project-validation'

test('player prepara o gabarito real do Bosque sem perder idioma, programa ou blocos', async () => {
  const manifesto = JSON.parse(
    readFileSync(
      resolve(import.meta.dir, '../../../docs/desafios-do-jogo/bosque/bosque.manifesto.json'),
      'utf8',
    ),
  )
  const original = manifesto.desafios[0].conteudo.gabarito
  const antes = JSON.stringify(original)
  const p = await prepareProjectForHost(original)
  expect(p?.programmingLanguage).toBe('javascript')
  expect(p?.files).toEqual(original.files)
  expect(p?.ir).toEqual(original.ir)
  expect(p?.blocksState).toEqual(original.blocksState)
  expect(JSON.stringify(original)).toBe(antes)
})
