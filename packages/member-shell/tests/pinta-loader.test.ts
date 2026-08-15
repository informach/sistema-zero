import { describe, expect, test } from 'bun:test'
import { loadPintaLessonModule } from '../src/components/pinta/pinta-loader'

describe('loadPintaLessonModule', () => {
  test('converte falha do chunk em estado recuperável para a aula', async () => {
    const result = await loadPintaLessonModule(async () => {
      throw new Error('chunk indisponível')
    })

    expect(result.module).toBeNull()
    if (result.module === null) expect(result.error).toBeInstanceOf(Error)
  })
})
