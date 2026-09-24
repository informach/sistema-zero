import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import BolsaResgate from '../../src/islands/BolsaResgate'
import EmbaixadorPainel from '../../src/islands/EmbaixadorPainel'

const pagePath = new URL('../../src/pages/bolsa/[codigo].astro', import.meta.url)
const ambassadorPagePath = new URL('../../src/pages/embaixador/[token].astro', import.meta.url)
const panelPath = new URL('../../src/islands/EmbaixadorPainel.tsx', import.meta.url)

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

  test('página e painel do embaixador anunciam o mesmo curso do link', async () => {
    const page = await Bun.file(ambassadorPagePath).text()
    const panelSource = await Bun.file(panelPath).text()
    const html = renderToStaticMarkup(
      <EmbaixadorPainel
        token="token0123456789abcdef"
        name="Vó Cida"
        shareUrl="https://example.com/bolsa/vo-x7k2"
        stats={{ redemptionsCompleted: 0, invitesSent: 0 }}
      />,
    )
    for (const value of [page, panelSource, html]) {
      expect(value).toContain('Cadê Todo Mundo?')
      expect(value).not.toContain('Desafio do Primeiro Jogo')
    }
    expect(panelSource).not.toContain('vitalício')
  })
})
