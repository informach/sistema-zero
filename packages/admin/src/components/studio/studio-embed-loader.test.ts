import { describe, expect, test } from 'bun:test'
import { loadStudioEmbedModule } from './studio-embed-loader'

describe('loadStudioEmbedModule', () => {
  test('converte falha do chunk em estado que a autoria consegue recuperar', async () => {
    await expect(
      loadStudioEmbedModule(async () => {
        throw new Error('chunk indisponível')
      }),
    ).resolves.toMatchObject({ module: null, error: expect.any(Error) })
  })
})
