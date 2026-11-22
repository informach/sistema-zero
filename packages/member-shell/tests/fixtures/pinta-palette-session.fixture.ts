import { expect, mock, test } from 'bun:test'
import type { SessionUser } from '../../src/lib/types'

mock.module('server-only', () => ({}))
const { pintaPalettePageViewer } = await import('../../src/server/pinta-causal-eligibility')

test('a sessão RSC seleciona somente o perfil, audiência e conta permitidos', () => {
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
  const enabled = process.env.PINTA_PALETTE_WRITE_CANDIDATE === '1' && !!process.env.R2_UGC_BUCKET
  expect(pintaPalettePageViewer(user, 'adult')).toEqual(
    enabled ? { audience: 'adult', userId: adult, accountId: adult } : null,
  )
  expect(pintaPalettePageViewer(child, 'kids')).toEqual(
    enabled ? { audience: 'kids', userId: kid, accountId: adult } : null,
  )
  expect(
    pintaPalettePageViewer(
      { ...child, activeProfile: { accountId: kid, name: 'outra conta' } },
      'kids',
    ),
  ).toBeNull()
  expect(pintaPalettePageViewer(child, 'adult')).toBeNull()
  expect(pintaPalettePageViewer(user, 'kids')).toBeNull()
  expect(
    pintaPalettePageViewer(
      { ...child, kids: { kind: 'parent', sessionId: kid, authenticatedAt: 10 } },
      'kids',
    ),
  ).toBeNull()
  expect(
    pintaPalettePageViewer({ ...user, act: { sub: adult, mode: 'readonly' } }, 'adult'),
  ).toBeNull()
  expect(pintaPalettePageViewer({ ...user, status: 'inactive' }, 'adult')).toBeNull()
  expect(pintaPalettePageViewer(null, 'adult')).toBeNull()
})
