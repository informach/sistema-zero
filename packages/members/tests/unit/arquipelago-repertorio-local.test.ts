import { expect, test } from 'bun:test'
import { relatorioDasRegras } from '../../../../docs/desafios-do-jogo/regras-a-completar'

test('repertório local usa a derivação do Members, preserva públicos e expõe apoio alterado', async () => {
  const linhas = relatorioDasRegras()
  expect(linhas).toHaveLength(120)
  expect(
    await Bun.file(
      new URL('../../../../docs/desafios-do-jogo/regras-a-completar.json', import.meta.url),
    ).json(),
  ).toEqual(linhas)
  for (const d of linhas.filter((d) => d.publico === 'kids')) {
    const adulto = linhas.find((a) => a.slug === `${d.slug}-adulto`)!
    expect(adulto.blocosDerivados).toEqual(d.blocosDerivados)
    expect(adulto.semFonteLocalNaTrilha).toEqual(d.semFonteLocalNaTrilha)
  }
  const bosque = linhas.find((d) => d.slug === 'bosque-corrida-dos-bichos')!
  expect(bosque.semFonteLocalNaTrilha).toEqual([])
  expect(bosque.blocosDerivados).toContain('sz_g2d_on_key')
  // C03a: a sua ilha só pede o que a trilha do Faísca ensina.
  for (const d of linhas.filter((d) => d.slug.startsWith('sua-ilha-')))
    expect(d.semFonteLocalNaTrilha, d.slug).toEqual([])
  const vale = linhas.find((d) => d.slug === 'vale-contagem-da-lista')!
  expect(vale.tiposJaPresentesMasAlterados).toContain('sz_g2d_for_each_in_group')
  expect(vale.semFonteLocalNaTrilha).toContain('sz_g2d_for_each_in_group')
})
