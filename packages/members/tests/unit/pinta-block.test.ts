/**
 * Bloco de aula do PINTA — domínio + borda.
 *
 * O que estes testes seguram é a coisa que este pacote já viu quebrar de outras formas: o tipo do
 * desenho vive em DOIS lugares (o domínio e o DTO), e uma lista que diverge da outra não dá erro
 * de compilação — dá bloco recusado na autoria, ou pior, bloco aceito sem tipo legível.
 */
import { describe, expect, it } from 'bun:test'
import {
  isCompletionGatingBlock,
  LESSON_BLOCK_KINDS,
  MAX_PINTA_ASSET_CHARS,
  PINTA_ASSET_KINDS,
  type PintaBlock,
  pintaAssetKindOf,
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
        properties?: { initialAsset?: { properties?: { kind?: { anyOf?: { const?: string }[] } } } }
      }
    | undefined
  const anyOf = pinta?.properties?.initialAsset?.properties?.kind?.anyOf ?? []
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

  it('a leitura da borda é de verdade (anti-vácuo: achou os 7)', () => {
    expect(kindsAceitosNaBorda()).toHaveLength(7)
  })
})
