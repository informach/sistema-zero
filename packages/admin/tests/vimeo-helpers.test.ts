import { describe, expect, test } from 'bun:test'
import {
  parseSafeEmbedUrl,
  parseWhitelistDomains,
  pickTranscriptTrack,
} from '../src/lib/vimeo-helpers'

describe('parseWhitelistDomains', () => {
  test('normaliza protocolo/path/espaços e descarta vazios', () => {
    expect(
      parseWhitelistDomains('https://sistemazero.com.br/app, www.x.com , ,localhost:3000'),
    ).toEqual(['sistemazero.com.br', 'www.x.com', 'localhost:3000'])
  })

  test('CSV vazio → lista vazia', () => {
    expect(parseWhitelistDomains('')).toEqual([])
    expect(parseWhitelistDomains(' , ,')).toEqual([])
  })
})

describe('pickTranscriptTrack', () => {
  const t = (language: string, type: string, active = false) => ({ language, type, active })

  test('prioriza captions PT > qualquer PT > ativo > primeiro', () => {
    const ptCaption = t('pt-BR', 'captions')
    const ptSub = t('pt', 'subtitles')
    const enActive = t('en', 'captions', true)
    const first = t('es', 'subtitles')

    expect(pickTranscriptTrack([first, enActive, ptSub, ptCaption])).toBe(ptCaption)
    expect(pickTranscriptTrack([first, enActive, ptSub])).toBe(ptSub)
    expect(pickTranscriptTrack([first, enActive])).toBe(enActive)
    expect(pickTranscriptTrack([first])).toBe(first)
    expect(pickTranscriptTrack([])).toBeNull()
  })
})

describe('parseSafeEmbedUrl', () => {
  test('aceita só https', () => {
    expect(parseSafeEmbedUrl('https://player.vimeo.com/video/123?h=abc')?.host).toBe(
      'player.vimeo.com',
    )
    expect(parseSafeEmbedUrl('http://player.vimeo.com/video/123')).toBeNull()
  })

  test('rejeita esquemas executáveis e lixo', () => {
    expect(parseSafeEmbedUrl('javascript:alert(1)')).toBeNull()
    expect(parseSafeEmbedUrl('data:text/html,<script>1</script>')).toBeNull()
    expect(parseSafeEmbedUrl('não é url')).toBeNull()
    expect(parseSafeEmbedUrl('')).toBeNull()
  })
})
