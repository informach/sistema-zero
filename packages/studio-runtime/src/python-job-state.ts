import {
  type StudioPythonInspectionJobState,
  StudioPythonInspectionJobStateSchema,
  studioPythonInspectionJobRetentionUntil,
} from '@sistemazero/core/studio/python-inspection-job'
import { z } from 'zod'

const changesSchema = z.strictObject({
  status: z.enum(['running', 'succeeded', 'failed', 'cancelled']).optional(),
  sandboxCreated: z.boolean().optional(),
  cleanupConfirmed: z.boolean().optional(),
  previewRetired: z.literal(true).optional(),
})

/** Synchronous SQLite CAS; no await separates reading, claiming or retiring an owned job. */
export function createPythonJobStateStore(sql: Pick<SqlStorage, 'exec'>) {
  sql.exec(
    'CREATE TABLE IF NOT EXISTS python_inspection_job (slot INTEGER PRIMARY KEY CHECK(slot = 1), version INTEGER NOT NULL, state TEXT NOT NULL)',
  )
  const read = () => {
    const row = sql
      .exec<{ state: string }>('SELECT state FROM python_inspection_job WHERE slot = 1')
      .toArray()[0]
    return row ? StudioPythonInspectionJobStateSchema.parse(JSON.parse(row.state)) : undefined
  }
  return {
    read,
    claim(raw: unknown) {
      const state = StudioPythonInspectionJobStateSchema.parse(raw)
      if (state.stateVersion !== 1)
        throw new Error('Uma admissão Python precisa da versão inicial.')
      return (
        sql
          .exec(
            'INSERT OR IGNORE INTO python_inspection_job (slot, version, state) VALUES (1, ?, ?) RETURNING slot',
            state.stateVersion,
            JSON.stringify(state),
          )
          .toArray().length === 1
      )
    },
    update(expected: StudioPythonInspectionJobState, rawChanges: unknown) {
      const changes = changesSchema.parse(rawChanges)
      const current = read()
      if (
        !current ||
        current.stateVersion !== expected.stateVersion ||
        current.jobId !== expected.jobId
      )
        return undefined
      if (
        current.status !== 'running' &&
        changes.status !== undefined &&
        changes.status !== current.status
      )
        throw new Error('Um job Python encerrado não pode mudar de resultado.')
      if (
        changes.sandboxCreated === true &&
        !current.sandboxCreated &&
        (current.status !== 'running' || current.cleanupConfirmed)
      )
        throw new Error('Um job Python encerrado ou limpo não pode criar um sandbox.')
      if (current.sandboxCreated && changes.sandboxCreated === false)
        throw new Error('A propriedade do sandbox Python não pode ser apagada.')
      if (current.cleanupConfirmed && changes.cleanupConfirmed === false)
        throw new Error('A confirmação de limpeza Python não pode regredir.')
      if (current.previewRetired && 'previewRetired' in changes && changes.previewRetired !== true)
        throw new Error('O descarte do preview Python não pode regredir.')
      const next = StudioPythonInspectionJobStateSchema.parse({
        ...current,
        ...changes,
        stateVersion: current.stateVersion + 1,
      })
      const rows = sql
        .exec(
          "UPDATE python_inspection_job SET version = ?, state = ? WHERE slot = 1 AND version = ? AND json_extract(state, '$.jobId') = ? RETURNING slot",
          next.stateVersion,
          JSON.stringify(next),
          expected.stateVersion,
          expected.jobId,
        )
        .toArray()
      return rows.length === 1 ? next : undefined
    },
    purgeExpired(expected: StudioPythonInspectionJobState, now: number) {
      const current = read()
      if (
        !current ||
        current.stateVersion !== expected.stateVersion ||
        current.jobId !== expected.jobId
      )
        return false
      if (
        !Number.isSafeInteger(now) ||
        now < studioPythonInspectionJobRetentionUntil(current) ||
        !current.cleanupConfirmed ||
        current.status === 'running'
      )
        throw new Error('O estado Python ainda é necessário para impedir um início tardio.')
      return (
        sql
          .exec(
            "DELETE FROM python_inspection_job WHERE slot = 1 AND version = ? AND json_extract(state, '$.jobId') = ? RETURNING slot",
            expected.stateVersion,
            expected.jobId,
          )
          .toArray().length === 1
      )
    },
  }
}
