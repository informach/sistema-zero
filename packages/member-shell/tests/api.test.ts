import { afterEach, describe, expect, spyOn, test } from 'bun:test'
import { apiGet } from '../src/lib/api'

afterEach(() => {
  spyOn(globalThis, 'fetch').mockRestore()
})

describe('apiGet', () => {
  test('sempre consulta o servidor em leituras autenticadas mutáveis', async () => {
    const fetchMock = spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({ project: { name: 'Reenvio mais recente' } }),
    )

    await apiGet('/api/members/lessons/aula/blocks/bloco/studio-submission')

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/members/lessons/aula/blocks/bloco/studio-submission',
      {
        cache: 'no-store',
        headers: { accept: 'application/json' },
      },
    )
  })
})
