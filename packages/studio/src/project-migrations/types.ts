export { copyDocument } from '../core/projectDocument'

export interface MigrationChange {
  rule: string
  path: string
}

export interface ProjectMigrationResult {
  document: Record<string, unknown>
  fromVersion: number
  toVersion: number
  changes: MigrationChange[]
}
