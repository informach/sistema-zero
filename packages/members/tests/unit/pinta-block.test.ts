/**
 * Bloco de aula do PINTA — domínio + borda.
 *
 * O que estes testes seguram é a coisa que este pacote já viu quebrar de outras formas: o tipo do
 * desenho vive em DOIS lugares (o domínio e o DTO), e uma lista que diverge da outra não dá erro
 * de compilação — dá bloco recusado na autoria, ou pior, bloco aceito sem tipo legível.
 */
import { describe, expect, it } from 'bun:test'
import {
  PINTA_LESSON_MAP_LIMITS as EDITOR_LESSON_LIMITS,
  PINTA_LIMITS,
  PINTA_MAP_FORMAT_LIMITS,
} from '@sistemazero/pinta/assets'
import {
  isCompletionGatingBlock,
  LESSON_BLOCK_KINDS,
  MAX_PINTA_ASSET_CHARS,
  PINTA_ASSET_KINDS,
  PINTA_LESSON_MAP_LIMITS,
  type PintaBlock,
  pintaAssetKindOf,
  pintaLessonLimitIssue,
} from '../../src/domain/course/lesson-block'
import { LessonBlockContentSchema } from '../../src/interfaces/http/dtos'

/** Os `kind` de desenho que a BORDA aceita, lidos do TypeBox de verdade. */
function kindsAceitosNaBorda(): string[] {
  const variantes = (LessonBlockContentSchema as { anyOf?: unknown[] }).anyOf ?? []
  const pinta = variantes.find(
    (v) =>
      (v as { properties?: { kind?: { const?: unknown } } }).properties?.kind?.const === 'pinta',
  ) as
    | {
        properties?: {
          initialAsset?: {
            properties?: { kind?: { anyOf?: { const?: string }[] } }
            anyOf?: { properties?: { kind?: { anyOf?: { const?: string }[] } } }[]
          }
        }
      }
    | undefined
  // ⚠️ O `initialAsset` pode ser o objeto OU um union com ele (hoje `PintaAsset | null`,
  // para o bloco que começa com a folha em branco). A leitura atravessa as duas formas:
  // sem isso ela devolve vazio e o teste reprova como se as listas tivessem divergido,
  // quando o que mudou foi o FORMATO do schema do outro lado.
  const asset = pinta?.properties?.initialAsset
  const objeto = asset?.properties ? asset : asset?.anyOf?.find((v) => v?.properties?.kind)
  const anyOf = objeto?.properties?.kind?.anyOf ?? []
  return anyOf.map((v) => v.const).filter((v): v is string => typeof v === 'string')
}

function bloco(initialAsset: unknown): PintaBlock {
  return { kind: 'pinta', initialAsset }
}

describe('bloco pinta no domínio', () => {
  it('é um kind de bloco conhecido', () => {
    expect(LESSON_BLOCK_KINDS).toContain('pinta')
  })

  it('🚨 TRAVA a conclusão da aula (a criança precisa enviar o desenho)', () => {
    expect(isCompletionGatingBlock(bloco({ kind: 'pixel-sprite' }))).toBe(true)
    // Anti-vácuo: nem todo bloco trava.
    expect(isCompletionGatingBlock({ kind: 'rich_text', markdown: 'oi' })).toBe(false)
  })

  it('🚨 o teto do desenho cabe DENTRO do teto de corpo do gateway (2 MB)', () => {
    // Aceitar mais que a borda deixa passar só troca um 413 de transporte por outro: rota
    // nenhuma do gateway pode subir acima do teto global (o boot dele falha se tentar).
    // Com folga para o envelope `{"asset":…,"message":…}`.
    expect(MAX_PINTA_ASSET_CHARS).toBeLessThan(2 * 1024 * 1024 - 100_000)
    // E cabe o desenho DENSO de 512x512 com 4 camadas, medido em 1.577.228 chars — o caso
    // realista de uma criança que preencheu a tela inteira.
    expect(MAX_PINTA_ASSET_CHARS).toBeGreaterThan(1_577_228)
  })
})

describe('pintaAssetKindOf', () => {
  it('lê o tipo do SNAPSHOT, que é a única fonte da verdade', () => {
    for (const kind of PINTA_ASSET_KINDS) {
      expect(pintaAssetKindOf(bloco({ kind, id: 'a', name: 'n' })), kind).toBe(kind)
    }
  })

  it('devolve null sem inventar tipo quando o snapshot não diz', () => {
    // O bloco existe em jsonb: um snapshot velho, truncado ou de uma versão futura chega aqui.
    for (const ruim of [null, undefined, {}, { kind: 42 }, { kind: 'inventado' }, 'texto', []]) {
      expect(pintaAssetKindOf(bloco(ruim)), JSON.stringify(ruim)).toBeNull()
    }
  })
})

describe('🚨 a borda e o domínio conhecem os MESMOS tipos de desenho', () => {
  it('as duas listas batem, item a item', () => {
    // Divergir não quebra compilação: quebra a autoria, ou entrega um bloco cujo tipo o resto do
    // sistema não consegue ler.
    expect([...kindsAceitosNaBorda()].sort()).toEqual([...PINTA_ASSET_KINDS].sort())
  })

  it('a leitura da borda é de verdade (anti-vácuo: achou os 8)', () => {
    expect(kindsAceitosNaBorda()).toHaveLength(8)
  })
})

describe('tetos de mapa do desenho de aula (os de criação, não os de leitura)', () => {
  const mapa = (over: Record<string, unknown> = {}) => ({
    kind: 'tilemap',
    cols: 128,
    rows: 128,
    layers: Array.from({ length: 8 }, (_, i) => ({ id: `c${i}` })),
    ...over,
  })
  const pecas = (quantas: number, kind = 'tileset') => ({
    kind,
    tiles: Array.from({ length: quantas }, () => ({})),
  })

  it('são os tetos antigos: 128 × 128 células, 8 camadas, 64 peças', () => {
    expect({ ...PINTA_LESSON_MAP_LIMITS }).toEqual({
      maxCols: 128,
      maxRows: 128,
      maxLayers: 8,
      maxTiles: 64,
    })
  })

  it('🚨 o orçamento HTTP do curso permanece menor que a autoria pessoal e a leitura', () => {
    expect({ ...PINTA_LESSON_MAP_LIMITS }).toEqual({ ...EDITOR_LESSON_LIMITS })
    expect(PINTA_LESSON_MAP_LIMITS.maxCols).toBeLessThan(PINTA_LIMITS.maxTilemapCols)
    expect(PINTA_LESSON_MAP_LIMITS.maxRows).toBeLessThan(PINTA_LIMITS.maxTilemapRows)
    expect(PINTA_LESSON_MAP_LIMITS.maxLayers).toBeLessThan(PINTA_LIMITS.maxTilemapLayers)
    expect(PINTA_LESSON_MAP_LIMITS.maxTiles).toBeLessThan(PINTA_LIMITS.maxTiles)
    expect(PINTA_MAP_FORMAT_LIMITS.maxCols).toBeGreaterThan(PINTA_LESSON_MAP_LIMITS.maxCols)
    expect(PINTA_MAP_FORMAT_LIMITS.maxLayers).toBeGreaterThan(PINTA_LESSON_MAP_LIMITS.maxLayers)
    expect(PINTA_MAP_FORMAT_LIMITS.maxTiles).toBeGreaterThan(PINTA_LESSON_MAP_LIMITS.maxTiles)
  })

  it('no teto exato cabe; um a mais diz qual medida passou', () => {
    expect(pintaLessonLimitIssue(mapa())).toBeNull()
    expect(pintaLessonLimitIssue(mapa({ cols: 129 }))).toBe('cols')
    expect(pintaLessonLimitIssue(mapa({ rows: 129 }))).toBe('rows')
    expect(pintaLessonLimitIssue(mapa({ layers: Array.from({ length: 9 }, () => ({})) }))).toBe(
      'layers',
    )
    expect(pintaLessonLimitIssue(pecas(64))).toBeNull()
    expect(pintaLessonLimitIssue(pecas(65))).toBe('tiles')
    expect(pintaLessonLimitIssue(pecas(65, 'vector-tileset'))).toBe('tiles')
  })

  it('o conjunto é conferido pelo mapa que ele guarda', () => {
    expect(pintaLessonLimitIssue({ kind: 'map-set', map: mapa() })).toBeNull()
    expect(pintaLessonLimitIssue({ kind: 'map-set', map: mapa({ cols: 200 }) })).toBe('cols')
  })
  it('peças embutidas no mapa mantêm os mesmos tetos da aula', () => {
    expect(pintaLessonLimitIssue(mapa({ resources: [{ asset: pecas(64) }] }))).toBeNull()
    expect(pintaLessonLimitIssue(mapa({ resources: [{ asset: pecas(65) }] }))).toBe('tiles')
    expect(
      pintaLessonLimitIssue(mapa({ resources: [{ asset: pecas(65, 'vector-tileset') }] })),
    ).toBe('tiles')
  })

  it('desenho que não é mapa nem peças, e JSON estranho, nunca têm problema de tamanho de mapa', () => {
    for (const outro of [
      { kind: 'pixel-sprite', cols: 999, tiles: Array.from({ length: 999 }) },
      { kind: 'vector-background' },
      null,
      'texto',
      [],
      { kind: 'tilemap' },
      { kind: 'tilemap', cols: 'muitas', layers: 'nenhuma' },
    ])
      expect(pintaLessonLimitIssue(outro), JSON.stringify(outro)).toBeNull()
  })
})
