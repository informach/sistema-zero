import { expect, test } from 'bun:test'

test('jogo isola apenas sua página para o Estúdio Pro sem permitir terceiros a embutir', async () => {
  for (const path of ['../next.config', '../../community/next.config']) {
    const config = (await import(path)).default
    const rules = await config.headers()
    const game = rules.find((rule: { source: string }) => rule.source === '/arquipelago')
    expect(game).toBeDefined()
    const csp = game.headers.find(
      (header: { key: string }) => header.key === 'Content-Security-Policy',
    )?.value
    expect(csp).toContain("frame-ancestors 'none'")
    expect(csp).toContain('webcontainer-api.io')
    expect(
      game.headers.find((header: { key: string }) => header.key === 'Cross-Origin-Embedder-Policy')
        ?.value,
    ).toBe('credentialless')
  }
})
