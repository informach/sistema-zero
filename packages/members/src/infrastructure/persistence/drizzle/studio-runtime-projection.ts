import { type SQL, sql } from 'drizzle-orm'

/** Project/draft JSON remains in PostgreSQL; permission checks never load source or media. */
export function studioEnvironmentProjection(project: SQL) {
  return sql<unknown>`jsonb_strip_nulls(jsonb_build_object(
    'formatVersion', ${project}->'formatVersion',
    'programmingLanguage', ${project}->'programmingLanguage',
    'kind', ${project}->'kind',
    'runtime', ${project}->'runtime',
    'proMeta', case when ${project}->'proMeta'->'templateId' is not null
      then jsonb_build_object('templateId', ${project}->'proMeta'->'templateId') end
  ))`
}

export function studioCurationProjection(configuration: SQL) {
  return sql<unknown>`jsonb_strip_nulls(jsonb_build_object(
    'level', ${configuration}->'level',
    'pythonLevel', ${configuration}->'pythonLevel',
    'allowedModes', ${configuration}->'allowedModes',
    'allowBlocks', ${configuration}->'allowBlocks',
    'allowCategories', ${configuration}->'allowCategories',
    'allowLevelReveal', ${configuration}->'allowLevelReveal'
  ))`
}
