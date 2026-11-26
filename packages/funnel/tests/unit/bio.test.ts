import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { lintLightCopy } from '@sistemazero/marketing-contracts'

// A página da bio (raiz `/`, 26/11/2026, proposta "Página da bio"): uma página de links com a foto,
// o nome, o posicionamento e três botões. O principal é o presente do guia para pais; os
// secundários, o Desafio Kids e o adulto. Os links levam as UTMs da bio e a atribuição da visita.
const ROOT = join(import.meta.dir, '..', '..')
const bio = readFileSync(join(ROOT, 'src', 'pages', 'index.astro'), 'utf8')
const marcacao = bio.slice(0, bio.indexOf('<style>'))

describe('a página da bio', () => {
  test('três botões, o principal primeiro, medidos pelo id de analytics', () => {
    const ids = [...marcacao.matchAll(/data-analytics-id="([^"]+)"/g)].map((m) => m[1])
    expect(ids).toEqual(['bio-guia-pais-presente', 'bio-desafio-kids', 'bio-desafio-adulto'])
    expect(marcacao.match(/class="bio-botao[ "]/g)?.length).toBe(3)
    expect(marcacao).toContain('class="bio-botao bio-botao--principal"')
    expect(marcacao.indexOf('bio-botao--principal')).toBeLessThan(
      marcacao.indexOf('bio-desafio-kids'),
    )
    // A atribuição da visita vai inteira no lugar das UTMs da bio, sem misturar.
    expect(bio).toContain("funnelLinkWithAttribution('/', Astro.url) !== '/'")
    expect(bio).toContain(
      "funnelLinkWithAttribution(pathComUtm.split('?')[0] ?? pathComUtm, Astro.url)",
    )
  })

  test('os links: o presente pela campanha do guia e as duas ofertas do Desafio, com as UTMs', () => {
    const utm = (campanha: string, botao: string) =>
      `utm_source=instagram&utm_medium=bio&utm_campaign=${campanha}&utm_content=${botao}`
    expect(bio).toContain("utm('transformando-o-vilao-em-aliado', 'guia-pais-presente')")
    expect(bio).toContain('`/i/vilao-em-aliado?${')
    expect(bio).toContain('`/kids/desafio-primeiro-jogo/oferta?${')
    expect(bio).toContain('`/pro/desafio-primeiro-jogo/oferta?${')
    expect(bio).toContain("utm('desafio-primeiro-jogo', 'desafio-kids')")
    expect(bio).toContain("utm('desafio-primeiro-jogo-adulto', 'desafio-adulto')")
    expect(utm('a', 'b')).toBe('utm_source=instagram&utm_medium=bio&utm_campaign=a&utm_content=b')
    expect(bio).toContain(
      '`utm_source=instagram&utm_medium=bio&utm_campaign=${campanha}&utm_content=${botao}`',
    )
    expect(marcacao).not.toMatch(/data-checkout-cta|\/checkout/)
  })

  test('o texto da proposta, dentro do Light Copy, e o presente sem preço', () => {
    for (const texto of [
      'Helena e Júlio',
      '@criecomhelenaejulio',
      'Ajudamos pais a transformar parte do tempo de tela dos filhos em oportunidades de desenvolver habilidades cognitivas para a vida, por meio da criação de jogos.',
      'De presente para você',
      'Para você, mãe ou pai',
      'Guia Transformando o vilão em aliado',
      'Aulas curtas em vídeo para a tela trabalhar a favor do desenvolvimento do seu filho.',
      'Para o seu filho, de 5 a 17 anos',
      'Desafio do Primeiro Jogo',
      'Ele cria o primeiro jogo dele em casa. Abaixo de 9 anos, com você junto.',
      'Para você, com 18 anos ou mais',
      'Desafio do Primeiro Jogo para adultos',
      'Para quem sempre quis criar o próprio jogo.',
    ]) {
      expect(marcacao).toContain(texto)
      expect(lintLightCopy(texto)).toEqual([])
    }
    expect(marcacao).not.toMatch(/R\$|vitalício|sem prazo/)
  })

  test('Privacidade e Termos levam às páginas únicas; a foto e a marca existem', () => {
    expect(marcacao).toContain('<a href="/privacidade">Privacidade</a>')
    expect(marcacao).toContain('<a href="/termos">Termos de uso</a>')
    expect(
      existsSync(
        join(ROOT, 'public', 'img', 'comunidade-dos-criadores', 'helena-julio-perfil.webp'),
      ),
    ).toBe(true)
    expect(existsSync(join(ROOT, 'public', 'logo_white.svg'))).toBe(true)
  })

  test('o estilo só usa tokens: sem hexadecimal nem rgb()', () => {
    const estilo = bio.slice(bio.indexOf('<style>'))
    expect(estilo).not.toMatch(/#[0-9a-f]{3,8}\b/i)
    expect(estilo).not.toMatch(/\b(rgba?|hsla?|oklch)\(/)
    for (const [mix] of estilo.matchAll(/color-mix\([^)]*\)/g)) expect(mix).toContain('in oklab')
  })
})
