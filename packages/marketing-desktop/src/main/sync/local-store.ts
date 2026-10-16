import { DatabaseSync } from 'node:sqlite'
import { z } from 'zod'
import { uploadStartSchema } from '../../../../marketing-contracts/src/assets'
import { canonicalJson } from '../../../../marketing-contracts/src/common'
import {
  batchOperationSchema,
  batchResultSchema,
  type EditorialOperation,
  itemSchema,
  type OperationResult,
  operationResultSchema,
  operationSchema,
  type Project,
  projectSchema,
} from '../../../../marketing-contracts/src/editorial'
import {
  parseSnapshotPage,
  type SnapshotCursor,
  snapshotCursorSchema,
} from '../../../../marketing-contracts/src/snapshot'
import {
  changePageSchema,
  draftResolutionSchema,
  enqueueSchema,
  type PendingOperation,
  pendingBatchSchema,
  pendingOperationSchema,
  resolvedDraftSchema,
} from '../../../../marketing-contracts/src/sync'
import type { ItemProjection } from '../../shared/project-projection'

const scopeSchema = z.object({ origin: z.string().url(), userId: z.string().uuid() }).strict()
const cancellationSchema = z.object({
  projectId: z.string().uuid(),
  runId: z.string().uuid(),
  operationId: z.string().uuid(),
  state: z.enum(['pending', 'confirmed', 'blocked']),
  error: z.string().nullable(),
})
const rowSchema = z.object({
  payload: z.string(),
  state: z.enum(['local', 'sending', 'confirmed', 'conflict', 'blocked']),
  dependency_id: z.string().nullable(),
  result: z.string().nullable(),
  error: z.string().nullable(),
  created_at: z.string(),
})
const json = (value: unknown) => JSON.stringify(value)
function pending(row: unknown): PendingOperation {
  const parsed = rowSchema.parse(row)
  return pendingOperationSchema.parse({
    operation: JSON.parse(parsed.payload),
    state: parsed.state,
    dependsOnOperationId: parsed.dependency_id,
    result: parsed.result ? JSON.parse(parsed.result) : null,
    error: parsed.error,
    createdAt: parsed.created_at,
  })
}
function pendingBatch(row: unknown) {
  const parsed = rowSchema.omit({ dependency_id: true }).parse(row)
  return pendingBatchSchema.parse({
    operation: JSON.parse(parsed.payload),
    state: parsed.state,
    result: parsed.result ? JSON.parse(parsed.result) : null,
    error: parsed.error,
    createdAt: parsed.created_at,
  })
}
/** One database per server + user. Every draft and receipt survives process exit.
 * SQL is local schema evolution; server schema migrations remain Drizzle-owned. */
export class LocalWorkspaceStore {
  private readonly db: DatabaseSync
  constructor(
    file: string,
    readonly scope: z.infer<typeof scopeSchema>,
  ) {
    scopeSchema.parse(scope)
    this.db = new DatabaseSync(file)
    this.db.exec(
      'PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;',
    )
    const version = z
      .object({ user_version: z.number() })
      .parse(this.db.prepare('PRAGMA user_version').get()).user_version
    if (version > 8) {
      this.db.close()
      throw new Error('Atualize o app para abrir este cache. Os dados foram preservados.')
    }
    try {
      this.transaction(() => {
        this.db.exec(`
    CREATE TABLE IF NOT EXISTS binding (id INTEGER PRIMARY KEY CHECK(id=1), scope TEXT NOT NULL) STRICT;
    CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY,payload TEXT NOT NULL,cursor INTEGER NOT NULL DEFAULT 0,accessible INTEGER NOT NULL DEFAULT 1) STRICT;
    CREATE TABLE IF NOT EXISTS items (id TEXT PRIMARY KEY,project_id TEXT NOT NULL REFERENCES projects(id),payload TEXT NOT NULL,sequence INTEGER NOT NULL) STRICT;
    CREATE INDEX IF NOT EXISTS items_project ON items(project_id);
    CREATE TABLE IF NOT EXISTS outbox (
     operation_id TEXT PRIMARY KEY,project_id TEXT NOT NULL REFERENCES projects(id),entity_id TEXT NOT NULL,
     payload TEXT NOT NULL,requested_payload TEXT NOT NULL,state TEXT NOT NULL CHECK(state IN ('local','sending','confirmed','conflict','blocked')),
     dependency_id TEXT REFERENCES outbox(operation_id),result TEXT,error TEXT,created_at TEXT NOT NULL
    ) STRICT;
    CREATE INDEX IF NOT EXISTS outbox_project_state ON outbox(project_id,state);
    CREATE TABLE IF NOT EXISTS transfers(asset_id TEXT PRIMARY KEY,project_id TEXT NOT NULL REFERENCES projects(id),payload TEXT NOT NULL,state TEXT NOT NULL,error TEXT,uploaded_bytes INTEGER NOT NULL DEFAULT 0) STRICT;
    CREATE TABLE IF NOT EXISTS executions(run_id TEXT PRIMARY KEY,project_id TEXT NOT NULL REFERENCES projects(id),payload TEXT NOT NULL) STRICT;
    CREATE TABLE IF NOT EXISTS batches(operation_id TEXT PRIMARY KEY,project_id TEXT NOT NULL REFERENCES projects(id),payload TEXT NOT NULL,state TEXT NOT NULL,result TEXT,error TEXT,created_at TEXT NOT NULL) STRICT;
    CREATE TABLE IF NOT EXISTS resolved_drafts (operation_id TEXT PRIMARY KEY,project_id TEXT NOT NULL,replacement_id TEXT,resolved_at TEXT NOT NULL) STRICT;
    CREATE TABLE IF NOT EXISTS cancellations(run_id TEXT PRIMARY KEY,project_id TEXT NOT NULL REFERENCES projects(id),operation_id TEXT NOT NULL UNIQUE,state TEXT NOT NULL CHECK(state IN ('pending','confirmed','blocked')),error TEXT) STRICT;
   `)
        if (version < 7) {
          this.db.exec(`
            ALTER TABLE projects ADD COLUMN items_version INTEGER NOT NULL DEFAULT 0;
            CREATE TABLE item_changes (
              item_id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id),
              version INTEGER NOT NULL, deleted INTEGER NOT NULL CHECK(deleted IN (0,1))
            ) STRICT;
            CREATE INDEX item_changes_project_version ON item_changes(project_id,version);
            UPDATE projects SET items_version=1 WHERE EXISTS(SELECT 1 FROM items WHERE items.project_id=projects.id);
            INSERT INTO item_changes(item_id,project_id,version,deleted) SELECT id,project_id,1,0 FROM items;
            CREATE TRIGGER item_projection_insert AFTER INSERT ON items BEGIN
              UPDATE projects SET items_version=items_version+1 WHERE id=NEW.project_id;
              INSERT INTO item_changes(item_id,project_id,version,deleted)
                SELECT NEW.id,NEW.project_id,items_version,0 FROM projects WHERE id=NEW.project_id
                ON CONFLICT(item_id) DO UPDATE SET version=excluded.version,deleted=0;
            END;
            CREATE TRIGGER item_projection_update AFTER UPDATE OF payload ON items WHEN OLD.payload<>NEW.payload BEGIN
              UPDATE projects SET items_version=items_version+1 WHERE id=NEW.project_id;
              INSERT INTO item_changes(item_id,project_id,version,deleted)
                SELECT NEW.id,NEW.project_id,items_version,0 FROM projects WHERE id=NEW.project_id
                ON CONFLICT(item_id) DO UPDATE SET version=excluded.version,deleted=0;
            END;
            CREATE TRIGGER item_projection_delete AFTER DELETE ON items BEGIN
              UPDATE projects SET items_version=items_version+1 WHERE id=OLD.project_id;
              INSERT INTO item_changes(item_id,project_id,version,deleted)
                SELECT OLD.id,OLD.project_id,items_version,1 FROM projects WHERE id=OLD.project_id
                ON CONFLICT(item_id) DO UPDATE SET version=excluded.version,deleted=1;
            END;
            PRAGMA user_version=7;
          `)
        }
        if (version < 8) {
          this.db.exec(`
            CREATE TABLE snapshot_runs (project_id TEXT PRIMARY KEY REFERENCES projects(id),at INTEGER NOT NULL,after TEXT NOT NULL) STRICT;
            CREATE TABLE snapshot_items (id TEXT NOT NULL,project_id TEXT NOT NULL REFERENCES snapshot_runs(project_id) ON DELETE CASCADE,payload TEXT NOT NULL,sequence INTEGER NOT NULL,PRIMARY KEY(project_id,id)) STRICT;
            PRAGMA user_version=8;
          `)
        }
        const binding = this.db.prepare('SELECT scope FROM binding WHERE id=1').get()
        if (
          binding &&
          z.object({ scope: z.string() }).parse(binding).scope !== canonicalJson(scope)
        )
          throw new Error('O cache pertence a outra conta ou servidor')
        this.db
          .prepare('INSERT OR IGNORE INTO binding(id,scope) VALUES(1,?)')
          .run(canonicalJson(scope))
        // A lost response is retried with the exact same operation id and finalized payload.
        this.db.exec("UPDATE outbox SET state='local' WHERE state='sending'")
        this.db.exec("UPDATE batches SET state='local' WHERE state='sending'")
      })
    } catch (error) {
      this.db.close()
      throw error
    }
  }
  private transaction<T>(operation: () => T): T {
    this.db.exec('BEGIN IMMEDIATE')
    try {
      const value = operation()
      this.db.exec('COMMIT')
      return value
    } catch (error) {
      this.db.exec('ROLLBACK')
      throw error
    }
  }
  close() {
    this.db.close()
  }
  saveProjects(input: unknown) {
    const projects = z.array(projectSchema).parse(input)
    this.transaction(() => {
      this.db.exec('UPDATE projects SET accessible=0')
      const insert = this.db.prepare(
        'INSERT INTO projects(id,payload,accessible) VALUES(?,?,1) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,accessible=1',
      )
      for (const project of projects) insert.run(project.id, json(project))
    })
  }
  projects(): Project[] {
    return this.db
      .prepare('SELECT payload FROM projects WHERE accessible=1 ORDER BY id')
      .all()
      .map((row) =>
        projectSchema.parse(JSON.parse(z.object({ payload: z.string() }).parse(row).payload)),
      )
  }
  cursor(projectId: string) {
    return z
      .object({ cursor: z.number() })
      .parse(this.db.prepare('SELECT cursor FROM projects WHERE id=?').get(projectId)).cursor
  }
  snapshotCursor(projectId: string): SnapshotCursor | null {
    const row = this.db
      .prepare('SELECT at,after FROM snapshot_runs WHERE project_id=?')
      .get(projectId)
    return row ? snapshotCursorSchema.parse(row) : null
  }
  applySnapshotPage(projectId: string, expected: SnapshotCursor | null, raw: unknown) {
    const page = parseSnapshotPage(raw, projectId, expected)
    this.transaction(() => {
      const project = this.requireProject(projectId)
      if (JSON.stringify(this.snapshotCursor(projectId)) !== JSON.stringify(expected))
        throw new Error('O cursor de preparação do acervo mudou')
      if (!expected)
        this.db
          .prepare('INSERT INTO snapshot_runs(project_id,at,after) VALUES(?,?,?)')
          .run(projectId, page.at, '')
      const insert = this.db.prepare(
        'INSERT INTO snapshot_items(id,project_id,payload,sequence) VALUES(?,?,?,?)',
      )
      for (const entry of page.items) {
        const { sequence, ...item } = entry
        insert.run(item.id, projectId, json(item), sequence)
      }
      if (page.nextAfter) {
        this.db
          .prepare('UPDATE snapshot_runs SET after=? WHERE project_id=?')
          .run(page.nextAfter, projectId)
        return
      }
      // Swap only the complete cut; newer operation receipts remain ahead of it.
      this.db
        .prepare('DELETE FROM items WHERE project_id=? AND sequence<=?')
        .run(projectId, page.at)
      this.db
        .prepare(`INSERT INTO items(id,project_id,payload,sequence)
        SELECT id,project_id,payload,sequence FROM snapshot_items WHERE project_id=?
        ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,sequence=excluded.sequence
        WHERE excluded.project_id=items.project_id AND excluded.sequence>=items.sequence`)
        .run(projectId)
      this.db
        .prepare('UPDATE projects SET cursor=?,payload=? WHERE id=?')
        .run(
          page.at,
          json({ ...project, permissions: page.permissions, sequence: page.at }),
          projectId,
        )
      this.db.prepare('DELETE FROM snapshot_runs WHERE project_id=?').run(projectId)
    })
  }
  setInaccessible(projectId: string) {
    this.db.prepare('UPDATE projects SET accessible=0 WHERE id=?').run(projectId)
  }
  private requireProject(projectId: string) {
    const row = this.db
      .prepare('SELECT payload FROM projects WHERE id=? AND accessible=1')
      .get(projectId)
    if (!row) throw new Error('Projeto indisponível nesta conta')
    return projectSchema.parse(JSON.parse(z.object({ payload: z.string() }).parse(row).payload))
  }
  applyPage(projectId: string, expectedCursor: number, raw: unknown) {
    const page = changePageSchema.parse(raw)
    if (
      page.events.some((event) => event.projectId !== projectId) ||
      page.items.some((item) => item.projectId !== projectId)
    )
      throw new Error('Página de outro projeto')
    this.transaction(() => {
      const project = this.requireProject(projectId)
      if (this.cursor(projectId) !== expectedCursor)
        throw new Error('Cursor local mudou durante a sincronização')
      if (page.resetRequired) {
        this.db.prepare('DELETE FROM snapshot_runs WHERE project_id=?').run(projectId)
        this.db.prepare('DELETE FROM items WHERE project_id=?').run(projectId)
        this.db.prepare('UPDATE projects SET cursor=0 WHERE id=?').run(projectId)
        return
      }
      if (
        page.cursor < expectedCursor ||
        page.events.some((event, index) => event.sequence !== expectedCursor + index + 1) ||
        page.cursor !== (page.events.at(-1)?.sequence ?? expectedCursor)
      )
        throw new Error('Página de sincronização incompleta')
      for (const entry of page.items) {
        if (entry.sequence > page.cursor || entry.sequence <= expectedCursor)
          throw new Error('Revisão fora da página')
        const { sequence, ...item } = entry
        this.db
          .prepare(
            'INSERT INTO items(id,project_id,payload,sequence) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,sequence=excluded.sequence WHERE excluded.project_id=items.project_id AND excluded.sequence>=items.sequence',
          )
          .run(item.id, projectId, json(item), sequence)
      }
      this.db
        .prepare('UPDATE projects SET cursor=?,payload=? WHERE id=?')
        .run(
          page.cursor,
          json({ ...project, permissions: page.permissions, sequence: page.cursor }),
          projectId,
        )
    })
  }
  items(projectId: string) {
    this.requireProject(projectId)
    return this.db
      .prepare('SELECT payload FROM items WHERE project_id=? ORDER BY id')
      .all(projectId)
      .map((row) =>
        itemSchema.parse(JSON.parse(z.object({ payload: z.string() }).parse(row).payload)),
      )
  }
  itemProjection(projectId: string, knownVersion: number | null): ItemProjection {
    z.number().int().nonnegative().safe().nullable().parse(knownVersion)
    return this.transaction(() => {
      this.requireProject(projectId)
      const version = z
        .object({ items_version: z.number().int().nonnegative().safe() })
        .parse(
          this.db.prepare('SELECT items_version FROM projects WHERE id=?').get(projectId),
        ).items_version
      if (knownVersion === null || knownVersion > version)
        return { projectId, version, reset: true, items: this.items(projectId), removed: [] }
      const items: ItemProjection['items'] = [],
        removed: string[] = []
      const rows = this.db
        .prepare(`
        SELECT c.item_id,c.deleted,i.payload FROM item_changes c
        LEFT JOIN items i ON i.id=c.item_id AND i.project_id=c.project_id
        WHERE c.project_id=? AND c.version>? ORDER BY c.item_id
      `)
        .all(projectId, knownVersion)
      for (const raw of rows) {
        const row = z
          .object({
            item_id: z.string().uuid(),
            deleted: z.number(),
            payload: z.string().nullable(),
          })
          .parse(raw)
        if (row.deleted === 1) removed.push(row.item_id)
        else {
          if (row.payload === null)
            throw new Error('A projeção local perdeu um item; preserve o cache para diagnóstico')
          items.push(itemSchema.parse(JSON.parse(row.payload)))
        }
      }
      return { projectId, version, reset: false, items, removed }
    })
  }
  enqueue(raw: unknown) {
    const input = enqueueSchema.parse(raw),
      op = input.operation
    return this.transaction(() => {
      const project = this.requireProject(op.projectId)
      if (!project.permissions.includes('edit'))
        throw new Error('Esta conta não pode editar o projeto')
      if (
        this.pendingBatches(op.projectId).some((batch) =>
          batch.operation.changes.some((change) => change.entityId === op.entityId),
        )
      )
        throw new Error('Aguarde a sincronização da alteração conjunta desta peça')
      const existing = this.db
        .prepare('SELECT * FROM outbox WHERE operation_id=?')
        .get(op.operationId)
      if (existing) {
        const stored = pending(existing)
        if (
          z.object({ requested_payload: z.string() }).parse(existing).requested_payload !==
            canonicalJson(op) ||
          stored.dependsOnOperationId !== input.dependsOnOperationId
        )
          throw new Error('Identificador de operação reutilizado')
        return stored
      }
      const head = this.db
        .prepare(
          "SELECT * FROM outbox WHERE project_id=? AND entity_id=? AND state<>'confirmed' ORDER BY rowid DESC LIMIT 1",
        )
        .get(op.projectId, op.entityId)
      if (head && pending(head).operation.operationId !== input.dependsOnOperationId)
        throw new Error('O rascunho local mudou. Reabra a versão atual antes de salvar.')
      if (input.dependsOnOperationId) {
        const parent = this.db
          .prepare('SELECT * FROM outbox WHERE operation_id=?')
          .get(input.dependsOnOperationId)
        if (!parent) throw new Error('Rascunho anterior ausente')
        const dependency = pending(parent)
        if (
          dependency.operation.entityId !== op.entityId ||
          dependency.operation.projectId !== op.projectId
        )
          throw new Error('Dependência de outra peça')
      }
      this.db
        .prepare(
          "INSERT INTO outbox(operation_id,project_id,entity_id,payload,requested_payload,state,dependency_id,created_at) VALUES(?,?,?,?,?,'local',?,?)",
        )
        .run(
          op.operationId,
          op.projectId,
          op.entityId,
          json(op),
          canonicalJson(op),
          input.dependsOnOperationId,
          new Date().toISOString(),
        )
      return pending(
        this.db.prepare('SELECT * FROM outbox WHERE operation_id=?').get(op.operationId),
      )
    })
  }
  pending(projectId: string) {
    return this.db
      .prepare(
        "SELECT * FROM outbox WHERE project_id=? AND state<>'confirmed' AND operation_id NOT IN (SELECT operation_id FROM resolved_drafts) ORDER BY rowid",
      )
      .all(projectId)
      .map(pending)
  }
  summary() {
    return z
      .object({ pending: z.number(), inaccessible: z.number() })
      .parse(
        this.db
          .prepare(
            "SELECT count(*) AS pending,coalesce(sum(CASE WHEN p.accessible=0 THEN 1 ELSE 0 END),0) AS inaccessible FROM (SELECT operation_id,project_id,state FROM outbox UNION ALL SELECT operation_id,project_id,state FROM batches UNION ALL SELECT operation_id,project_id,state FROM cancellations) o JOIN projects p ON p.id=o.project_id WHERE o.state<>'confirmed' AND o.operation_id NOT IN (SELECT operation_id FROM resolved_drafts)",
          )
          .get(),
      )
  }
  stageCancellation(projectId: string, runId: string, operationId: string) {
    z.string().uuid().parse(runId)
    z.string().uuid().parse(operationId)
    this.requireProject(projectId)
    this.db
      .prepare(
        "INSERT OR IGNORE INTO cancellations(run_id,project_id,operation_id,state) VALUES(?,?,?,'pending')",
      )
      .run(runId, projectId, operationId)
    const value = this.cancellation(runId)
    if (!value || value.projectId !== projectId)
      throw new Error('Cancelamento pertence a outro projeto')
    return value
  }
  cancellation(runId: string) {
    const row = this.db
      .prepare(
        'SELECT project_id AS projectId,run_id AS runId,operation_id AS operationId,state,error FROM cancellations WHERE run_id=?',
      )
      .get(runId)
    return row ? cancellationSchema.parse(row) : null
  }
  pendingCancellations(projectId: string) {
    return this.db
      .prepare(
        "SELECT project_id AS projectId,run_id AS runId,operation_id AS operationId,state,error FROM cancellations WHERE project_id=? AND state='pending' ORDER BY rowid LIMIT 100",
      )
      .all(projectId)
      .map((row) => cancellationSchema.parse(row))
  }
  settleCancellation(runId: string, state: 'confirmed' | 'blocked', error: string | null = null) {
    this.db
      .prepare('UPDATE cancellations SET state=?,error=? WHERE run_id=?')
      .run(state, error, runId)
  }
  enqueueBatch(raw: unknown) {
    const input = batchOperationSchema.parse(raw)
    return this.transaction(() => {
      const project = this.requireProject(input.projectId)
      if (!project.permissions.includes('edit'))
        throw new Error('Esta conta não pode editar o projeto')
      const existing = this.db
        .prepare('SELECT * FROM batches WHERE operation_id=?')
        .get(input.operationId)
      if (existing) {
        const saved = pendingBatch(existing)
        if (canonicalJson(saved.operation) !== canonicalJson(input))
          throw new Error('Identificador de alteração conjunta reutilizado')
        return saved
      }
      const touched = new Set(input.changes.map((change) => change.entityId))
      if (
        this.pending(input.projectId).some((entry) => touched.has(entry.operation.entityId)) ||
        this.pendingBatches(input.projectId).some((entry) =>
          entry.operation.changes.some((change) => touched.has(change.entityId)),
        )
      )
        throw new Error(
          'Sincronize ou resolva os rascunhos anteriores destas peças antes de salvar em conjunto',
        )
      this.db
        .prepare(
          "INSERT INTO batches(operation_id,project_id,payload,state,created_at) VALUES(?,?,?,'local',?)",
        )
        .run(input.operationId, input.projectId, json(input), new Date().toISOString())
      return pendingBatch(
        this.db.prepare('SELECT * FROM batches WHERE operation_id=?').get(input.operationId),
      )
    })
  }
  pendingBatches(projectId: string) {
    return this.db
      .prepare(
        "SELECT * FROM batches WHERE project_id=? AND state<>'confirmed' AND operation_id NOT IN (SELECT operation_id FROM resolved_drafts) ORDER BY rowid",
      )
      .all(projectId)
      .map(pendingBatch)
  }
  resolvedDrafts(projectId: string) {
    this.requireProject(projectId)
    return this.db
      .prepare(`SELECT o.payload,r.resolved_at,r.replacement_id FROM resolved_drafts r
      JOIN (SELECT operation_id,payload FROM outbox UNION ALL SELECT operation_id,payload FROM batches) o
      ON o.operation_id=r.operation_id WHERE r.project_id=? ORDER BY r.resolved_at DESC`)
      .all(projectId)
      .map((row) => {
        const value = z
          .object({
            payload: z.string(),
            resolved_at: z.string(),
            replacement_id: z.string().nullable(),
          })
          .parse(row)
        return resolvedDraftSchema.parse({
          operation: JSON.parse(value.payload),
          resolvedAt: value.resolved_at,
          replacementId: value.replacement_id,
        })
      })
  }
  resolveDrafts(raw: unknown) {
    const input = draftResolutionSchema.parse(raw)
    this.transaction(() => {
      const project = this.requireProject(input.projectId)
      if (!project.permissions.includes('edit'))
        throw new Error('Sem permissão para resolver rascunhos')
      const pendingEntries = [
        ...this.pending(input.projectId),
        ...this.pendingBatches(input.projectId),
      ]
      const selected = pendingEntries.filter((entry) =>
        input.operationIds.includes(entry.operation.operationId),
      )
      if (
        selected.length !== input.operationIds.length ||
        selected.some((entry) => !['conflict', 'blocked'].includes(entry.state))
      )
        throw new Error('O rascunho mudou; atualize antes de resolver')
      const replacement = input.replacement
      const touched = new Set(
        selected.flatMap((entry) =>
          'changes' in entry.operation
            ? entry.operation.changes.map((change) => change.entityId)
            : [entry.operation.entityId],
        ),
      )
      if (replacement?.changes.some((change) => !touched.has(change.entityId)))
        throw new Error('A resolução contém peças não selecionadas')
      if (
        pendingEntries.some(
          (entry) =>
            !input.operationIds.includes(entry.operation.operationId) &&
            ('changes' in entry.operation
              ? entry.operation.changes.some((change) => touched.has(change.entityId))
              : touched.has(entry.operation.entityId)),
        )
      )
        throw new Error('Inclua os rascunhos dependentes na mesma resolução')
      for (const id of input.operationIds)
        this.db
          .prepare(
            'INSERT INTO resolved_drafts(operation_id,project_id,replacement_id,resolved_at) VALUES(?,?,?,?)',
          )
          .run(id, input.projectId, replacement?.operationId ?? null, new Date().toISOString())
      if (replacement)
        this.db
          .prepare(
            "INSERT INTO batches(operation_id,project_id,payload,state,created_at) VALUES(?,?,?,'local',?)",
          )
          .run(
            replacement.operationId,
            input.projectId,
            json(replacement),
            new Date().toISOString(),
          )
    })
  }
  nextBatch(projectId: string) {
    return this.transaction(() => {
      this.requireProject(projectId)
      const row = this.db
        .prepare(
          "SELECT * FROM batches WHERE project_id=? AND state='local' ORDER BY rowid LIMIT 1",
        )
        .get(projectId)
      if (!row) return null
      const entry = pendingBatch(row)
      this.db
        .prepare("UPDATE batches SET state='sending' WHERE operation_id=?")
        .run(entry.operation.operationId)
      return entry.operation
    })
  }
  settleBatch(operationId: string, raw: unknown) {
    const result = batchResultSchema.parse(raw)
    this.transaction(() => {
      const entry = pendingBatch(
        this.db.prepare('SELECT * FROM batches WHERE operation_id=?').get(operationId),
      )
      if (
        result.operationId !== operationId ||
        (entry.result && canonicalJson(entry.result) !== canonicalJson(result))
      )
        throw new Error('Recibo conjunto divergente')
      if (result.status === 'applied') {
        if (
          result.items.length !== entry.operation.changes.length ||
          new Set(result.items.map((item) => item.id)).size !== result.items.length
        )
          throw new Error('Recibo conjunto incompleto')
        for (const item of result.items) {
          if (
            item.projectId !== entry.operation.projectId ||
            !entry.operation.changes.some((change) => change.entityId === item.id)
          )
            throw new Error('Recibo de outra peça')
          this.db
            .prepare(
              'INSERT INTO items(id,project_id,payload,sequence) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,sequence=excluded.sequence WHERE excluded.project_id=items.project_id AND excluded.sequence>=items.sequence',
            )
            .run(item.id, item.projectId, json(item), result.cursor)
        }
      }
      this.db
        .prepare('UPDATE batches SET state=?,result=?,error=NULL WHERE operation_id=?')
        .run(result.status === 'applied' ? 'confirmed' : 'conflict', json(result), operationId)
    })
  }
  failBatch(operationId: string, message: string, retryable: boolean) {
    this.db
      .prepare("UPDATE batches SET state=?,error=? WHERE operation_id=? AND state='sending'")
      .run(retryable ? 'local' : 'blocked', message.slice(0, 1000), operationId)
  }
  stageTransfer(raw: unknown) {
    const input = uploadStartSchema.parse(raw)
    this.requireProject(input.manifest.projectId)
    const existing = this.db
      .prepare('SELECT payload FROM transfers WHERE asset_id=?')
      .get(input.manifest.id)
    if (existing) {
      const saved = uploadStartSchema.parse(
        JSON.parse(z.object({ payload: z.string() }).parse(existing).payload),
      )
      if (canonicalJson(saved.manifest) !== canonicalJson(input.manifest))
        throw new Error('O manifesto local do arquivo mudou')
      return saved
    }
    this.db
      .prepare("INSERT INTO transfers(asset_id,project_id,payload,state) VALUES(?,?,?,'local')")
      .run(input.manifest.id, input.manifest.projectId, json(input))
    return input
  }
  transfers(projectId: string) {
    this.requireProject(projectId)
    return this.db
      .prepare('SELECT * FROM transfers WHERE project_id=? ORDER BY rowid')
      .all(projectId)
      .map((row) => {
        const value = z
          .object({
            payload: z.string(),
            state: z.enum(['local', 'uploading', 'verifying', 'confirmed', 'failed']),
            error: z.string().nullable(),
            uploaded_bytes: z.number(),
          })
          .parse(row)
        return {
          input: uploadStartSchema.parse(JSON.parse(value.payload)),
          state: value.state,
          error: value.error,
          uploadedBytes: value.uploaded_bytes,
        }
      })
  }
  transferProgress(
    assetId: string,
    state: 'local' | 'uploading' | 'verifying' | 'confirmed' | 'failed',
    uploadedBytes: number,
    error: string | null = null,
  ) {
    this.db
      .prepare('UPDATE transfers SET state=?,uploaded_bytes=?,error=? WHERE asset_id=?')
      .run(state, uploadedBytes, error?.slice(0, 1000) ?? null, assetId)
  }
  execution(runId: string): unknown {
    const row = this.db.prepare('SELECT payload FROM executions WHERE run_id=?').get(runId)
    return row ? JSON.parse(z.object({ payload: z.string() }).parse(row).payload) : null
  }
  protectedAssets(projectId: string, ids: string[]) {
    this.requireProject(projectId)
    const payloads = [
      ...this.db
        .prepare("SELECT payload FROM outbox WHERE project_id=? AND state<>'confirmed'")
        .all(projectId),
      ...this.db
        .prepare("SELECT payload FROM batches WHERE project_id=? AND state<>'confirmed'")
        .all(projectId),
      ...this.db
        .prepare("SELECT payload FROM transfers WHERE project_id=? AND state<>'confirmed'")
        .all(projectId),
      ...this.db
        .prepare('SELECT payload FROM executions WHERE project_id=?')
        .all(projectId)
        .filter((row) => {
          const stored = JSON.parse(z.object({ payload: z.string() }).parse(row).payload)
          return z.object({ stage: z.string() }).parse(stored).stage !== 'confirmed'
        }),
    ].map((row) => z.object({ payload: z.string() }).parse(row).payload)
    // Conservative exact UUID match also retains files cited inside an unfinished prompt.
    return new Set(ids.filter((id) => payloads.some((payload) => payload.includes(id))))
  }
  saveExecution(projectId: string, runId: string, payload: unknown) {
    this.requireProject(projectId)
    this.db
      .prepare(
        'INSERT INTO executions(run_id,project_id,payload) VALUES(?,?,?) ON CONFLICT(run_id) DO UPDATE SET payload=excluded.payload WHERE executions.project_id=excluded.project_id',
      )
      .run(runId, projectId, json(payload))
  }
  next(projectId: string): EditorialOperation | null {
    return this.transaction(() => {
      this.requireProject(projectId)
      const rows = this.db
        .prepare("SELECT * FROM outbox WHERE project_id=? AND state='local' ORDER BY rowid")
        .all(projectId)
      for (const row of rows) {
        const entry = pending(row)
        let operation = entry.operation
        if (entry.dependsOnOperationId) {
          const parent = pending(
            this.db
              .prepare('SELECT * FROM outbox WHERE operation_id=?')
              .get(entry.dependsOnOperationId),
          )
          if (parent.state === 'conflict' || parent.state === 'blocked') {
            this.db
              .prepare("UPDATE outbox SET state='blocked',error=? WHERE operation_id=?")
              .run(
                'Resolva o rascunho anterior antes de enviar esta alteração',
                operation.operationId,
              )
            continue
          }
          if (parent.result?.status !== 'applied') continue
          operation = operationSchema.parse({
            ...operation,
            baseRevisionId: parent.result.revisionId,
          })
        }
        this.db
          .prepare("UPDATE outbox SET state='sending',payload=?,error=NULL WHERE operation_id=?")
          .run(json(operation), operation.operationId)
        return operation
      }
      return null
    })
  }
  settle(operationId: string, raw: unknown) {
    const result = operationResultSchema.parse(raw)
    this.transaction(() => {
      const entry = pending(
        this.db.prepare('SELECT * FROM outbox WHERE operation_id=?').get(operationId),
      )
      if (result.operationId !== operationId || result.entityId !== entry.operation.entityId)
        throw new Error('Recibo de outra operação')
      if (entry.result && canonicalJson(entry.result) !== canonicalJson(result))
        throw new Error('O servidor devolveu recibos divergentes')
      this.db
        .prepare('UPDATE outbox SET state=?,result=?,error=NULL WHERE operation_id=?')
        .run(result.status === 'applied' ? 'confirmed' : 'conflict', json(result), operationId)
      if (result.status === 'applied') {
        if (
          result.item.id !== entry.operation.entityId ||
          result.item.projectId !== entry.operation.projectId ||
          result.item.revisionId !== result.revisionId
        )
          throw new Error('Revisão confirmada pertence a outra peça')
        this.db
          .prepare(
            'INSERT INTO items(id,project_id,payload,sequence) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,sequence=excluded.sequence WHERE excluded.project_id=items.project_id AND excluded.sequence>=items.sequence',
          )
          .run(result.item.id, result.item.projectId, json(result.item), result.sequence)
      }
      // Do not advance the pull cursor here: another person's earlier commit could be skipped.
    })
  }
  fail(operationId: string, message: string, retryable: boolean) {
    this.db
      .prepare('UPDATE outbox SET state=?,error=? WHERE operation_id=? AND state=?')
      .run(retryable ? 'local' : 'blocked', message.slice(0, 1000), operationId, 'sending')
  }
  receipt(operationId: string): OperationResult | null {
    const row = this.db.prepare('SELECT result FROM outbox WHERE operation_id=?').get(operationId)
    if (!row) return null
    const result = z.object({ result: z.string().nullable() }).parse(row).result
    return result ? operationResultSchema.parse(JSON.parse(result)) : null
  }
}
