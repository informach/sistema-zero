import { describe, expect, test } from 'bun:test'
import { loadPintaEmbedModule } from './pinta-embed-loader'

describe('loadPintaEmbedModule', () => {
  test('converte falha do chunk em estado recuperável para a autoria', async () => {
    await expect(
      loadPintaEmbedModule(async () => {
        throw new Error('chunk indisponível')
      }),
    ).resolves.toMatchObject({ module: null, error: expect.any(Error) })
  })
})
