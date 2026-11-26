import { describe, expect, test } from 'bun:test'
import {
  isCampaignRedirectPath,
  sanitizeOriginPlace,
  sanitizeOriginSource,
  sanitizeReferralCode,
} from '../src/referrals/index'

describe('origem da aquisição', () => {
  test('código de indicação: o mesmo formato de codes.code, em minúsculas', () => {
    expect(sanitizeReferralCode(' Mariana-X7K2 ')).toBe('mariana-x7k2')
    expect(sanitizeReferralCode('abc')).toBeNull()
    expect(sanitizeReferralCode('a'.repeat(33))).toBeNull()
    expect(sanitizeReferralCode('com espaço')).toBeNull()
    expect(sanitizeReferralCode(42)).toBeNull()
  })

  test('lugar do botão: etiqueta curta, sem caracteres livres', () => {
    expect(sanitizeOriginPlace('pais-curso-fechado')).toBe('pais-curso-fechado')
    expect(sanitizeOriginPlace('Pais-Inicio')).toBe('pais-inicio')
    expect(sanitizeOriginPlace('-pais')).toBeNull()
    expect(sanitizeOriginPlace('pais curso')).toBeNull()
    expect(sanitizeOriginPlace('a'.repeat(49))).toBeNull()
    expect(sanitizeOriginPlace(null)).toBeNull()
  })

  test('endereço antigo: caminho absoluto do funil, sem query nem barra no fim', () => {
    expect(isCampaignRedirectPath('/kids/vilao-em-aliado')).toBe(true)
    expect(isCampaignRedirectPath('/kids/vilao-em-aliado/')).toBe(false)
    expect(isCampaignRedirectPath('/kids//vilao')).toBe(false)
    expect(isCampaignRedirectPath('/kids/vilao?x=1')).toBe(false)
    expect(isCampaignRedirectPath('kids/vilao')).toBe(false)
    expect(isCampaignRedirectPath('/Kids/Vilao')).toBe(false)
    expect(isCampaignRedirectPath('https://outro.site/x')).toBe(false)
  })

  test('endereço antigo: nunca a raiz de um público nem um prefixo reservado; até 120', () => {
    expect(isCampaignRedirectPath('/kids')).toBe(false)
    for (const reservado of [
      '/i/abcd',
      '/bolsa/mariana-x7k2',
      '/cupom/x/y',
      '/embaixador/t',
      '/api/x',
    ])
      expect(isCampaignRedirectPath(reservado)).toBe(false)
    expect(isCampaignRedirectPath(`/kids/${'a'.repeat(114)}`)).toBe(true) // 120
    expect(isCampaignRedirectPath(`/kids/${'a'.repeat(115)}`)).toBe(false) // 121
  })
})

test('fonte de mídia aceita os tokens do utm_source (sublinhado, ponto, mais)', () => {
  expect(sanitizeOriginSource('Google_Ads')).toBe('google_ads')
  expect(sanitizeOriginSource('l.instagram.com')).toBe('l.instagram.com')
  expect(sanitizeOriginSource('meta+ads')).toBe('meta+ads')
  expect(sanitizeOriginSource('_x')).toBeNull()
  expect(sanitizeOriginSource('a b')).toBeNull()
  expect(sanitizeOriginSource('a'.repeat(101))).toBeNull()
})
