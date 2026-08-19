import { describe, expect, test } from 'bun:test'
import { executeUserDeletion } from '../src/server/user-deletion'

describe('exclusão de usuário — criações no R2', () => {
  test('retry de uma exclusão concluída encerra sem repetir purgas', async () => {
    const calls: string[] = []
    const result = await executeUserDeletion('conta-1', {
      gatewayFetch: async (path, options) => {
        calls.push(`${options?.method ?? 'GET'} ${path}`)
        return {
          status: 200,
          body: { profileIds: ['perfil-a'], completed: true },
        }
      },
      purgeCreationBlobs: async () => {
        calls.push('R2')
      },
    })

    expect(result).toEqual({ status: 200, body: { ok: true } })
    expect(calls).toEqual(['POST /auth/admin/users/conta-1/deletion/prepare'])
  })

  test('apaga os prefixos da conta e dos perfis antes de remover o índice no members', async () => {
    const calls: string[] = []
    const result = await executeUserDeletion('conta-1', {
      gatewayFetch: async (path, options) => {
        calls.push(`${options?.method ?? 'GET'} ${path}`)
        if (path.endsWith('/deletion/prepare')) {
          return {
            status: 200,
            body: { profileIds: ['perfil-a', 'perfil-arquivado'] },
          }
        }
        return { status: options?.method === 'DELETE' ? 204 : 200, body: {} }
      },
      purgeCreationBlobs: async (userIds) => {
        calls.push(`R2 ${userIds.join(',')}`)
      },
    })

    expect(result).toEqual({ status: 200, body: { ok: true } })
    expect(calls).toEqual([
      'POST /auth/admin/users/conta-1/deletion/prepare',
      'R2 conta-1,perfil-a,perfil-arquivado',
      'DELETE /members/admin/users/conta-1/data',
      'DELETE /hub/admin/users/conta-1/data',
      'R2 conta-1,perfil-a,perfil-arquivado',
      'DELETE /auth/admin/users/conta-1',
    ])
  })

  test('falha na limpeza imediata não impede a exclusão porque o Members agenda o retry durável', async () => {
    const calls: string[] = []
    const result = await executeUserDeletion('conta-1', {
      gatewayFetch: async (path, options) => {
        calls.push(`${options?.method ?? 'GET'} ${path}`)
        if (path.endsWith('/deletion/prepare')) return { status: 200, body: { profileIds: [] } }
        return { status: 204, body: {} }
      },
      purgeCreationBlobs: async () => {
        calls.push('R2')
        throw new Error('R2 indisponível')
      },
    })

    expect(result).toEqual({ status: 200, body: { ok: true } })
    expect(calls).toEqual([
      'POST /auth/admin/users/conta-1/deletion/prepare',
      'R2',
      'DELETE /members/admin/users/conta-1/data',
      'DELETE /hub/admin/users/conta-1/data',
      'R2',
      'DELETE /auth/admin/users/conta-1',
    ])
  })
})
