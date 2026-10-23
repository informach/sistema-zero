import { describe, expect, test } from 'bun:test'
import { PRIVACIDADE } from '../../src/content/legal/privacidade'
import { FUNNELS } from '../../src/funnels/registry'
import { termsVersionForFunnel } from '../../src/server/purchased-offer-snapshot'

describe('um Termo por oferta e uma Política de Privacidade', () => {
  const funis = Object.values(FUNNELS)

  test('cada funil tem o seu Termo e a sua versão, sem repetir entre ofertas', () => {
    const versoes = funis.map((f) => f.legal.termsVersion)
    const titulos = funis.map((f) => f.legal.termos.titulo)
    expect(new Set(versoes).size).toBe(funis.length)
    expect(new Set(titulos).size).toBe(funis.length)
    for (const f of funis) expect(f.legal.termos.secoes.length).toBeGreaterThan(5)
  })

  test('a versão gravada na compra vem do funil do lead', () => {
    expect(termsVersionForFunnel('kids/desafio-primeiro-jogo')).toBe('desafio-2026-10-21')
    expect(termsVersionForFunnel('kids/comunidade-dos-criadores')).toBe(
      'comunidade-kids-2026-10-20b',
    )
    // Novos fluxos sem funil usam o default ativo; compras guardam sua versão no snapshot.
    expect(termsVersionForFunnel('pro/no-comando-da-ia')).toBe('comunidade-adulto-2026-10-20')
    expect(termsVersionForFunnel(null)).toBe('comunidade-adulto-2026-10-20')
  })

  test('os Termos apontam para a Política única, que tem os capítulos dos dois públicos', () => {
    const texto = (doc: { secoes: { paragrafos: string[]; bullets?: string[] }[] }) =>
      doc.secoes.flatMap((s) => [...s.paragrafos, ...(s.bullets ?? [])]).join(' ')
    for (const f of funis) expect(texto(f.legal.termos)).toContain('/privacidade')
    const titulos = PRIVACIDADE.secoes.map((s) => s.titulo).join(' | ')
    expect(titulos).toContain('Crianças e adolescentes')
    expect(titulos).toContain('Adultos')
  })

  test('Light Copy nos textos novos: sem travessão e sem exclamação', () => {
    const docs = [PRIVACIDADE, ...funis.map((f) => f.legal.termos)].filter(
      // Os textos revistos a partir de 20/10/2026 (a Política voltou em 23/10, com a data de
      // nascimento obrigatória).
      (d) => ['20 de outubro de 2026', '23 de outubro de 2026'].includes(d.atualizadoEm),
    )
    expect(docs.length).toBeGreaterThanOrEqual(3)
    for (const doc of docs) {
      const corpo = JSON.stringify(doc).replaceAll('Informach — Núcleo', 'Informach Núcleo')
      expect(corpo).not.toMatch(/[—–!]/)
    }
  })
})
