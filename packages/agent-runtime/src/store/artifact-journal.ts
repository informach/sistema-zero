import type { Database } from 'bun:sqlite'
import { artifactSchema, runSchema } from '@sistemazero/agent-core'
import { type ArtifactCommand, artifactRecordSchema } from './artifact-schema'
export class ArtifactJournal {
  constructor(private db: Database) {}
  initialize() {
    this.db.run(`CREATE TABLE IF NOT EXISTS artifacts(id TEXT PRIMARY KEY,reference TEXT NOT NULL,state TEXT NOT NULL,pinned INTEGER NOT NULL,created_at INTEGER NOT NULL,used_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS artifact_owners(artifact_id TEXT NOT NULL,run_id TEXT NOT NULL,root_id TEXT NOT NULL,PRIMARY KEY(artifact_id,run_id));
      CREATE INDEX IF NOT EXISTS artifacts_retention ON artifacts(state,pinned,used_at);
      CREATE INDEX IF NOT EXISTS artifact_owner_root ON artifact_owners(root_id);`)
    this.db.run(`CREATE TABLE IF NOT EXISTS artifact_totals(id INTEGER PRIMARY KEY CHECK(id=1),bytes INTEGER NOT NULL,pinned_bytes INTEGER NOT NULL,count INTEGER NOT NULL);
      INSERT OR IGNORE INTO artifact_totals SELECT 1,coalesce(sum(CASE WHEN state!='deleted' THEN json_extract(reference,'$.bytes') ELSE 0 END),0),coalesce(sum(CASE WHEN state!='deleted' AND pinned THEN json_extract(reference,'$.bytes') ELSE 0 END),0),count(CASE WHEN state!='deleted' THEN 1 END) FROM artifacts;
      CREATE TRIGGER IF NOT EXISTS artifact_totals_insert AFTER INSERT ON artifacts BEGIN UPDATE artifact_totals SET bytes=bytes+CASE WHEN NEW.state!='deleted' THEN json_extract(NEW.reference,'$.bytes') ELSE 0 END,pinned_bytes=pinned_bytes+CASE WHEN NEW.state!='deleted' AND NEW.pinned THEN json_extract(NEW.reference,'$.bytes') ELSE 0 END,count=count+CASE WHEN NEW.state!='deleted' THEN 1 ELSE 0 END WHERE id=1; END;
      CREATE TRIGGER IF NOT EXISTS artifact_totals_update AFTER UPDATE ON artifacts BEGIN UPDATE artifact_totals SET bytes=bytes+CASE WHEN NEW.state!='deleted' THEN json_extract(NEW.reference,'$.bytes') ELSE 0 END-CASE WHEN OLD.state!='deleted' THEN json_extract(OLD.reference,'$.bytes') ELSE 0 END,pinned_bytes=pinned_bytes+CASE WHEN NEW.state!='deleted' AND NEW.pinned THEN json_extract(NEW.reference,'$.bytes') ELSE 0 END-CASE WHEN OLD.state!='deleted' AND OLD.pinned THEN json_extract(OLD.reference,'$.bytes') ELSE 0 END,count=count+CASE WHEN NEW.state!='deleted' THEN 1 ELSE 0 END-CASE WHEN OLD.state!='deleted' THEN 1 ELSE 0 END WHERE id=1; END;`)
  }
  private get(id: string) {
    const row = this.db
      .query<
        { reference: string; state: string; pinned: number; created_at: number; used_at: number },
        [string]
      >('SELECT * FROM artifacts WHERE id=?')
      .get(id)
    return row
      ? artifactRecordSchema.parse({
          reference: JSON.parse(row.reference),
          state: row.state,
          pinned: Boolean(row.pinned),
          createdAt: row.created_at,
          usedAt: row.used_at,
        })
      : null
  }
  private usage() {
    return this.db
      .query<{ bytes: number; pinnedBytes: number; count: number }, []>(
        'SELECT bytes,pinned_bytes AS pinnedBytes,count FROM artifact_totals WHERE id=1',
      )
      .get()
  }
  execute(command: ArtifactCommand): unknown {
    switch (command.op) {
      case 'artifact.get':
        return this.get(command.id)
      case 'artifact.usage':
        return this.usage()
      case 'artifact.reserve': {
        const ref = artifactSchema.parse(command.reference)
        if (!/^[a-f0-9]{64}$/.test(ref.id) || ref.sha256 !== ref.id || ref.bytes > 16_000_000)
          throw new Error('Invalid artifact reference')
        const previous = this.get(ref.id)
        if (
          previous &&
          (previous.reference.sha256 !== ref.sha256 || previous.reference.bytes !== ref.bytes)
        )
          throw new Error('Artifact identity conflict')
        if (previous?.state === 'deleting')
          throw new Error('Artifact is being collected; retry after collection')
        if (
          (!previous || previous.state === 'deleted') &&
          (this.usage()?.bytes ?? 0) + ref.bytes > command.quota
        )
          throw new Error(
            'Artifact quota exhausted; unpin old artifacts or collect expired data before allocating',
          )
        let rootId = command.owner
        if (command.owner) {
          const row = this.db
            .query<{ value: string }, [string]>(
              "SELECT value FROM documents WHERE namespace='runs' AND id=?",
            )
            .get(command.owner)
          if (!row) throw new Error('Artifact owner does not exist')
          const run = runSchema.parse(JSON.parse(row.value))
          rootId = run.rootId ?? run.id
        }
        if (!previous || previous.state === 'deleted')
          this.db
            .query(
              "INSERT INTO artifacts(id,reference,state,pinned,created_at,used_at) VALUES(?,?,'prepared',?,?,?) ON CONFLICT(id) DO UPDATE SET reference=excluded.reference,state='prepared',pinned=excluded.pinned,created_at=excluded.created_at,used_at=excluded.used_at",
            )
            .run(ref.id, JSON.stringify(ref), Number(command.pinned), command.now, command.now)
        else
          this.db
            .query('UPDATE artifacts SET used_at=?,pinned=max(pinned,?) WHERE id=?')
            .run(command.now, Number(command.pinned), ref.id)
        if (command.owner && rootId)
          this.db
            .query(
              'INSERT OR IGNORE INTO artifact_owners(artifact_id,run_id,root_id) VALUES(?,?,?)',
            )
            .run(ref.id, command.owner, rootId)
        return this.get(ref.id)
      }
      case 'artifact.commit': {
        const value = this.get(command.id)
        if (!value || !['prepared', 'ready'].includes(value.state))
          throw new Error('Artifact is not allocated')
        this.db.query("UPDATE artifacts SET state='ready' WHERE id=?").run(command.id)
        return this.get(command.id)
      }
      case 'artifact.read': {
        const value = this.get(command.id)
        if (value?.state !== 'ready')
          throw new Error('Artifact is unavailable, expired or requires recovery')
        this.db.query('UPDATE artifacts SET used_at=? WHERE id=?').run(command.now, command.id)
        return value
      }
      case 'artifact.pin': {
        const value = this.get(command.id)
        if (value?.state !== 'ready')
          throw new Error('Only a ready artifact can be pinned or unpinned')
        this.db
          .query('UPDATE artifacts SET pinned=? WHERE id=?')
          .run(Number(command.pinned), command.id)
        return { ...value, pinned: command.pinned }
      }
      case 'artifact.gc': {
        const rows = this.db
          .query<
            { id: string; reference: string },
            [number, number]
          >(`SELECT a.id,a.reference FROM artifacts a WHERE a.state='deleting' OR
          (((a.state='ready' AND a.pinned=0 AND a.used_at<?1) OR (a.state='prepared' AND a.used_at<?2))
          AND NOT EXISTS(SELECT 1 FROM artifact_owners o JOIN documents r ON r.namespace='runs' AND r.id=o.run_id WHERE o.artifact_id=a.id AND json_extract(r.value,'$.state') NOT IN ('succeeded','failed','canceled','interrupted'))
          AND NOT EXISTS(SELECT 1 FROM artifact_owners o JOIN documents d ON d.namespace IN ('teams','workflows') JOIN documents parent ON parent.namespace='runs' AND parent.id=json_extract(d.value,'$.parentRunId') AND coalesce(json_extract(parent.value,'$.rootId'),parent.id)=o.root_id WHERE o.artifact_id=a.id AND json_extract(d.value,'$.state') NOT IN ('succeeded','failed','canceled','applied','interrupted')))
          ORDER BY a.used_at LIMIT 100`)
          .all(command.before, command.preparedBefore)
        for (const row of rows)
          this.db.query("UPDATE artifacts SET state='deleting' WHERE id=?").run(row.id)
        return rows.map((row) => artifactSchema.parse(JSON.parse(row.reference)))
      }
      case 'artifact.deleted': {
        const value = this.get(command.id)
        if (value?.state !== 'deleting') throw new Error('Artifact deletion was not journaled')
        this.db.query("UPDATE artifacts SET state='deleted' WHERE id=?").run(command.id)
        this.db.query('DELETE FROM artifact_owners WHERE artifact_id=?').run(command.id)
        return { deleted: true }
      }
    }
  }
}
