import { describe, expect, test } from 'bun:test'
import { opaqueStudioRuntimeExecutionId } from '../src/server/studio-pro-runtime'

describe('opaqueStudioRuntimeExecutionId', () => {
  test('é estável para a mesma autorização e não expõe os identificadores', async () => {
    const first = await opaqueStudioRuntimeExecutionId('lesson', 'perfil-1', 'aula-1', 'bloco-1')
    const repeated = await opaqueStudioRuntimeExecutionId('lesson', 'perfil-1', 'aula-1', 'bloco-1')
    const other = await opaqueStudioRuntimeExecutionId('lesson', 'perfil-1', 'aula-1', 'bloco-2')

    expect(first).toBe(repeated)
    expect(first).not.toBe(other)
    expect(first).toMatch(/^lesson-[a-f0-9]{48}$/)
    expect(first).not.toContain('perfil-1')
  })
})
