import { expect, test } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { DESAFIO_PRIMEIRO_JOGO } from '../../src/funnels/desafio-primeiro-jogo'
import {
  DESAFIO_OFFERS,
  desafioSection,
  isDesafioOffer,
} from '../../src/funnels/desafio-primeiro-jogo/offer'
import { DESAFIO_FAQ, DESAFIO_SECTIONS } from '../../src/funnels/desafio-primeiro-jogo/offer-copy'
import { DESAFIO_VISUALS } from '../../src/funnels/desafio-primeiro-jogo/visuals'

test('todas as variantes têm a mesma entrega com aberturas, ordem e desenvolvimento diferentes', () => {
  const variants = Object.entries(DESAFIO_OFFERS)
  expect(new Set(variants.map(([, v]) => v.title)).size).toBe(3)
  expect(new Set(variants.map(([, v]) => v.sections[0])).size).toBe(3)
  for (const [key, page] of variants) {
    expect(isDesafioOffer(key)).toBe(true)
    expect(new Set(page.sections).size).toBe(6)
    for (const id of page.sections)
      expect(DESAFIO_SECTIONS[id].paragraphs.length).toBeGreaterThan(1)
  }
  expect(desafioSection('familia', 'tempo-de-tela').paragraphs.length).toBeGreaterThan(
    DESAFIO_SECTIONS.familia.paragraphs.length,
  )
  expect(desafioSection('construcoes', 'iniciacao-tecnologica').paragraphs.length).toBeGreaterThan(
    DESAFIO_SECTIONS.construcoes.paragraphs.length,
  )
  expect(isDesafioOffer('expressao-visual')).toBe(false)
  expect(isDesafioOffer('foguete')).toBe(false)
})
test('provas apontam para arquivos reais; telas de outro curso identificam o exemplo', () => {
  const publicDir = resolve(import.meta.dir, '../../public')
  for (const visual of Object.values(DESAFIO_VISUALS)) {
    expect(visual.frames.length).toBeGreaterThan(0)
    for (const frame of visual.frames) {
      expect(existsSync(resolve(publicDir, frame.src.slice(1)))).toBe(true)
      expect(existsSync(resolve(publicDir, frame.large.slice(1)))).toBe(true)
    }
  }
  expect(DESAFIO_VISUALS.aula!.caption).toContain('Cadê Todo Mundo')
  expect(DESAFIO_VISUALS.regra!.caption).toContain('Caderno')
  expect(
    existsSync(
      resolve(
        publicDir,
        `${DESAFIO_PRIMEIRO_JOGO.imagesBase.slice(1)}/${DESAFIO_PRIMEIRO_JOGO.checkoutImage}`,
      ),
    ),
  ).toBe(true)
})
test('conteúdo vigente não vende a nave, mapa dos pais ou duração garantida', () => {
  const text = JSON.stringify({
    DESAFIO_OFFERS,
    DESAFIO_FAQ,
    DESAFIO_SECTIONS,
    thanks: DESAFIO_PRIMEIRO_JOGO.content.obrigado,
  })
  expect(text).not.toMatch(
    /\bnave\b|aster[oó]ide|Mapa dos Pais|cinco dias|em 5 dias|Nota para implementação/i,
  )
  expect(DESAFIO_FAQ.some((q) => q.title === 'Ele precisa saber programar?')).toBe(true)
  expect(DESAFIO_FAQ.some((q) => q.title === 'Ele precisa saber desenhar?')).toBe(true)
  const source = readFileSync(
    resolve(import.meta.dir, '../../src/components/funnel/oferta/DesafioOfertaBody.astro'),
    'utf8',
  )
  expect(source).toContain('funnelLinkWithAttribution')
  expect(source).toContain("'/como-funciona/'")
  expect(source).toContain('data-checkout-cta')
})
