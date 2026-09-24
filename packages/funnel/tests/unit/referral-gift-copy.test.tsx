import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import BolsaResgate from '../../src/islands/BolsaResgate'

const pagePath = new URL('../../src/pages/bolsa/[codigo].astro', import.meta.url)

describe('promessa do curso na indicação', () => {
  test('landing explica resultado, plataforma, escopo e próximos passos sem a oferta antiga', async () => {
    const page = await Bun.file(pagePath).text()
    expect(page).toContain('Seu filho pode criar um jogo de procurar personagens.')
    expect(page).toContain('Cadê Todo Mundo?')
    expect(page).toContain('Sistema Zero')
    expect(page).toContain('8 a 15 anos')
    expect(page).toContain('certificado')
    expect(page).toContain('sem pedir cartão')
    expect(page).toContain('apenas este curso')
    expect(page).not.toContain('Desafio do Primeiro Jogo')
    expect(page).not.toContain('5 dias')
    expect(page).not.toContain('a partir de 9 anos')
  })

  test('form pede dados do responsável e promete apenas o curso indicado', () => {
    const html = renderToStaticMarkup(<BolsaResgate code="vo-x7k2" referrerName="Vó Cida" />)
    expect(html).toContain('Nome do responsável')
    expect(html).toContain('Liberar o curso para minha família')
    expect(html).toContain('Cadê Todo Mundo?')
    expect(html).not.toContain('vitalício')
    expect(html).not.toContain('Uma bolsa por família')
  })
})
