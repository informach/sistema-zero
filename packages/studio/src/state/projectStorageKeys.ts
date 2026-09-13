/** A versão faz parte das chaves: abas antigas não escrevem nos projetos atuais. */
export const PROJECT_STORAGE_VERSION = 2
export const PROJECT_META_KEY_PREFIX = 'sz:v2:project-meta:'
export const projectMetaKey = (id: string) => `${PROJECT_META_KEY_PREFIX}${id}`
export const projectFilesKey = (id: string) => `sz:v2:project-files:${id}`
export const projectStateKey = (id: string) => `sz:v2:project-state:${id}`
export const projectBlocksKey = (id: string) => `sz:v2:project-blocks:${id}`
export const projectAssetsKey = (id: string) => `sz:v2:project-assets:${id}`
export const projectThumbKey = (id: string) => `sz:v2:project-thumb:${id}`
export const projectMigrationKey = (id: string) => `sz:v2:project-source:${id}`
