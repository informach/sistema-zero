import { expect, test } from 'bun:test'
import { relatorioDasRegras } from '../../../../docs/desafios-do-jogo/regras-a-completar'
import { artefatoDeRepertorio } from '../../../../docs/desafios-do-jogo/repertorio-local'

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
  // A Nave passou a ensinar segundos e sorteio genérico (nova autoria); em 26/11/2026 a corrida
  // foi refeita com eles e nada fica sem fonte na trilha.
  expect(bosque.semFonteLocalNaTrilha).toEqual([])
  expect(bosque.blocosDerivados).toContain('sz_g2d_on_key')
  // C03a: a sua ilha só pede o que a trilha do Faísca ensina.
  for (const d of linhas.filter((d) => d.slug.startsWith('sua-ilha-')))
    expect(d.semFonteLocalNaTrilha, d.slug).toEqual([])
  // O relógio do Vale solta a cinza como imagem no grupo, como a Nave nova (26/11/2026).
  for (const d of linhas.filter((d) => d.slug.startsWith('vale-')))
    expect(d.semFonteLocalNaTrilha, d.slug).toEqual([])
})

test('inventário lê o allowBlocks da autoria atual da Nave', async () => {
  const fonte = artefatoDeRepertorio().fontes.find(
    (f) => f.pasta === 'construtor/nave-contra-asteroides',
  )!
  const doc = await Bun.file(
    new URL(
      '../../../../docs/aulas-interativas/construtor/nave-contra-asteroides/blocos.json',
      import.meta.url,
    ),
  ).json()
  expect(fonte.blocos).toEqual(doc.allowBlocks)
  expect(fonte.blocos).toContain('sz_g2d_every_seconds')
  expect(fonte.blocos).toContain('sz_val_random')
})
