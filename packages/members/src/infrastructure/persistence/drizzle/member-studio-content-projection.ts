import { type SQL, type SQLWrapper, sql } from 'drizzle-orm'
import {
  type LessonBlockContent,
  STUDIO_MEMBER_CONTENT_KEYS,
  STUDIO_MEMBER_GALLERY_KEYS,
  STUDIO_MEMBER_SHOWCASE_KEYS,
} from '../../../domain/course/lesson-block'

function optionalObject(content: SQLWrapper, keys: readonly string[]): SQL {
  return sql`jsonb_strip_nulls(jsonb_build_object(${sql.join(
    keys.map((key) => sql`${key}::text, ${content}->${key}::text`),
    sql`, `,
  )}))`
}

/** Project before the driver decodes JSON, so child reads never transfer the registry. */
export function memberStudioContentProjection(content: SQLWrapper): SQL<LessonBlockContent> {
  const optionalKeys = STUDIO_MEMBER_CONTENT_KEYS.filter(
    (key) => key !== 'kind' && key !== 'initialProject' && key !== 'gallery' && key !== 'showcase',
  )
  const gallery = sql`${content}->'gallery'`
  const showcase = sql`${content}->'showcase'`
  return sql<LessonBlockContent>`case when ${content}->>'kind' = 'studio' then (
    ${optionalObject(content, optionalKeys)}
    || jsonb_build_object('kind', 'studio', 'initialProject', ${content}->'initialProject')
    || case when jsonb_typeof(${gallery}) = 'object'
       then jsonb_build_object('gallery', ${optionalObject(gallery, STUDIO_MEMBER_GALLERY_KEYS)})
       else '{}'::jsonb end
    || case when jsonb_typeof(${showcase}) = 'object'
       then jsonb_build_object('showcase', ${optionalObject(showcase, STUDIO_MEMBER_SHOWCASE_KEYS)})
       else '{}'::jsonb end
  ) else ${content} end`
}
