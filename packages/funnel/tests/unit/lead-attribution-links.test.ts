import { describe, expect, test } from 'bun:test'
import { funnelLinkWithAttribution } from '../../src/lib/lead-attribution'

describe('origem nos links da página inicial', () => {
  test('preserva campanha da entrada, query e âncora do destino', () => {
    const link = funnelLinkWithAttribution(
      '/kids/comunidade-dos-criadores/oferta?plano=anual#planos',
      {
        pathname: '/',
        search:
          '?utm_source=instagram&utm_medium=organic_social&utm_campaign=reposicionamento&utm_content=story_04',
      },
    )
    const url = new URL(link, 'https://sistemazero.com.br')
    expect(url.pathname).toBe('/kids/comunidade-dos-criadores/oferta')
    expect(url.searchParams.get('plano')).toBe('anual')
    expect(url.searchParams.get('utm_source')).toBe('instagram')
    expect(url.searchParams.get('utm_content')).toBe('story_04')
    expect(url.hash).toBe('#planos')
  })

  test('não repassa dados livres, contato ou identificadores não aceitos', () => {
    const link = funnelLinkWithAttribution('/kids/comunidade-dos-criadores/quiz', {
      pathname: '/',
      search:
        '?utm_source=instagram&utm_content=%3Cscript%3E&email=pessoa%40example.com&nome=Pessoa&lead=123&redirect=https://example.com',
    })
    expect(link).toBe('/kids/comunidade-dos-criadores/quiz?utm_source=instagram')
  })

  test('conserva códigos de campanha e cupom aceitos pelos próximos passos', () => {
    const link = funnelLinkWithAttribution('/kids/desafio-primeiro-jogo/oferta', {
      pathname: '/',
      search: '?event=feira_2026&coupon=familia10',
    })
    expect(link).toBe('/kids/desafio-primeiro-jogo/oferta?event_code=feira_2026&cupom=FAMILIA10')
  })

  test('acesso direto não ganha campanha presumida nem query vazia', () => {
    expect(
      funnelLinkWithAttribution('/kids/comunidade-dos-criadores/oferta', {
        pathname: '/',
        search: '',
      }),
    ).toBe('/kids/comunidade-dos-criadores/oferta')
  })
})
