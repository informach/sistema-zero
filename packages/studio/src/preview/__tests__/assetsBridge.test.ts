import { describe, expect, it } from 'bun:test'
import { PROJECT_ASSET_LIMITS } from '#core'
import { buildAssetsRuntime } from '../assetsBridge'
import { buildPreviewDoc } from '../bootstrap'

const PNG = 'data:image/png;base64,AAAA'

/**
 * Executa o IIFE do runtime num `window` falso e devolve o `__SZGAME_ASSETS`
 * semeado (mais fiel que regex: roda o mesmo JSON.parse doubly-encoded em runtime).
 */
function seededManifest(runtime: string): Record<string, string> {
  const win = {} as { __SZGAME_ASSETS?: Record<string, string> }
  // eslint-disable-next-line no-new-func
  new Function('window', runtime)(win)
  return win.__SZGAME_ASSETS ?? {}
}

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

  it('clampa a QUANTIDADE de assets ao teto do projeto (mirror sanitizeProjectAssets)', () => {
    const many: Record<string, string> = {}
    const over = PROJECT_ASSET_LIMITS.maxAssetsCount + 25
    for (let i = 0; i < over; i++) many[`a${i}`] = `data:image/png;base64,AAAA${i}`
    const manifest = seededManifest(buildAssetsRuntime(many))
    expect(Object.keys(manifest).length).toBe(PROJECT_ASSET_LIMITS.maxAssetsCount)
  })

  it('clampa o TOTAL de caracteres (manifesto exagerado não incha o srcdoc)', () => {
    // Duas imagens grandes: a 2ª estoura o orçamento total e é descartada.
    const half = Math.floor(PROJECT_ASSET_LIMITS.maxAssetsTotalChars / 2) + 100
    const big = `data:image/png;base64,${'A'.repeat(half)}`
    const manifest = seededManifest(buildAssetsRuntime({ um: big, dois: big }))
    expect(Object.keys(manifest)).toEqual(['um'])
    expect(manifest.dois).toBeUndefined()
  })

  it('mantém o filtro data:image/ junto do clamp (entrada inválida não conta no orçamento)', () => {
    const manifest = seededManifest(
      buildAssetsRuntime({ ok: PNG, mau: 'http://evil/x.png', ok2: PNG }),
    )
    expect(Object.keys(manifest).sort()).toEqual(['ok', 'ok2'])
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

/** Executa o runtime e devolve TAMBÉM o manifesto de metadados semeado. */
function seededMeta(runtime: string): Record<string, unknown> {
  const win = {} as { __SZGAME_ASSET_META?: Record<string, unknown> }
  new Function('window', runtime)(win)
  return win.__SZGAME_ASSET_META ?? {}
}

const TILEMAP_META = {
  tilemap: {
    tileSize: 16,
    cols: 2,
    rows: 1,
    grid: '0 1',
    solid: [1],
    tileset: { dataUrl: PNG, width: 32, height: 16 },
  },
}

describe('buildAssetsRuntime — __SZGAME_ASSET_META (mapa de tiles)', () => {
  it('semeia o metadado quando o asset existe no manifesto', () => {
    const runtime = buildAssetsRuntime({ 'meu-mapa': PNG }, { 'meu-mapa': TILEMAP_META })
    const meta = seededMeta(runtime) as Record<string, { tilemap?: { grid?: string } }>
    expect(meta['meu-mapa']?.tilemap?.grid).toBe('0 1')
    // e o manifesto de imagens segue intacto
    expect(seededManifest(runtime)['meu-mapa']).toBe(PNG)
  })

  it('meta cujo NOME não está nos assets é descartado (meta nunca sem imagem)', () => {
    const runtime = buildAssetsRuntime({ heroi: PNG }, { fantasma: TILEMAP_META })
    expect(runtime).not.toContain('__SZGAME_ASSET_META')
  })

  it('folha embutida que não é data:image/ é descartada (defesa em profundidade)', () => {
    const mau = {
      tilemap: {
        ...TILEMAP_META.tilemap,
        tileset: { dataUrl: 'http://evil/x', width: 8, height: 8 },
      },
    }
    const runtime = buildAssetsRuntime({ 'meu-mapa': PNG }, { 'meu-mapa': mau })
    expect(runtime).not.toContain('__SZGAME_ASSET_META')
    expect(runtime).not.toContain('evil')
  })

  it('sem meta, a saída é BYTE-IDÊNTICA à assinatura antiga (retrocompat)', () => {
    expect(buildAssetsRuntime({ heroi: PNG }, {})).toBe(buildAssetsRuntime({ heroi: PNG }))
    expect(buildAssetsRuntime({ heroi: PNG })).not.toContain('__SZGAME_ASSET_META')
  })

  it('nome literal __proto__ no meta vira chave PRÓPRIA (doubly-encoded)', () => {
    // JSON.parse cria chave PRÓPRIA "__proto__" (um literal JS setaria o protótipo).
    const assets = JSON.parse(`{"__proto__": ${JSON.stringify(PNG)}}`)
    const meta = JSON.parse(`{"__proto__": ${JSON.stringify(TILEMAP_META)}}`)
    const runtime = buildAssetsRuntime(assets, meta)
    expect(Object.hasOwn(seededMeta(runtime), '__proto__')).toBe(true)
  })
})

describe('buildAssetsRuntime — __SZGAME_SOUNDS (áudio importado)', () => {
  const MP3 = 'data:audio/mpeg;base64,CCCC'

  function seededSounds(runtime: string): Record<string, string> {
    const win = {} as { __SZGAME_SOUNDS?: Record<string, string> }
    new Function('window', runtime)(win)
    return win.__SZGAME_SOUNDS ?? {}
  }

  it('semeia window.__SZGAME_SOUNDS só com data:audio/ (imagem no meio é ignorada)', () => {
    const runtime = buildAssetsRuntime({ heroi: PNG }, {}, { explosao: MP3, mau: PNG })
    const sounds = seededSounds(runtime)
    expect(sounds).toEqual({ explosao: MP3 })
    // o manifesto de imagens segue intacto no MESMO script
    expect(seededManifest(runtime).heroi).toBe(PNG)
  })

  it('sem sons, a saída é BYTE-IDÊNTICA à assinatura antiga (retrocompat)', () => {
    expect(buildAssetsRuntime({ heroi: PNG }, {}, {})).toBe(buildAssetsRuntime({ heroi: PNG }))
    expect(buildAssetsRuntime({ heroi: PNG })).not.toContain('__SZGAME_SOUNDS')
  })

  it('projeto SÓ com sons (sem imagem) ainda semeia __SZGAME_SOUNDS', () => {
    const runtime = buildAssetsRuntime({}, {}, { moeda: MP3 })
    expect(seededSounds(runtime).moeda).toBe(MP3)
  })
})
