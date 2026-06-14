import { describe, expect, it } from 'bun:test'
import { buildPreviewCSP, buildPreviewCSPMetaTag, sanitizeFetchOrigins } from '../csp'

describe('buildPreviewCSP', () => {
  it('default trava rede e scripts remotos', () => {
    const csp = buildPreviewCSP()
    expect(csp).toContain("default-src 'none'")
    expect(csp).toContain("connect-src 'none'")
    // script-src NÃO pode liberar https: (sem <script src=remoto>)
    expect(csp).toContain("script-src 'unsafe-inline' data: blob:")
    expect(csp).not.toMatch(/script-src[^;]*https:/)
  })

  it('libera subrecursos passivos https (img/font/media)', () => {
    const csp = buildPreviewCSP()
    expect(csp).toContain('img-src data: blob: https:')
    expect(csp).toContain('font-src data: https:')
  })

  it('connect-src lista as origens liberadas', () => {
    const csp = buildPreviewCSP({ fetchAllowedOrigins: ['https://api.exemplo.com'] })
    expect(csp).toContain('connect-src https://api.exemplo.com')
    expect(csp).not.toContain("connect-src 'none'")
  })

  it('scriptAllowedOrigins libera origens em script-src (módulos de extensão)', () => {
    const csp = buildPreviewCSP({ scriptAllowedOrigins: ['https://esm.sh'] })
    expect(csp).toContain("script-src 'unsafe-inline' data: blob: https://esm.sh")
    // não afeta connect-src (rede do aluno continua bloqueada)
    expect(csp).toContain("connect-src 'none'")
  })

  it('meta tag embrulha a policy', () => {
    const tag = buildPreviewCSPMetaTag()
    expect(tag).toContain('<meta http-equiv="Content-Security-Policy"')
    expect(tag).toContain("default-src 'none'")
  })
})

describe('sanitizeFetchOrigins', () => {
  it('aceita origens https/http bem-formadas', () => {
    expect(sanitizeFetchOrigins(['https://a.com', 'http://localhost:3000'])).toEqual([
      'https://a.com',
      'http://localhost:3000',
    ])
  })

  it('rejeita entradas com path, espaço ou injeção de diretiva', () => {
    expect(
      sanitizeFetchOrigins([
        'https://ok.com/path',
        "https://x.com'; default-src *",
        'ftp://x.com',
        'not-a-url',
      ]),
    ).toEqual([])
  })

  it('remove duplicatas e undefined', () => {
    expect(sanitizeFetchOrigins(['https://a.com', 'https://a.com'])).toEqual(['https://a.com'])
    expect(sanitizeFetchOrigins(undefined)).toEqual([])
  })
})
