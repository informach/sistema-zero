import { describe, expect, it } from 'bun:test'
import { buildPreviewCSP, buildPreviewCSPMetaTag, sanitizeFetchOrigins } from '../csp'

describe('buildPreviewCSP', () => {
  it('default trava rede e qualquer origem genérica de script', () => {
    const csp = buildPreviewCSP()
    expect(csp).toContain("default-src 'none'")
    expect(csp).toContain("connect-src 'none'")
    // Documento sem NENHUM script autorizado não tem o que liberar: nem `data:`.
    expect(csp).toContain("script-src 'none'")
    expect(csp.match(/script-src[^;]*/)?.[0]).not.toContain("'unsafe-inline'")
    expect(csp).not.toMatch(/script-src[^;]*\bdata:/)
    expect(csp).not.toMatch(/script-src[^;]*\bblob:/)
    expect(csp).not.toMatch(/script-src[^;]*https:/)
  })

  it('libera somente os hashes explícitos dos scripts gerados', () => {
    const hash = 'sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='
    const csp = buildPreviewCSP({ scriptHashes: [hash, hash, 'sha256-invalido'] })
    expect(csp.match(new RegExp(`'${hash}'`, 'g'))).toHaveLength(1)
    expect(csp).not.toContain('sha256-invalido')
    expect(csp.match(/script-src[^;]*/)?.[0]).not.toContain("'unsafe-inline'")
  })

  it('havendo scripts autorizados, script-src inclui `data:` (Firefox não casa hash com externo)', () => {
    const hash = 'sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='
    const scriptSrc = buildPreviewCSP({ scriptHashes: [hash] }).match(/script-src[^;]*/)?.[0] ?? ''
    expect(scriptSrc).toMatch(/\bdata:/)
    expect(scriptSrc).not.toMatch(/\bblob:/)
    expect(scriptSrc).not.toMatch(/https:/)
    expect(scriptSrc).not.toContain("'unsafe-inline'")
    expect(scriptSrc).toContain(`'${hash}'`)
  })

  it('habilita hashes de atributos somente quando há handlers autorizados', () => {
    const hash = 'sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='
    const withHandler = buildPreviewCSP({ eventHandlerHashes: [hash] })
    expect(withHandler.match(/script-src[^;]*/)?.[0]).toContain("'unsafe-hashes'")
    expect(withHandler.match(/script-src[^;]*/)?.[0]).toContain(`'${hash}'`)

    const withoutHandler = buildPreviewCSP()
    expect(withoutHandler.match(/script-src[^;]*/)?.[0]).not.toContain("'unsafe-hashes'")
    expect(buildPreviewCSP({ eventHandlerHashes: ['sha256-invalido'] })).not.toContain(
      "'unsafe-hashes'",
    )
  })

  it('libera subrecursos passivos https (img/font/media)', () => {
    const csp = buildPreviewCSP()
    expect(csp).toContain('img-src data: blob: https:')
    expect(csp).toContain('font-src data: https:')
  })

  it('perfil estrito bloqueia toda rede passiva e subframes', () => {
    const csp = buildPreviewCSP({ securityProfile: 'strict' })
    expect(csp).toContain("connect-src 'none'")
    expect(csp).toContain('img-src data: blob:')
    expect(csp).toContain('media-src data: blob:')
    expect(csp).toContain('font-src data:')
    expect(csp).toContain("frame-src 'none'")
    expect(csp).not.toMatch(/(?:style|img|media|font|frame)-src[^;]*https:/)
  })

  it('frame-src libera só https: (sem data:/blob: — anti subframe uninstrumentado)', () => {
    // Um subframe data:/blob: rodaria fora do loopGuard e não herdaria a meta-CSP,
    // reabrindo o furo de worker-src. Só `https:` é liberado.
    const csp = buildPreviewCSP()
    expect(csp).toContain('frame-src https:')
    expect(csp).not.toMatch(/frame-src[^;]*\bdata:/)
    expect(csp).not.toMatch(/frame-src[^;]*\bblob:/)
  })

  it("trava workers (worker-src 'none')", () => {
    // Worker segue desabilitado mesmo quando há módulos oficiais autorizados.
    expect(buildPreviewCSP()).toContain("worker-src 'none'")
    expect(buildPreviewCSP({ scriptAllowedUrls: ['https://esm.sh/three@0.180.0'] })).toContain(
      "worker-src 'none'",
    )
  })

  it('connect-src lista as origens liberadas', () => {
    const csp = buildPreviewCSP({ fetchAllowedOrigins: ['https://api.exemplo.com'] })
    expect(csp).toContain('connect-src https://api.exemplo.com')
    expect(csp).not.toContain("connect-src 'none'")
  })

  it('scriptAllowedUrls libera somente os caminhos oficiais, não a origem inteira', () => {
    const csp = buildPreviewCSP({
      scriptAllowedUrls: [
        'https://esm.sh/three@0.180.0',
        'https://esm.sh/three@0.180.0/examples/jsm/',
      ],
    })
    expect(csp).toContain('https://esm.sh/three@0.180.0')
    expect(csp).toContain('https://esm.sh/three@0.180.0/examples/jsm/')
    expect(csp).not.toMatch(/script-src https:\/\/esm\.sh(?:\s|;|$)/)
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
