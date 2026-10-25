import { describe, expect, it } from 'bun:test'
import ts from 'typescript'
import { buildProjectRunContextRuntime } from '#extensions'
import { gameKitRuntime, gameKitRuntimeSource } from '../runtime'

function tokens(source: string): Array<[ts.SyntaxKind, string, boolean]> {
  const scanner = ts.createScanner(
    ts.ScriptTarget.ES2022,
    true,
    ts.LanguageVariant.Standard,
    source,
  )
  const result: Array<[ts.SyntaxKind, string, boolean]> = []
  for (let kind = scanner.scan(); kind !== ts.SyntaxKind.EndOfFileToken; kind = scanner.scan()) {
    result.push([kind, scanner.getTokenText(), scanner.hasPrecedingLineBreak()])
  }
  return result
}

describe('payload do Jogo 2D Avançado', () => {
  it('preserva tokens, quebras significativas e o contexto da partida', () => {
    const source = `${buildProjectRunContextRuntime()}\n${gameKitRuntimeSource}`
    expect(tokens(gameKitRuntime)).toEqual(tokens(source))
    expect(gameKitRuntimeSource.includes('`')).toBe(false)
    expect(gameKitRuntime.startsWith(buildProjectRunContextRuntime())).toBe(true)
    expect(source.length - gameKitRuntime.length).toBeGreaterThan(70_000)
    expect(() => new Function(gameKitRuntime)).not.toThrow()
  })

  it('mantém o teto do código injetado explícito', () => {
    // Before this review: 521,697 chars / 160,860 gzip bytes. New native drawing
    // is included in the limit; whitespace cleanup must pay for its download.
    expect(gameKitRuntime.length).toBeLessThan(415_000)
    expect(Bun.gzipSync(gameKitRuntime).byteLength).toBeLessThan(124_000)
  })
})
