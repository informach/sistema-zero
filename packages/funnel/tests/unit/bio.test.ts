import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { lintLightCopy } from '@sistemazero/marketing-contracts'

// A página da bio (raiz `/`, Canvas `PaginaBio.html` de 19/10/2026): dois caminhos, um para cada
// quiz, sem atalho para a oferta (decisão da dona), com a atribuição preservada nos links.
const ROOT = join(import.meta.dir, '..', '..')
const bio = readFileSync(join(ROOT, 'src', 'pages', 'index.astro'), 'utf8')
const marcacao = bio.slice(0, bio.indexOf('<style>'))

describe('a página da bio', () => {
  test('dois cartões, um para cada quiz, medidos pelo id de analytics', () => {
    expect(marcacao).toContain(
      `href={link(\`${'$'}{adulto.basePath}/quiz\`)} data-analytics-id="bio-quiz-adulto"`,
    )
    expect(marcacao).toContain(
      `href={link(\`${'$'}{kids.basePath}/quiz\`)} data-analytics-id="bio-quiz-infantil"`,
    )
    expect(marcacao.match(/class="[^"]*bio-cartao /g)?.length).toBe(2)
    expect(bio).toContain('funnelLinkWithAttribution(path, Astro.url)')
  })

  test('sem atalho para a oferta, o checkout ou o Desafio', () => {
    expect(marcacao).not.toMatch(/\/oferta|\/checkout|data-checkout-cta|desafio/i)
  })

  test('o texto do Canvas, dentro do Light Copy', () => {
    for (const texto of [
      'A gente ensina a fazer jogos',
      'Criar jogos não tem idade.',
      'Escolha abaixo se é para você ou para o seu filho ou filha. Em 3 minutos, a gente mostra por onde começar.',
      'É para mim',
      'Tenho 18 anos ou mais e sempre quis fazer um jogo.',
      'É para meu filho ou filha',
      'De 9 a 17 anos, ou menor de 9 criando comigo.',
    ]) {
      expect(marcacao).toContain(texto)
      expect(lintLightCopy(texto)).toEqual([])
    }
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
