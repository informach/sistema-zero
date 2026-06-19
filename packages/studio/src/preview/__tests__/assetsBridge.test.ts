import { describe, expect, it } from 'bun:test'
import { buildAssetsRuntime } from '../assetsBridge'
import { buildPreviewDoc } from '../bootstrap'

const PNG = 'data:image/png;base64,AAAA'

describe('buildAssetsRuntime', () => {
  it('semeia window.__SZGAME_ASSETS via JSON.parse (não objeto literal)', () => {
    const runtime = buildAssetsRuntime({ heroi: PNG })
    expect(runtime).toContain('__SZGAME_ASSETS')
    expect(runtime).toContain('JSON.parse(')
    // O dataUrl aparece embutido (doubly-encoded), não há objeto literal cru.
    expect(runtime).toContain('AAAA')
  })

  it('filtra valores que não são data:image/ (defesa em profundidade)', () => {
    const runtime = buildAssetsRuntime({ ok: PNG, mau: 'http://evil/x.png' })
    expect(runtime).toContain('AAAA')
    expect(runtime).not.toContain('evil')
  })
})

describe('buildPreviewDoc — injeção do manifesto de assets', () => {
  const base = { html: '<canvas></canvas>', css: '', js: 'const x = 1;' }

  it('injeta __SZGAME_ASSETS quando há assets', () => {
    const doc = buildPreviewDoc({ ...base, assets: { heroi: PNG } })
    expect(doc).toContain('__SZGAME_ASSETS')
  })

  it('omite o bridge quando não há assets (jogos legados só-fillRect)', () => {
    expect(buildPreviewDoc(base)).not.toContain('__SZGAME_ASSETS')
    expect(buildPreviewDoc({ ...base, assets: {} })).not.toContain('__SZGAME_ASSETS')
  })

  it('o bridge de assets vem ANTES dos scripts de extensão (manifesto pronto p/ o runtime)', () => {
    const doc = buildPreviewDoc({
      ...base,
      assets: { heroi: PNG },
      extensionScripts: ['window.__EXT_MARKER__ = 1;'],
    })
    expect(doc.indexOf('__SZGAME_ASSETS')).toBeLessThan(doc.indexOf('__EXT_MARKER__'))
  })
})
