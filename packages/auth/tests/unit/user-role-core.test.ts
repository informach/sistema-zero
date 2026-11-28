import { expect, test } from 'bun:test'
import { USER_ROLES } from '@sistemazero/core/identity'
import {
  USER_ROLES as AUTH_USER_ROLES,
  isPrivilegedUserRole,
} from '../../src/domain/user/user.role'
import { userRoleEnum } from '../../src/infrastructure/persistence/drizzle/schema'

// A lista de papéis mora no core. O enum do banco (`auth.user_role`) é histórico de migration e
// precisa continuar igual a ela: um papel novo no core sem migration quebraria a gravação.
test('o enum do banco e o auth usam a lista de papéis do core', () => {
  expect(userRoleEnum.enumValues).toEqual([...USER_ROLES])
  expect(AUTH_USER_ROLES).toBe(USER_ROLES)
  expect(['superadmin', 'admin', 'staff'].every(isPrivilegedUserRole)).toBe(true)
  expect(isPrivilegedUserRole('customer')).toBe(false)
})
