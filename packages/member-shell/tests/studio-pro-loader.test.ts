import { describe, expect, test } from 'bun:test'
import { loadStudioProModule } from '../src/components/studio/studio-pro-loader'

describe('loadStudioProModule', () => {
  test('converte falha do chunk em estado recuperável, sem rejeição não tratada', async () => {
    const result = await loadStudioProModule(async () => {
      throw new Error('chunk indisponível')
    })

    expect(result.module).toBeNull()
    if (result.module === null) {
      expect(result.error).toBeInstanceOf(Error)
    }
  })
})
