import type { StaffDirectory } from '../../src/domain/ports/staff-directory.port'
/** PostgreSQL suites create synthetic actor ids independently of the auth DB. */
export const fixtureDirectory: StaffDirectory = {
  async lookup(input) {
    return 'ids' in input
      ? input.ids.map((id) => ({ id, name: 'Pessoa da revisão', active: true }))
      : []
  },
}
