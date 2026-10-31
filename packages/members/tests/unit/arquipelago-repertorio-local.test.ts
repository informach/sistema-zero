import { expect, test } from 'bun:test'
import { relatorioDasRegras } from '../../../../docs/desafios-do-jogo/regras-a-completar'

test('repertório local usa a derivação do Members, preserva públicos e expõe apoio alterado', async () => {
  const linhas = relatorioDasRegras()
  expect(linhas).toHaveLength(128)
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
  // Lacunas (01/11/2026, pela Jornada): o Vale também só pede o que a trilha ensina.
  for (const d of linhas.filter((d) => d.slug.startsWith('vale-')))
    expect(d.semFonteLocalNaTrilha, d.slug).toEqual([])
})
