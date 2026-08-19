/**
 * Medição sintética (19/08/2026): o custo de preparar uma subida GRANDE do Estúdio
 * (JSON de vários MB com "assets" em base64, como um jogo com sprites): stringify,
 * gzip e volta — e, depois das PARTES, o mesmo projeto como manifesto + hashes (o que a
 * subida "só o programa mudou" realmente custa). Registra os tempos no console (`[perf]`) e
 * só asserta corretude (round-trip, compressão, hashes): tempo nunca entra em `expect`.
 */
import { describe, expect, test } from 'bun:test'
import { gunzipToText, gzipText } from '../src/lib/creations-cloud'
import { buildStudioCloudSnapshot, isStudioPartsManifest } from '../src/lib/studio-cloud'

/**
 * ~5 MB de "projeto": programa pequeno + assets em base64 de bytes ALEATÓRIOS (PNG já
 * vem comprimido, então o base64 dele é quase incompressível — como aqui).
 */
function fakeProject(assetCount: number, assetBytes: number) {
  const assets = Array.from({ length: assetCount }, (_, i) => {
    const raw = new Uint8Array(assetBytes)
    crypto.getRandomValues(raw)
    return {
      id: `asset-${i}`,
      name: `sprite-${i}`,
      kind: 'image',
      dataUrl: `data:image/png;base64,${Buffer.from(raw).toString('base64')}`,
    }
  })
  return {
    id: '01J00000000000000000000PRF',
    name: 'Jogo com sprites',
    updatedAt: 1,
    files: { 'index.html': '<h1>oi</h1>'.repeat(2000) },
    ir: { version: 1, nodes: Array.from({ length: 500 }, (_, i) => ({ id: i, type: 'x' })) },
    assets,
  }
}

describe('subida grande do Estúdio (medição)', () => {
  test('JSON de ~5 MB: gzip e volta (o fio antigo: o projeto INTEIRO a cada autosave)', async () => {
    const buildStart = performance.now()
    const json = JSON.stringify(fakeProject(20, 180_000))
    const buildMs = performance.now() - buildStart
    const gzipStart = performance.now()
    const bytes = await gzipText(json)
    const gzipMs = performance.now() - gzipStart
    const backStart = performance.now()
    const back = await gunzipToText(bytes)
    const backMs = performance.now() - backStart
    console.log('[perf] kids gzip de subida grande (projeto inteiro)', {
      jsonMB: (json.length / 1_048_576).toFixed(2),
      gzipMB: (bytes.byteLength / 1_048_576).toFixed(2),
      buildMs: buildMs.toFixed(0),
      gzipMs: gzipMs.toFixed(0),
      gunzipMs: backMs.toFixed(0),
    })
    expect(back).toBe(json)
    expect(bytes.byteLength).toBeLessThan(json.length)
  }, 60_000)

  test('o mesmo projeto em PARTES: hash dos 20 assets + manifesto de KB (o que "só o programa mudou" custa agora)', async () => {
    const project = fakeProject(20, 180_000)
    const hashStart = performance.now()
    const built = await buildStudioCloudSnapshot(project)
    const hashMs = performance.now() - hashStart
    const gzipStart = performance.now()
    const manifestBytes = await gzipText(built.json)
    const gzipMs = performance.now() - gzipStart
    // A parte de UM asset (o que sobe quando a criança troca um desenho).
    const onePartStart = performance.now()
    const onePart = await gzipText(await (built.parts?.[0]?.text() ?? ''))
    const onePartMs = performance.now() - onePartStart
    console.log('[perf] kids subida em partes', {
      assets: built.parts?.length ?? 0,
      hashMs: hashMs.toFixed(0),
      manifestKB: (built.json.length / 1024).toFixed(1),
      manifestGzipKB: (manifestBytes.byteLength / 1024).toFixed(1),
      manifestGzipMs: gzipMs.toFixed(0),
      onePartGzipKB: (onePart.byteLength / 1024).toFixed(1),
      onePartGzipMs: onePartMs.toFixed(0),
    })
    expect(isStudioPartsManifest(JSON.parse(built.json))).toBe(true)
    expect(built.parts).toHaveLength(20)
    expect(new Set(built.parts?.map((p) => p.hash)).size).toBe(20)
    // O manifesto não carrega os dataUrls: ordens de grandeza menor que o projeto.
    expect(built.json.length).toBeLessThan(200 * 1024)
  }, 60_000)
})
