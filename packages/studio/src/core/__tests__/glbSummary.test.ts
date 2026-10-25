import { beforeEach, describe, expect, it } from 'bun:test'
import { makeAnimatedGlb } from '../../official-extensions/__tests__/three3d/assetFixtures'
import articulated from '../../official-extensions/__tests__/three3d/molda-articulated.json'
import flipbook from '../../official-extensions/__tests__/three3d/molda-flipbook.json'
import skinned from '../../official-extensions/__tests__/three3d/molda-skinned.json'
import { clearGlbSummaryCache, glbSummaryCacheSize, readGlbSummary } from '../glbSummary'
import { PROJECT_ASSET_LIMITS } from '../projectAssets'

/** GLB 2.0 só com o chunk JSON, para montar casos de borda à mão. */
function glbFromJson(gltf: unknown, options: { version?: number; chunkType?: number } = {}) {
  const json = new TextEncoder().encode(JSON.stringify(gltf))
  const pad = (4 - (json.length % 4)) % 4
  const jsonLength = json.length + pad
  const total = 20 + jsonLength
  const bytes = new Uint8Array(total)
  const view = new DataView(bytes.buffer)
  view.setUint32(0, 0x46546c67, true)
  view.setUint32(4, options.version ?? 2, true)
  view.setUint32(8, total, true)
  view.setUint32(12, jsonLength, true)
  view.setUint32(16, options.chunkType ?? 0x4e4f534a, true)
  bytes.set(json, 20)
  for (let i = 0; i < pad; i++) bytes[20 + json.length + i] = 0x20
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return `data:model/gltf-binary;base64,${btoa(binary)}`
}

beforeEach(() => {
  clearGlbSummaryCache()
})

describe('readGlbSummary — modelos reais do Molda', () => {
  it('personagem com ossos: clipes e ossos', () => {
    expect(readGlbSummary(skinned.dataUrl)).toEqual({
      clips: ['Acenar', 'Esticar'],
      skinned: true,
      animatedPaint: false,
    })
  })

  it('peças articuladas sem ossos', () => {
    expect(readGlbSummary(articulated.dataUrl)).toEqual({
      clips: ['Saltar', 'Posar'],
      skinned: false,
      animatedPaint: false,
    })
  })

  it('pintura que se mexe (flipbook contrato 1), sem clipes', () => {
    expect(readGlbSummary(flipbook.dataUrl)).toEqual({
      clips: [],
      skinned: false,
      animatedPaint: true,
    })
  })

  it('GLB com binário depois do JSON: lê só o JSON', () => {
    const summary = readGlbSummary(makeAnimatedGlb('heroi', ['Andar', 'Pular']))
    expect(summary?.clips).toEqual(['Andar', 'Pular'])
  })
})

describe('readGlbSummary — regras do GLTFLoader e tetos', () => {
  it('clipe sem nome vira animation_<i>; nome longo fica INTEIRO; repetido aparece uma vez', () => {
    const long = 'x'.repeat(80)
    const summary = readGlbSummary(
      glbFromJson({
        asset: { version: '2.0' },
        animations: [{}, { name: '' }, { name: long }, { name: 'Andar' }, { name: 'Andar' }],
      }),
    )
    expect(summary?.clips).toEqual([
      'animation_0',
      'animation_1',
      // O valor vai ao bloco e o runtime procura por ele: só o rótulo do seletor encurta.
      long,
      'Andar',
    ])
  })

  it('mais de 64 clipes → null', () => {
    const animations = Array.from({ length: 65 }, (_, i) => ({ name: `c${i}` }))
    expect(readGlbSummary(glbFromJson({ asset: { version: '2.0' }, animations }))).toBeNull()
    const ok = Array.from({ length: 64 }, (_, i) => ({ name: `c${i}` }))
    expect(
      readGlbSummary(glbFromJson({ asset: { version: '2.0' }, animations: ok }))?.clips,
    ).toHaveLength(64)
  })

  it('JSON declarado acima de 4 MB → null sem decodificar', () => {
    const bytes = new Uint8Array(20)
    const view = new DataView(bytes.buffer)
    view.setUint32(0, 0x46546c67, true)
    view.setUint32(4, 2, true)
    view.setUint32(8, 20, true)
    view.setUint32(12, 4 * 1024 * 1024 + 4, true)
    view.setUint32(16, 0x4e4f534a, true)
    let binary = ''
    for (const byte of bytes) binary += String.fromCharCode(byte)
    expect(readGlbSummary(`data:model/gltf-binary;base64,${btoa(binary)}`)).toBeNull()
  })

  it('casos inválidos → null', () => {
    expect(readGlbSummary('')).toBeNull()
    expect(readGlbSummary('sem-virgula')).toBeNull()
    expect(readGlbSummary('data:model/gltf-binary;base64,@@@@')).toBeNull()
    // HDR não é GLB.
    expect(
      readGlbSummary(`data:image/vnd.radiance;base64,${btoa('#?RADIANCE\nFORMAT=x\n')}`),
    ).toBeNull()
    // GLB versão 1.
    expect(readGlbSummary(glbFromJson({ asset: { version: '1.0' } }, { version: 1 }))).toBeNull()
    // Chunk 0 que não é JSON.
    expect(readGlbSummary(glbFromJson({ asset: {} }, { chunkType: 0x004e4942 }))).toBeNull()
    // JSON cortado (o arquivo acaba antes do tamanho declarado).
    const whole = glbFromJson({ asset: { version: '2.0' }, animations: [{ name: 'Andar' }] })
    expect(readGlbSummary(whole.slice(0, 60))).toBeNull()
    // `animations` que não é lista.
    expect(readGlbSummary(glbFromJson({ asset: {}, animations: { name: 'x' } }))).toBeNull()
  })

  it('pintura animada só com contrato 1; skins vazias não contam', () => {
    const summary = readGlbSummary(
      glbFromJson({
        asset: { version: '2.0' },
        skins: [],
        materials: [{ extras: { molda: { flipbook: { contract: 2 } } } }, { extras: null }],
      }),
    )
    expect(summary).toEqual({ clips: [], skinned: false, animatedPaint: false })
  })
})

describe('readGlbSummary — cache LRU', () => {
  it('a mesma leitura devolve o mesmo objeto (congelado)', () => {
    const first = readGlbSummary(skinned.dataUrl, 'a1')
    const second = readGlbSummary(skinned.dataUrl, 'a1')
    expect(second).toBe(first)
    expect(Object.isFrozen(first)).toBe(true)
    expect(Object.isFrozen(first?.clips)).toBe(true)
  })

  it('cabe o teto de modelos do projeto (e não mais)', () => {
    const limit = PROJECT_ASSET_LIMITS.maxAssetsCount
    for (let i = 0; i < limit + 8; i++) readGlbSummary(skinned.dataUrl, `id-${i}`)
    expect(glbSummaryCacheSize()).toBe(limit)
  })

  it('a aba com 40 modelos lê todos de novo do cache (o LRU não se esvazia a cada volta)', () => {
    const first = Array.from({ length: 40 }, (_, i) => readGlbSummary(skinned.dataUrl, `m-${i}`))
    const again = Array.from({ length: 40 }, (_, i) => readGlbSummary(skinned.dataUrl, `m-${i}`))
    for (const [i, summary] of again.entries()) expect(summary).toBe(first[i] ?? null)
  })

  it('renomear um clipe para um nome do MESMO tamanho (mesmo id) devolve os clipes novos', () => {
    // O Molda troca o arquivo no mesmo asset (updateAssetImage não muda o id). Os nomes dos
    // clipes moram no meio do JSON, longe do começo do base64.
    const url = skinned.dataUrl
    const bin = Buffer.from(url.slice(url.indexOf(',') + 1), 'base64')
    const length = bin.readUInt32LE(12)
    const json = bin.subarray(20, 20 + length).toString('utf8')
    const old = (JSON.parse(json) as { animations: { name: string }[] }).animations[0]?.name ?? ''
    expect(old.length).toBeGreaterThan(2)
    expect(json.indexOf(`"name":"${old}"`)).toBeGreaterThan(400)
    const renamed = old.split('').reverse().join('')
    const json2 = json.replace(`"name":"${old}"`, `"name":"${renamed}"`)
    const bin2 = Buffer.concat([
      bin.subarray(0, 20),
      Buffer.from(json2, 'utf8'),
      bin.subarray(20 + length),
    ])
    const url2 = url.slice(0, url.indexOf(',') + 1) + bin2.toString('base64')
    expect(url2.length).toBe(url.length)
    expect(readGlbSummary(url, 'mesmo-id')?.clips).toContain(old)
    const after = readGlbSummary(url2, 'mesmo-id')?.clips
    expect(after).toContain(renamed)
    expect(after).not.toContain(old)
  })

  it('conteúdo diferente com o mesmo id não reaproveita o resumo antigo', () => {
    const before = readGlbSummary(makeAnimatedGlb('a', ['Andar']), 'mesmo')
    const after = readGlbSummary(makeAnimatedGlb('a', ['Correr']), 'mesmo')
    expect(before?.clips).toEqual(['Andar'])
    expect(after?.clips).toEqual(['Correr'])
  })
})
