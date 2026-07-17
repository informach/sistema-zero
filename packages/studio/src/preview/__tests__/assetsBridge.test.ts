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

/**
 * Resolvedor LOCAL de fetch de asset (Canvas 3D Fase 2b): faz `GLTFLoader.load(
 * 'modelo.glb')` — que passa por THREE.FileLoader→fetch — funcionar no preview
 * servindo os bytes do asset EMBUTIDO, sem abrir a rede (a CSP `connect-src 'none'`
 * barra o fetch de verdade). Só entra quando há modelo 3D; toda URL não-asset cai
 * no fetch anterior (bloqueado). ⚠️ é STRING pura injetada no iframe — o
 * comportamento fino vale em BROWSER real; aqui rodamos o IIFE num window falso.
 */
// GLB mínimo válido p/ o clamp: prefixo `data:model/gltf-binary;base64,` + "glTF".
const GLB = 'data:model/gltf-binary;base64,Z2xURgIAAAA'

function runInWindow(runtime: string, win: Record<string, unknown>): void {
  // eslint-disable-next-line no-new-func
  new Function('window', runtime)(win)
}

describe('assetsBridge — resolvedor de fetch de asset (Canvas 3D 3D)', () => {
  it('serve o modelo 3D por NOME (exato, sem-extensão e por fileName), sem rede', async () => {
    const runtime = buildAssetsRuntime(
      {},
      {},
      {},
      {
        modelo: { kind: 'model3d', dataUrl: GLB, fileName: 'meu-modelo.glb' },
      },
    )
    expect(runtime).toContain('window.fetch =')
    const blocked = () => {
      throw new Error('rede bloqueada')
    }
    const win: Record<string, unknown> = { fetch: blocked }
    runInWindow(runtime, win)
    const fetchFn = win.fetch as (u: string) => Promise<Response>
    // por nome exato da chave do manifesto
    const r1 = await fetchFn('modelo')
    expect(r1.status).toBe(200)
    const bytes = new Uint8Array(await r1.arrayBuffer())
    expect(Array.from(bytes.slice(0, 4))).toEqual([0x67, 0x6c, 0x54, 0x46]) // "glTF"
    // com extensão (loader.load('modelo.glb')) → tira a extensão e casa a chave
    expect((await fetchFn('modelo.glb')).status).toBe(200)
    // pelo nome ORIGINAL do arquivo
    expect((await fetchFn('meu-modelo.glb')).status).toBe(200)
    // caminho resolvido (about:srcdoc/modelo.glb) → casa pelo último segmento
    expect((await fetchFn('about:srcdoc/modelo.glb')).status).toBe(200)
  })

  it('URL EXTERNA delega ao fetch anterior (rede segue bloqueada, como Promise)', async () => {
    const runtime = buildAssetsRuntime(
      {},
      {},
      {},
      { modelo: { kind: 'model3d', dataUrl: GLB, fileName: 'modelo.glb' } },
    )
    // prevFetch REJEITA (espelha o permissionGuard corrigido: fetch nunca lança).
    const blocked = () => Promise.reject(new Error('rede bloqueada'))
    const win: Record<string, unknown> = { fetch: blocked }
    runInWindow(runtime, win)
    const fetchFn = win.fetch as (u: string) => Promise<Response>
    await expect(fetchFn('https://evil.example/roubar')).rejects.toThrow('rede bloqueada')
  })

  it('asset que NÃO existe → delega ao fetch anterior (o permissionGuard dá a mensagem)', async () => {
    const runtime = buildAssetsRuntime(
      {},
      {},
      {},
      { modelo: { kind: 'model3d', dataUrl: GLB, fileName: 'modelo.glb' } },
    )
    const win: Record<string, unknown> = {
      fetch: () => Promise.reject(new Error('delegou-ao-guard')),
    }
    runInWindow(runtime, win)
    const fetchFn = win.fetch as (u: string) => Promise<Response>
    const p = fetchFn('faltando.glb')
    expect(p).toBeInstanceOf(Promise)
    await expect(p).rejects.toThrow('delegou-ao-guard')
  })

  it('NÃO instala o resolvedor de fetch quando não há asset 3D nem som (só imagem)', () => {
    const runtime = buildAssetsRuntime({ heroi: PNG })
    expect(runtime).not.toContain('window.fetch =')
  })

  it('resolvedor de <img>.src: NOME local vira dataUrl; externo/dataUrl passam direto', () => {
    const runtime = buildAssetsRuntime({ heroi: PNG })
    // com imagens, instala o shim do src (TextureLoader do three usa img.src).
    class FakeImg {
      _src = ''
      set src(v: string) {
        this._src = v
      }
      get src(): string {
        return this._src
      }
    }
    const win: Record<string, unknown> = { HTMLImageElement: FakeImg }
    runInWindow(runtime, win)
    const setAndGet = (v: string): string => {
      const img = new FakeImg()
      img.src = v
      return img.src
    }
    // nome do asset (com e sem extensão) → dataUrl embutido
    expect(setAndGet('heroi')).toBe(PNG)
    expect(setAndGet('heroi.png')).toBe(PNG)
    // externo e dataUrl passam direto (não interfere em imagem externa / jogo 2D)
    expect(setAndGet('https://x.exemplo/foto.png')).toBe('https://x.exemplo/foto.png')
    expect(setAndGet(PNG)).toBe(PNG)
    // nome que não é asset passa direto (404 como antes, sem falso-positivo)
    expect(setAndGet('naoexiste')).toBe('naoexiste')
  })
})

/**
 * Som na unha (Canvas 3D): `new THREE.AudioLoader().load('motor', …)` também passa
 * por FileLoader→fetch. O MESMO resolvedor agora consulta `__SZGAME_SOUNDS` (entre
 * o manifesto 3D e o de imagens) — o som embutido do projeto toca no preview sem
 * abrir a rede. Efeito colateral aceito: projeto SÓ com sons também instala o wrap.
 */
describe('assetsBridge — resolvedor de fetch serve SONS (som na unha)', () => {
  // "RIFF" em base64 → prova que o corpo decodificado são os bytes do WAV.
  const WAV = 'data:audio/wav;base64,UklGRg=='

  it('projeto SÓ com sons instala o resolvedor e serve por nome/extensão/caminho', async () => {
    const runtime = buildAssetsRuntime({}, {}, { motor: WAV })
    expect(runtime).toContain('window.fetch =')
    const win: Record<string, unknown> = {
      fetch: () => Promise.reject(new Error('rede bloqueada')),
    }
    runInWindow(runtime, win)
    const fetchFn = win.fetch as (u: string) => Promise<Response>
    const r = await fetchFn('motor')
    expect(r.status).toBe(200)
    expect(r.headers.get('Content-Type')).toBe('audio/wav')
    const bytes = new Uint8Array(await r.arrayBuffer())
    expect(Array.from(bytes)).toEqual([0x52, 0x49, 0x46, 0x46]) // "RIFF"
    // com extensão e por caminho absoluto (Request resolvido pelo three)
    expect((await fetchFn('motor.wav')).status).toBe(200)
    expect((await fetchFn('about:srcdoc/motor')).status).toBe(200)
  })

  it('URL que não é som delega ao fetch anterior (rede segue bloqueada)', async () => {
    const runtime = buildAssetsRuntime({}, {}, { motor: WAV })
    const win: Record<string, unknown> = {
      fetch: () => Promise.reject(new Error('rede bloqueada')),
    }
    runInWindow(runtime, win)
    const fetchFn = win.fetch as (u: string) => Promise<Response>
    await expect(fetchFn('https://evil.example/exfil')).rejects.toThrow('rede bloqueada')
    await expect(fetchFn('faltando.mp3')).rejects.toThrow('rede bloqueada')
  })

  it('3D + som juntos: cada um resolve pelo SEU manifesto (MIME correto)', async () => {
    const runtime = buildAssetsRuntime(
      {},
      {},
      { motor: WAV },
      { modelo: { kind: 'model3d', dataUrl: GLB, fileName: 'meu-modelo.glb' } },
    )
    const win: Record<string, unknown> = {
      fetch: () => Promise.reject(new Error('rede bloqueada')),
    }
    runInWindow(runtime, win)
    const fetchFn = win.fetch as (u: string) => Promise<Response>
    expect((await fetchFn('motor')).headers.get('Content-Type')).toBe('audio/wav')
    expect((await fetchFn('modelo.glb')).headers.get('Content-Type')).toBe('model/gltf-binary')
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
