import { expect, mock, test } from 'bun:test'
import type { SessionUser } from '../../src/lib/types'

mock.module('server-only', () => ({}))
const { pintaAccountViewer } = await import('../../src/server/pinta-causal-eligibility')

test('a sessão RSC entrega a conta do Pinta a todo aluno ativo, conferindo perfil e audiência', () => {
  const adult = '11111111-1111-4111-8111-111111111111',
    kid = '22222222-2222-4222-8222-222222222222'
  const user: SessionUser = {
    id: adult,
    status: 'active',
    role: 'customer',
    email: '',
    firstName: '',
    lastName: '',
  }
  const child = { ...user, id: kid, activeProfile: { accountId: adult, name: 'Perfil' } }
  // Só a infraestrutura decide: sem o bucket privado, ninguém recebe a fila causal.
  const ready = !!process.env.R2_UGC_BUCKET
  expect(pintaAccountViewer(user, 'adult')).toEqual(
    ready ? { audience: 'adult', userId: adult, accountId: adult } : null,
  )
  expect(pintaAccountViewer(child, 'kids')).toEqual(
    ready ? { audience: 'kids', userId: kid, accountId: adult } : null,
  )
  // A conta vem da sessão (o perfil ativo), nunca de uma lista: outra conta, outro escopo.
  expect(
    pintaAccountViewer(
      { ...child, activeProfile: { accountId: kid, name: 'outra conta' } },
      'kids',
    ),
  ).toEqual(ready ? { audience: 'kids', userId: kid, accountId: kid } : null)
  expect(pintaAccountViewer(child, 'adult')).toBeNull()
  expect(pintaAccountViewer(user, 'kids')).toBeNull()
  expect(
    pintaAccountViewer(
      { ...child, kids: { kind: 'parent', sessionId: kid, authenticatedAt: 10 } },
      'kids',
    ),
  ).toBeNull()
  expect(pintaAccountViewer({ ...user, act: { sub: adult, mode: 'readonly' } }, 'adult')).toBeNull()
  expect(pintaAccountViewer({ ...user, status: 'inactive' }, 'adult')).toBeNull()
  expect(pintaAccountViewer(null, 'adult')).toBeNull()
  expect(pintaAccountViewer(null, 'kids')).toBeNull()
})
