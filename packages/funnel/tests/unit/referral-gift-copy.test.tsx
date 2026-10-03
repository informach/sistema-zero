import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { GIFT_FAQ, GIFT_SECTIONS } from '../../src/content/presente'
import BolsaResgate, { GiftMuralConfirmation } from '../../src/islands/BolsaResgate'
import EmbaixadorPainel from '../../src/islands/EmbaixadorPainel'

const pagePath = new URL('../../src/components/referrals/PresenteOferta.astro', import.meta.url)
const ambassadorPagePath = new URL('../../src/pages/embaixador/[token].astro', import.meta.url)
const panelPath = new URL('../../src/islands/EmbaixadorPainel.tsx', import.meta.url)

describe('promessa do curso na indicação', () => {
  test('confirmação distingue participação temporária, visita histórica e direito ausente', () => {
    const trial = renderToStaticMarkup(<GiftMuralConfirmation access="trial" />)
    expect(trial).toContain('Até o vencimento informado acima')
    expect(trial).toContain('publicar o jogo do curso')
    expect(trial).toContain('O link do jogo publicado continua funcionando')
    const visitor = renderToStaticMarkup(<GiftMuralConfirmation access="visitor" />)
    expect(visitor).toContain('não libera publicar')
    for (const access of ['none', undefined] as const) {
      expect(renderToStaticMarkup(<GiftMuralConfirmation access={access} />)).toBe('')
    }
  })

  test('landing explica resultado, plataforma, escopo e próximos passos sem a oferta antiga', async () => {
    const page = `${await Bun.file(pagePath).text()} ${JSON.stringify(GIFT_SECTIONS)} ${JSON.stringify(GIFT_FAQ)}`
    expect(page).toContain('Seu filho pode aprender a fazer um jogo de procurar personagens')
    expect(page).toContain('Cadê Todo Mundo?')
    expect(page).toContain('Sistema Zero')
    expect(page).toContain('9 a 14 anos')
    expect(page).toContain('certificado')
    expect(page).toContain('sem cartão')
    expect(page).toContain('fazem parte da assinatura da Comunidade dos Criadores')
    expect(page).toContain('sete dias')
    expect(page).toContain('cadastro aceito pelo link')
    expect(page).toContain('Mural dos Criadores')
    expect(page).toContain('ver e jogar')
    expect(page).toContain('enquanto ela existir')
    expect(page).not.toContain('Desafio do Primeiro Jogo')
    expect(page).not.toContain('a partir de 9 anos')
  })

  test('form pede dados do responsável e promete apenas o curso indicado', () => {
    const html = renderToStaticMarkup(
      <BolsaResgate
        code="vo-x7k2"
        referrerName="Vó Cida"
        communityUrl="https://kids.example.com"
      />,
    )
    expect(html).toContain('Nome do responsável')
    expect(html).toContain('Liberar o curso para minha família')
    expect(html).toContain('Cadê Todo Mundo?')
    expect(html).toContain('7 dias')
    expect(html).toContain('Mural dos Criadores')
    expect(html).toContain('publicar o jogo do curso')
    expect(html).toContain('cópias de jogos não estão incluídas')
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
    expect(page).toContain('PresenteExperiencia')
    expect(page).toContain('referrer-policy')
    for (const value of [panelSource, html]) {
      expect(value).toContain('Cadê Todo Mundo?')
      expect(value).toContain('7 dias')
      expect(value).toContain('Mural dos Criadores')
      expect(value).not.toContain('Desafio do Primeiro Jogo')
    }
    expect(panelSource).not.toContain('vitalício')
  })
})
