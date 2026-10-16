import { and, eq, inArray, or, sql } from 'drizzle-orm'
import { references } from '../../../domain/workspace/references'
import { editorialItemReferences } from './editorial-reference-expression'
import type { WorkspaceTransaction } from './workspace.repository'
import { editorialItems as items } from './workspace-schema'

/** Read changed nodes, their live referrers, then every direct dependency those nodes validate.
 * No recursive traversal: the domain validator only checks changed nodes and their referrers.
 * Call inside the project-locked transaction, after the complete mutation has been staged.
 */
export async function readEditorialGraph(
  tx: WorkspaceTransaction,
  projectId: string,
  changed: ReadonlySet<string>,
) {
  if (!changed.size) return []
  const ids = [...changed],
    columns = { id: items.id, document: items.document, archived: items.archived }
  const affected = await tx
    .select(columns)
    .from(items)
    .where(
      and(
        eq(items.projectId, projectId),
        or(
          inArray(items.id, ids),
          and(
            eq(items.archived, false),
            sql`${editorialItemReferences(items.document)} ?| ARRAY[${sql.join(
              ids.map((id) => sql`${id}`),
              sql`, `,
            )}]::text[]`,
          ),
        ),
      ),
    )
  const present = new Set(affected.map((node) => node.id))
  const dependencies = [
    ...new Set(
      affected.filter((node) => !node.archived).flatMap((node) => references(node.document).items),
    ),
  ].filter((id) => !present.has(id))
  if (!dependencies.length) return affected
  return [
    ...affected,
    ...(await tx
      .select(columns)
      .from(items)
      .where(and(eq(items.projectId, projectId), inArray(items.id, dependencies)))),
  ]
}
