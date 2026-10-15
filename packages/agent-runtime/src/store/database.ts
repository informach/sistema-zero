import { Database } from 'bun:sqlite'
import { randomUUID } from 'node:crypto'
import {
  effectSchema,
  memorySchema,
  questionSchema,
  type RuntimeEvent,
  runSchema,
  sessionSchema,
  terminalStates,
  transition,
} from '@sistemazero/agent-core'
import { z } from 'zod'
import { ArtifactJournal } from './artifact-journal'
import type { StoreCommand } from './schema'

const budgetSchema = z.object({
  id: z.string(),
  runId: z.string(),
  rootId: z.string().optional(),
  amount: z.number(),
  cost: z.number().optional(),
  state: z.enum(['reserved', 'settled', 'unknown']),
  generationId: z.string().optional(),
})

export class Journal {
  readonly db: Database
  private artifacts: ArtifactJournal
  constructor(file: string) {
    this.db = new Database(file, { strict: true })
    this.artifacts = new ArtifactJournal(this.db)
    this.db.run(
      'PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=3000',
    )
    const version =
      this.db.query<{ user_version: number }, []>('PRAGMA user_version').get()?.user_version ?? 0
    if (version > 5) {
      this.db.close()
      throw new Error('Database is newer than this application')
    }
    if (version > 0 && version < 5)
      this.db.query('VACUUM INTO ?').run(`${file}.v${version}.${Date.now()}.backup`)
    this.db.transaction(() => {
      this.db.run(`CREATE TABLE IF NOT EXISTS documents(namespace TEXT NOT NULL,id TEXT NOT NULL,value TEXT NOT NULL,PRIMARY KEY(namespace,id));
        CREATE TABLE IF NOT EXISTS events(sequence INTEGER PRIMARY KEY AUTOINCREMENT,id TEXT UNIQUE NOT NULL,run_id TEXT NOT NULL,type TEXT NOT NULL,payload TEXT NOT NULL,occurred_at TEXT NOT NULL);
        CREATE INDEX IF NOT EXISTS events_run_sequence ON events(run_id,sequence);
        CREATE TABLE IF NOT EXISTS requests(id TEXT PRIMARY KEY,digest TEXT NOT NULL,run_id TEXT NOT NULL);
        CREATE VIRTUAL TABLE IF NOT EXISTS memory_search USING fts5(id UNINDEXED,body);
        CREATE INDEX IF NOT EXISTS effects_uncertain ON documents(json_extract(value,'$.state'),coalesce(json_extract(value,'$.operationDigest'),json_extract(value,'$.digest'))) WHERE namespace='effects';
        CREATE INDEX IF NOT EXISTS run_root ON documents(json_extract(value,'$.rootId')) WHERE namespace='runs';
        CREATE INDEX IF NOT EXISTS effect_run_state ON documents(json_extract(value,'$.runId'),json_extract(value,'$.state')) WHERE namespace='effects';
        CREATE INDEX IF NOT EXISTS run_session ON documents(json_extract(value,'$.sessionId')) WHERE namespace='runs';
        CREATE INDEX IF NOT EXISTS session_workspace ON documents(json_extract(value,'$.workspace')) WHERE namespace='sessions';
        CREATE INDEX IF NOT EXISTS question_run ON documents(json_extract(value,'$.runId')) WHERE namespace='questions';
        CREATE INDEX IF NOT EXISTS document_namespace ON documents(namespace);
        CREATE INDEX IF NOT EXISTS budget_root ON documents(coalesce(json_extract(value,'$.rootId'),json_extract(value,'$.runId'))) WHERE namespace='budgets';
        PRAGMA user_version=5;`)
      this.artifacts.initialize()
    })()
  }
  get(namespace: string, id: string): unknown {
    const row = this.db
      .query<{ value: string }, [string, string]>(
        'SELECT value FROM documents WHERE namespace=? AND id=?',
      )
      .get(namespace, id)
    return row ? JSON.parse(row.value) : null
  }
  put(namespace: string, id: string, value: unknown) {
    this.db
      .query(
        'INSERT INTO documents(namespace,id,value) VALUES(?,?,?) ON CONFLICT(namespace,id) DO UPDATE SET value=excluded.value',
      )
      .run(namespace, id, JSON.stringify(value))
  }
  list(namespace: string, limit = 100, offset = 0): unknown[] {
    return this.db
      .query<{ value: string }, [string, number, number]>(
        'SELECT value FROM documents WHERE namespace=? ORDER BY rowid DESC LIMIT ? OFFSET ?',
      )
      .all(namespace, limit, offset)
      .map((row) => JSON.parse(row.value))
  }
  append(runId: string, type: string, payload: unknown): RuntimeEvent {
    if (type === 'run.created' || type === 'run.state') {
      const run = runSchema.parse(payload)
      payload = {
        ...run,
        input: run.input.slice(0, 4000),
        allowedTools: undefined,
        error: run.error?.slice(0, 4000),
        task: run.task.kind === 'tool' ? { ...run.task, arguments: {} } : run.task,
      }
    }
    const event = {
      schemaVersion: 1 as const,
      id: randomUUID(),
      runId,
      type,
      payload,
      occurredAt: new Date().toISOString(),
      sequence: 0,
    }
    const size = Buffer.byteLength(JSON.stringify(payload))
    if (size > 128000) throw new Error('Event payload exceeds 128000 bytes; store an artifact')
    const inserted = this.db
      .query('INSERT INTO events(id,run_id,type,payload,occurred_at) VALUES(?,?,?,?,?)')
      .run(event.id, runId, type, JSON.stringify(payload), event.occurredAt)
    event.sequence = Number(inserted.lastInsertRowid)
    return event
  }
  execute(command: StoreCommand): unknown {
    return this.db.transaction(() => this.apply(command))()
  }
  private apply(command: StoreCommand): unknown {
    switch (command.op) {
      case 'artifact.reserve':
      case 'artifact.commit':
      case 'artifact.read':
      case 'artifact.get':
      case 'artifact.pin':
      case 'artifact.usage':
      case 'artifact.gc':
      case 'artifact.deleted':
        return this.artifacts.execute(command)
      case 'memory.page':
        return this.db
          .query<{ value: string }, [string, number]>(
            "SELECT value FROM documents WHERE namespace='memory' AND (json_extract(value,'$.workspace')=? OR json_extract(value,'$.scope')='profile') ORDER BY id LIMIT 50 OFFSET ?",
          )
          .all(command.workspace, command.offset)
          .map((row) => memorySchema.parse(JSON.parse(row.value)))
      case 'memory.update': {
        const previous = memorySchema.parse(this.get('memory', command.id))
        if (
          previous.workspace !== command.workspace ||
          previous.updatedAt !== command.expectedUpdatedAt ||
          previous.deleted
        )
          throw new Error('Memory changed, was removed or belongs to another workspace')
        return this.apply({
          op: 'memory.put',
          value: {
            ...previous,
            body: command.body,
            evidence: command.evidence,
            source: 'user',
            updatedAt: new Date().toISOString(),
          },
        })
      }
      case 'memory.put': {
        this.put('memory', command.value.id, command.value)
        this.db.query('DELETE FROM memory_search WHERE id=?').run(command.value.id)
        if (!command.value.deleted)
          this.db
            .query('INSERT INTO memory_search(id,body) VALUES(?,?)')
            .run(command.value.id, command.value.body)
        return command.value
      }
      case 'memory.search': {
        const terms = command.query.match(/[\p{L}\p{N}_-]+/gu)?.slice(0, 12) ?? []
        const match = terms.map((term) => `"${term}"`).join(' AND ')
        const search = match
          ? 'AND d.id IN (SELECT id FROM memory_search WHERE memory_search MATCH ?5)'
          : ''
        const sql = `SELECT d.value FROM documents d WHERE d.namespace='memory' AND json_extract(d.value,'$.deleted')=0 AND (json_extract(d.value,'$.expiresAt') IS NULL OR json_extract(d.value,'$.expiresAt')>?4) AND (json_extract(d.value,'$.scope')='profile' OR (json_extract(d.value,'$.workspace')=?1 AND (json_extract(d.value,'$.scope')='project' OR json_extract(d.value,'$.sessionId')=?2))) ${search} ORDER BY json_extract(d.value,'$.updatedAt') DESC LIMIT 50 OFFSET ?3`
        const args = [
          command.workspace,
          command.sessionId ?? null,
          command.offset,
          new Date().toISOString(),
        ]
        const rows = match
          ? this.db.query<{ value: string }, (string | number | null)[]>(sql).all(...args, match)
          : this.db.query<{ value: string }, (string | number | null)[]>(sql).all(...args)
        return rows.map((row) => memorySchema.parse(JSON.parse(row.value)))
      }
      case 'memory.delete': {
        const value = memorySchema.parse(this.get('memory', command.id))
        if (value.workspace !== command.workspace)
          throw new Error('Memory belongs to another workspace')
        return this.apply({
          op: 'memory.put',
          value: { ...value, deleted: true, updatedAt: new Date().toISOString() },
        })
      }
      case 'session.put':
        this.put('sessions', command.value.id, command.value)
        return command.value
      case 'session.fork': {
        const source = sessionSchema.parse(this.get('sessions', command.context.sourceSessionId))
        if (
          source.workspace !== command.value.workspace ||
          source.workspace !== command.context.workspace ||
          this.get('sessions', command.value.id)
        )
          throw new Error('Invalid session fork identity')
        this.put('sessions', command.value.id, command.value)
        this.put('session-context', command.value.id, command.context)
        return command.value
      }
      case 'history.page': {
        const rows = this.db
          .prepare<{ cursor: number; value: string }, (string | number | null)[]>(
            "SELECT rowid AS cursor,value FROM documents WHERE namespace=?1 AND (?2 IS NULL OR rowid<?2) AND (?3 IS NULL OR json_extract(value,'$.sessionId')=?3) AND (?4 IS NULL OR json_extract(value,'$.workspace')=?4) ORDER BY rowid DESC LIMIT ?5",
          )
          .iterate(
            command.namespace,
            command.before ?? null,
            command.sessionId ?? null,
            command.workspace ?? null,
            command.limit + 1,
          )
        const values: unknown[] = []
        let bytes = 0,
          cursor: number | undefined,
          more = false
        for (const row of rows) {
          const size = Buffer.byteLength(row.value)
          if (values.length >= command.limit || (values.length > 0 && bytes + size > 480000)) {
            more = true
            break
          }
          bytes += size
          cursor = row.cursor
          values.push(JSON.parse(row.value))
        }
        return { values, ...(more ? { nextCursor: cursor } : {}) }
      }
      case 'session.snapshot': {
        const family = `WITH family AS (
          SELECT rowid,id,value FROM documents WHERE namespace='runs' AND json_extract(value,'$.sessionId')=?1
          UNION SELECT child.rowid,child.id,child.value FROM documents root JOIN documents child
          ON child.namespace='runs' AND json_extract(child.value,'$.rootId')=root.id
          WHERE root.namespace='runs' AND json_extract(root.value,'$.sessionId')=?1
        ) `
        const rows = this.db
          .query<{ value: string }, [string]>(
            family +
              `SELECT json_remove(json_set(value,'$.input',substr(json_extract(value,'$.input'),1,256),'$.task',json_object('kind',coalesce(json_extract(value,'$.task.kind'),'agent'))),'$.allowedTools') AS value FROM family ORDER BY json_extract(value,'$.state') NOT IN ('succeeded','failed','canceled','interrupted') DESC,rowid DESC LIMIT 100`,
          )
          .all(command.sessionId)
        const runs = rows.map((row) => JSON.parse(row.value))
        const questions = this.db
          .query<{ value: string }, [string]>(
            family +
              `SELECT q.value FROM family r JOIN documents q ON q.namespace='questions' AND json_extract(q.value,'$.runId')=r.id WHERE json_extract(q.value,'$.answer') IS NULL AND json_extract(r.value,'$.state') IN ('waiting_input','waiting_approval') ORDER BY q.rowid LIMIT 10`,
          )
          .all(command.sessionId)
          .map((row) => questionSchema.parse(JSON.parse(row.value)))
        return { runs, questions }
      }
      case 'session.get':
        return this.get('sessions', command.id)
      case 'run.cursor':
        return (
          this.db
            .query<{ cursor: number }, [string]>(
              "SELECT rowid AS cursor FROM documents WHERE namespace='runs' AND id=?",
            )
            .get(command.id)?.cursor ?? null
        )
      case 'session.list':
        return this.list('sessions', 100, command.offset).map((value) => sessionSchema.parse(value))
      case 'run.put': {
        const previous = this.db
          .query<{ digest: string; run_id: string }, [string]>(
            'SELECT digest,run_id FROM requests WHERE id=?',
          )
          .get(command.requestId)
        if (previous) {
          if (previous.digest !== command.digest)
            throw new Error('Request ID reused with different arguments')
          return this.get('runs', previous.run_id)
        }
        if (!this.get('sessions', command.value.sessionId)) throw new Error('Session not found')
        if (this.get('runs', command.value.id)) throw new Error('Run identity already exists')
        if (command.value.parentId) {
          const parent = runSchema.parse(this.get('runs', command.value.parentId))
          const rootId = parent.rootId ?? parent.id
          const count =
            this.db
              .query<{ total: number }, [string]>(
                "SELECT count(*) AS total FROM documents WHERE namespace='runs' AND json_extract(value,'$.rootId')=? AND coalesce(json_extract(value,'$.task.kind'),'agent')='agent'",
              )
              .get(rootId)?.total ?? 0
          if ((command.value.task.kind === 'agent' && count >= 6) || parent.depth >= 2)
            throw new Error('Task family limit exceeded (six descendants, depth two)')
          if (parent.mode === 'plan' && command.value.mode !== 'plan')
            throw new Error('Child cannot broaden parent mode')
          const requested = command.value.allowedTools
          command.value.allowedTools = parent.allowedTools
            ? parent.allowedTools.filter((name) => !requested || requested.includes(name))
            : requested
          command.value.rootId = rootId
          command.value.depth = parent.depth + 1
          command.value.maxCost = Math.min(command.value.maxCost, parent.maxCost)
          command.value.maxSteps = Math.min(command.value.maxSteps, parent.maxSteps)
        } else {
          command.value.rootId = undefined
          command.value.depth = 0
        }
        this.put('runs', command.value.id, command.value)
        this.db
          .query('INSERT INTO requests(id,digest,run_id) VALUES(?,?,?)')
          .run(command.requestId, command.digest, command.value.id)
        this.append(command.value.id, 'run.created', command.value)
        return command.value
      }
      case 'run.get':
        return this.get('runs', command.id)
      case 'run.list':
        return this.db
          .query<{ value: string }, [string | null]>(
            "SELECT value FROM documents WHERE namespace='runs' AND (?1 IS NULL OR json_extract(value,'$.sessionId')=?1) ORDER BY rowid DESC LIMIT 100",
          )
          .all(command.sessionId ?? null)
          .map((row) => runSchema.parse(JSON.parse(row.value)))
      case 'run.cancel': {
        const run = runSchema.parse(this.get('runs', command.id))
        if (terminalStates.has(run.state)) return run
        if (run.state !== 'canceling' && (command.active || run.state !== 'queued'))
          this.apply({ op: 'run.state', id: run.id, state: 'canceling', error: command.error })
        return command.active
          ? this.get('runs', run.id)
          : this.apply({ op: 'run.state', id: run.id, state: 'canceled', error: command.error })
      }
      case 'run.state': {
        const run = runSchema.parse(this.get('runs', command.id))
        if (run.state === command.state) return run
        transition(run.state, command.state)
        const value = {
          ...run,
          state: command.state,
          error: command.error,
          updatedAt: new Date().toISOString(),
        }
        this.put('runs', run.id, value)
        this.append(run.id, 'run.state', value)
        return value
      }
      case 'event.append':
        return this.append(command.runId, command.type, command.payload)
      case 'event.last': {
        const row = this.db
          .query<{ payload: string }, [string, string]>(
            'SELECT payload FROM events WHERE run_id=? AND type=? ORDER BY sequence DESC LIMIT 1',
          )
          .get(command.runId, command.type)
        return row ? JSON.parse(row.payload) : null
      }
      case 'event.tail': {
        const rows = this.db
          .prepare<
            { id: string; sequence: number; type: string; payload: string; occurred_at: string },
            [string, number | null, number]
          >(
            'SELECT id,sequence,type,payload,occurred_at FROM events WHERE run_id=?1 AND (?2 IS NULL OR sequence<?2) ORDER BY sequence DESC LIMIT ?3',
          )
          .iterate(command.runId, command.before ?? null, command.limit + 1)
        const events: RuntimeEvent[] = []
        let bytes = 0,
          more = false
        for (const row of rows) {
          const size = Buffer.byteLength(row.payload) + 256
          if (events.length >= command.limit || (events.length > 0 && bytes + size > 480000)) {
            more = true
            break
          }
          bytes += size
          events.push({
            schemaVersion: 1,
            id: row.id,
            sequence: row.sequence,
            type: row.type,
            payload: JSON.parse(row.payload),
            occurredAt: row.occurred_at,
            runId: command.runId,
          })
        }
        events.reverse()
        return { events, ...(more ? { previousCursor: events[0]?.sequence } : {}) }
      }
      case 'budget.reserve': {
        const previous = this.get('budgets', command.id)
        if (previous) {
          const item = budgetSchema.parse(previous)
          if (item.runId !== command.runId || item.amount !== command.amount)
            throw new Error('Budget reservation identity conflict')
          return item
        }
        const rawRun = this.get('runs', command.runId)
        const run = rawRun ? runSchema.parse(rawRun) : undefined
        const rootId = run?.rootId ?? command.runId
        const root = run?.rootId ? runSchema.parse(this.get('runs', run.rootId)) : run
        const rows = this.db
          .query<{ value: string }, [string]>(
            "SELECT value FROM documents WHERE namespace='budgets' AND coalesce(json_extract(value,'$.rootId'),json_extract(value,'$.runId'))=?",
          )
          .all(rootId)
          .map((row) => budgetSchema.parse(JSON.parse(row.value)))
        const spent = rows.reduce(
          (sum, row) => sum + (row.state === 'settled' ? (row.cost ?? row.amount) : row.amount),
          0,
        )
        if (spent + command.amount > Math.min(command.limit, root?.maxCost ?? command.limit))
          throw new Error('Task budget exhausted')
        const value = {
          id: command.id,
          runId: command.runId,
          rootId,
          amount: command.amount,
          state: 'reserved',
        }
        this.put('budgets', command.id, value)
        this.append(command.runId, 'budget.reserved', value)
        return value
      }
      case 'budget.settle': {
        const previous = budgetSchema.parse(this.get('budgets', command.id))
        if (previous.runId !== command.runId) throw new Error('Budget owner conflict')
        if (previous.generationId && command.generationId !== previous.generationId)
          throw new Error('Generation identity conflict')
        const value = {
          ...previous,
          cost: command.cost,
          generationId: command.generationId,
          state: command.cost === undefined ? 'unknown' : 'settled',
        }
        if (previous.state === 'settled' && previous.cost !== command.cost)
          throw new Error('Budget already settled differently')
        this.put('budgets', command.id, value)
        this.append(command.runId, 'budget.settled', value)
        return value
      }
      case 'budget.list':
        return this.db
          .query<{ value: string }, [string]>(
            "SELECT value FROM documents WHERE namespace='budgets' AND coalesce(json_extract(value,'$.rootId'),json_extract(value,'$.runId'))=?",
          )
          .all(command.runId)
          .map((row) => JSON.parse(row.value))
      case 'event.list': {
        const rows = this.db
          .prepare<
            {
              sequence: number
              id: string
              run_id: string
              type: string
              payload: string
              occurred_at: string
            },
            [string, number, number]
          >('SELECT * FROM events WHERE run_id=? AND sequence>? ORDER BY sequence LIMIT ?')
          .iterate(command.runId, command.after, command.limit)
        const result: RuntimeEvent[] = []
        let bytes = 0
        for (const row of rows) {
          const size = Buffer.byteLength(row.payload) + 256
          if (bytes + size > 480000 && result.length) break
          bytes += size
          result.push({
            schemaVersion: 1,
            id: row.id,
            runId: row.run_id,
            sequence: row.sequence,
            type: row.type,
            payload: JSON.parse(row.payload),
            occurredAt: row.occurred_at,
          })
        }
        return result
      }
      case 'question.put':
        this.put('questions', command.value.id, command.value)
        this.append(command.value.runId, 'question.created', command.value)
        return command.value
      case 'question.list':
        return this.db
          .query<{ value: string }, [string]>(
            "SELECT value FROM documents WHERE namespace='questions' AND json_extract(value,'$.runId')=? ORDER BY rowid",
          )
          .all(command.runId)
          .map((row) => questionSchema.parse(JSON.parse(row.value)))
      case 'question.answer': {
        const question = questionSchema.parse(this.get('questions', command.id))
        if (question.answer !== undefined) {
          if (question.answer !== command.answer)
            throw new Error('Question already answered differently')
          return question
        }
        const run = runSchema.parse(this.get('runs', question.runId))
        if (run.state !== 'waiting_input' && run.state !== 'waiting_approval')
          throw new Error('Run is not waiting for this answer')
        const value = { ...question, answer: command.answer }
        this.put('questions', question.id, value)
        this.append(question.runId, 'question.answered', value)
        return value
      }
      case 'effect.put': {
        const previous = this.get('effects', command.value.id)
        if (previous) {
          const effect = effectSchema.parse(previous)
          if (
            effect.digest !== command.value.digest ||
            effect.runId !== command.value.runId ||
            effect.operationDigest !== command.value.operationDigest ||
            effect.capability !== command.value.capability
          )
            throw new Error('Effect identity conflict')
          if (effect.state === command.value.state) {
            if (JSON.stringify(effect) !== JSON.stringify(command.value))
              throw new Error('Effect result conflict')
            return effect
          }
          const allowed: Record<string, string[]> = {
            prepared: ['dispatched', 'failed'],
            dispatched: ['confirmed', 'failed', 'unknown'],
            confirmed: [],
            failed: [],
            unknown: [],
          }
          if (!allowed[effect.state]?.includes(command.value.state))
            throw new Error('Invalid effect transition')
        } else if (command.value.state !== 'prepared')
          throw new Error('Effect must be prepared before dispatch')
        this.put('effects', command.value.id, command.value)
        this.append(command.value.runId, 'effect.state', command.value)
        return command.value
      }
      case 'effect.get':
        return this.get('effects', command.id)
      case 'effect.pending': {
        const query =
          "FROM documents WHERE namespace='effects' AND json_extract(value,'$.runId')=? AND json_extract(value,'$.state') IN ('dispatched','unknown')"
        const count =
          this.db
            .query<{ count: number }, [string]>(`SELECT count(*) AS count ${query}`)
            .get(command.runId)?.count ?? 0
        const ids = this.db
          .query<{ id: string }, [string]>(`SELECT id ${query} ORDER BY id LIMIT 100`)
          .all(command.runId)
          .map((row) => row.id)
        return { count, ids }
      }
      case 'effect.uncertain': {
        const row = this.db
          .query<{ value: string }, [string]>(
            "SELECT value FROM documents WHERE namespace='effects' AND json_extract(value,'$.state')='unknown' AND coalesce(json_extract(value,'$.operationDigest'),json_extract(value,'$.digest'))=? LIMIT 1",
          )
          .get(command.operationDigest)
        return row ? effectSchema.parse(JSON.parse(row.value)) : null
      }
      case 'effect.reconcile': {
        const effect = effectSchema.parse(this.get('effects', command.id))
        if (effect.state !== 'unknown') throw new Error('Only uncertain effects can be reconciled')
        const value = effectSchema.parse({
          ...effect,
          state: command.resolution,
          outcome:
            command.resolution === 'confirmed'
              ? {
                  kind: 'ok',
                  value: { reconciledBy: 'user', evidence: command.evidence },
                  artifacts: [],
                }
              : {
                  kind: 'failed',
                  code: 'RECONCILED_NOT_APPLIED',
                  message: command.evidence,
                  retry: 'never',
                },
        })
        this.put('effects', value.id, value)
        this.append(effect.runId, 'effect.reconciled', {
          effect: value,
          evidence: command.evidence,
          actor: 'user',
        })
        return value
      }
      case 'document.batch':
        return command.documents.map((document) => this.apply({ op: 'document.put', ...document }))
      case 'document.guarded':
        for (const guard of command.guards) {
          const document = z
            .record(z.string(), z.unknown())
            .parse(this.get(guard.namespace, guard.id))
          if (document[guard.field] !== guard.equals)
            throw new Error('Document generation or state changed before commit')
        }
        return command.documents.map((document) => this.apply({ op: 'document.put', ...document }))
      case 'document.put':
        if (
          ['runs', 'sessions', 'effects', 'questions', 'budgets', 'memory'].includes(
            command.namespace,
          )
        )
          throw new Error('Protected document namespace')
        this.put(command.namespace, command.id, command.value)
        return command.value
      case 'document.get':
        return this.get(command.namespace, command.id)
      case 'document.list':
        return this.list(command.namespace)
      case 'document.page': {
        const rows = this.db
          .prepare<
            { id: string; value: string },
            [string, string, string | null, string | null, number]
          >(
            "SELECT id,value FROM documents WHERE namespace=?1 AND id>?2 AND (?3 IS NULL OR json_extract(value,'$.state') IN (SELECT value FROM json_each(?4))) ORDER BY id LIMIT ?5",
          )
          .iterate(
            command.namespace,
            command.after,
            command.states ? JSON.stringify(command.states) : null,
            command.states ? JSON.stringify(command.states) : null,
            command.limit + 1,
          )
        const values: unknown[] = []
        let bytes = 0,
          cursor: string | undefined,
          more = false
        for (const row of rows) {
          const size = Buffer.byteLength(row.value)
          if (size > 900000)
            throw new Error('Document exceeds page capacity; retrieve it by identity')
          if (values.length >= command.limit || (values.length > 0 && bytes + size > 480000)) {
            more = true
            break
          }
          bytes += size
          cursor = row.id
          values.push(JSON.parse(row.value))
        }
        return { values, ...(more ? { nextCursor: cursor } : {}) }
      }
      case 'recover': {
        this.db.run(
          "UPDATE documents SET value=json_set(value,'$.state','unknown') WHERE namespace='budgets' AND json_extract(value,'$.state')='reserved'",
        )
        const rows = this.db
          .query<{ value: string }, []>(
            "SELECT value FROM documents WHERE namespace='runs' AND json_extract(value,'$.state') NOT IN ('succeeded','failed','canceled','interrupted')",
          )
          .all()
        for (const row of rows) {
          const run = runSchema.parse(JSON.parse(row.value))
          this.apply({
            op: 'run.state',
            id: run.id,
            state: 'interrupted',
            error: 'Supervisor stopped; reconcile and start a new attempt',
          })
        }
        const effects = this.db
          .query<{ value: string }, []>(
            "SELECT value FROM documents WHERE namespace='effects' AND json_extract(value,'$.state')='dispatched'",
          )
          .all()
        for (const row of effects) {
          const effect = effectSchema.parse(JSON.parse(row.value))
          this.apply({
            op: 'effect.put',
            value: {
              ...effect,
              state: 'unknown',
              outcome: {
                kind: 'unknown',
                effectId: effect.id,
                reason: 'Supervisor stopped after dispatch',
              },
            },
          })
        }
        return { interrupted: rows.length, unknown: effects.length }
      }
      case 'close':
        return null
    }
  }
  close() {
    this.db.close()
  }
}
