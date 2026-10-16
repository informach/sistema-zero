import type { StaffIdentity } from '@sistemazero/marketing-contracts'
export interface StaffDirectory {
  lookup(input: { ids: string[] } | { query: string }): Promise<StaffIdentity[]>
}
