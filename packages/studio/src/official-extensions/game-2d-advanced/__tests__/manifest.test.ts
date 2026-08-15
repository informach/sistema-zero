import { describe, expect, it } from 'bun:test'
import { gameKitDocs } from '../docs'
import { gameKitManifest } from '../manifest'
import { gameKitRuntime } from '../runtime'

describe('game-2d-advanced — capacidades declaradas', () => {
  it('declara storage quando o runtime usa Web Storage', () => {
    const usesWebStorage = /\b(?:local|session)Storage\b/.test(gameKitRuntime)

    expect(usesWebStorage).toBe(true)
    expect(gameKitManifest.permissions).toContain('storage')
  })

  /**
   * ⚠️ O teto mudou de DONO. Ele valia sobre o `manifest.docs`, que carregava o
   * manual inteiro e estava em 47.995 de 48.000 — cinco caracteres de folga, ou
   * seja, qualquer correção de texto quebrava o teste. O manual passou a entrar
   * por provider preguiçoso, então o que se capa aqui é o `gameKitDocs`, contra
   * o `MAX_DOCS_CHARS` do próprio schema (60k). É sanidade, não orçamento de UI.
   */
  it('o manual cabe no limite de sanidade do schema', () => {
    expect(gameKitDocs.length).toBeLessThanOrEqual(60_000)
  })

  it('⭐ o manifest leva só o RESUMO — o manual não viaja no chunk de entrada', () => {
    // ⚠️ ANTI-VÁCUO da migração: sem esta asserção, alguém devolve o
    // `docs: gameKitDocs` e os 50 KB voltam em silêncio ao bundle.
    expect(gameKitManifest.docs?.length ?? 0).toBeLessThan(500)
    expect(gameKitManifest.docs).not.toContain('###')
  })
})
