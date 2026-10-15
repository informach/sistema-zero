/** A versão faz parte das chaves: abas antigas não escrevem nos projetos atuais. */
export const PROJECT_STORAGE_VERSION = 3
export const PROJECT_META_KEY_PREFIX = 'sz:v3:project-meta:'
export const projectMetaKey = (id: string) => `${PROJECT_META_KEY_PREFIX}${id}`
export const projectFilesKey = (id: string) => `sz:v3:project-files:${id}`
export const projectStateKey = (id: string) => `sz:v3:project-state:${id}`
export const projectBlocksKey = (id: string) => `sz:v3:project-blocks:${id}`
export const projectAssetsKey = (id: string) => `sz:v3:project-assets:${id}`
export const projectThumbKey = (id: string) => `sz:v3:project-thumb:${id}`
export const projectMigrationKey = (id: string) => `sz:v3:project-source:${id}`
export const projectHeadKey = (id: string) => `sz:v3:project-head:${id}`
export const projectApplicationsKey = (id: string) => `sz:v3:project-applications:${id}`
export const APPLICATION_BUDGET_KEY = 'sz:v3:application-budget'
export const PROJECT_RECOVERY_PREFIX = 'sz:v3:project-recovery:'
export const projectRecoveryKey = (id: string, writer: string) =>
  `${PROJECT_RECOVERY_PREFIX}${id}:${writer}`
