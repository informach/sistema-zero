/** A versão faz parte das chaves: abas antigas não escrevem nos projetos atuais. */
export type ProjectStorageVersion = 3 | 4
export const PROJECT_STORAGE_VERSION: ProjectStorageVersion = 3
const projectKey = (
  part: string,
  id: string,
  version: ProjectStorageVersion = PROJECT_STORAGE_VERSION,
) => `sz:v${version}:project-${part}:${id}`
export const PROJECT_META_KEY_PREFIX = projectKey('meta', '')
export const projectMetaKey = (id: string, version?: ProjectStorageVersion) =>
  projectKey('meta', id, version)
export const projectFilesKey = (id: string, version?: ProjectStorageVersion) =>
  projectKey('files', id, version)
export const projectStateKey = (id: string, version?: ProjectStorageVersion) =>
  projectKey('state', id, version)
export const projectBlocksKey = (id: string, version?: ProjectStorageVersion) =>
  projectKey('blocks', id, version)
export const projectAssetsKey = (id: string, version?: ProjectStorageVersion) =>
  projectKey('assets', id, version)
export const projectThumbKey = (id: string, version?: ProjectStorageVersion) =>
  projectKey('thumb', id, version)
export const projectMigrationKey = (id: string, version?: ProjectStorageVersion) =>
  projectKey('source', id, version)
export const projectHeadKey = (id: string, version?: ProjectStorageVersion) =>
  projectKey('head', id, version)
export const projectApplicationsKey = (id: string, version?: ProjectStorageVersion) =>
  projectKey('applications', id, version)
export const applicationBudgetKey = (version: ProjectStorageVersion = PROJECT_STORAGE_VERSION) =>
  `sz:v${version}:application-budget`
export const APPLICATION_BUDGET_KEY = applicationBudgetKey()
export const projectRecoveryPrefix = (version?: ProjectStorageVersion) =>
  projectKey('recovery', '', version)
export const PROJECT_RECOVERY_PREFIX = projectRecoveryPrefix()
export const projectRecoveryKey = (id: string, writer: string, version?: ProjectStorageVersion) =>
  projectKey('recovery', `${id}:${writer}`, version)
export const projectBackupKey = (id: string, hash: string, version?: ProjectStorageVersion) =>
  projectKey('backup', `${id}:${hash}`, version)
