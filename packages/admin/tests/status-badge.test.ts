import { describe, expect, test } from 'bun:test'
import { statusLabel } from '../src/components/admin/status-badge'

describe('statusLabel: a situação de uma conta', () => {
  test('`pending` é a conta que ainda não foi ativada (a pessoa não consegue entrar)', () => {
    expect(statusLabel('pending', 'account')).toBe('Ativação pendente')
  })

  test('"Convite sem resposta" não é situação de conta (é o chip de quem não criou a senha)', () => {
    for (const status of ['active', 'pending', 'suspended', 'blocked', 'inactive']) {
      expect(statusLabel(status, 'account')).not.toBe('Convite sem resposta')
    }
  })

  test('os outros nomes das contas e o mesmo valor em outros lugares seguem como estavam', () => {
    expect(statusLabel('active', 'account')).toBe('Ativa')
    expect(statusLabel('suspended', 'account')).toBe('Suspensa')
    expect(statusLabel('blocked', 'account')).toBe('Bloqueada')
    expect(statusLabel('pending')).toBe('Aguardando')
    expect(statusLabel('active', 'catalog')).toBe('Publicado')
  })
})
