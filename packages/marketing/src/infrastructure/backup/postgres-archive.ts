import type { DbConnection } from '../persistence/drizzle/db'

/** The target must be offline and empty. Never restore over a running marketing installation. */
export async function assertEmptyRestoreTarget(connection: DbConnection) {
  const rows = await connection.sql`select 1 from pg_namespace where nspname = 'marketing'`
  const journal =
    await connection.sql`select to_regclass('drizzle.marketing_migrations') as existing`
  if (rows.length || journal[0]?.existing)
    throw new Error('A restauração exige um banco sem schema marketing e sem seu journal')
  await connection.sql`create schema if not exists drizzle`
}

/** A point-in-time snapshot cannot prove that a side effect did not happen after it was taken. */
export async function quarantineRestoredWork(connection: DbConnection) {
  await connection.sql.begin(async (tx) => {
    await tx`update marketing.publications set status = 'failed', next_attempt_at = null,
      last_error = 'Restaurado de backup: conferir o resultado externo antes de criar outra entrega.',
      provider_session = provider_session || '{"restoredFromBackup":true}'::jsonb, version = version + 1, updated_at = now()
      where status in ('scheduled','publishing','awaiting_manual')`
    await tx`update marketing.editorial_attempts set state = 'canceled', lease_expires_at = now() where state in ('running','waiting','queued')`
    await tx`update marketing.editorial_runs set state = 'failed', epoch = epoch + 1, current_attempt_id = null
      where state in ('running','waiting','queued')`
    await tx`update marketing.editorial_uploads set state = 'failed', verification_token = null, lease_expires_at = null,
      error = 'Upload anterior à restauração. Reenvie a partir do original preservado no computador.' where state <> 'confirmed'`
    await tx`update marketing.media_assets set status = 'failed', transfer_next_at = null,
      transfer_error = 'Transferência interrompida pela restauração; conferir R2 e Drive antes de retomar.',
      version = version + 1, updated_at = now() where status in ('importing','archiving')`
    await tx`update marketing.social_accounts set status = 'disabled', version = version + 1,
      last_refresh_error = 'Instância restaurada: reconecte a conta após a conferência do ambiente.', updated_at = now() where status = 'connected'`
    // Older archives legitimately predate this additive feature. Never replay a restored DM queue.
    const [engagement] = await tx`select to_regclass('marketing.engagement_channels') as existing`
    if (engagement?.existing) {
      await tx`update marketing.engagement_channels set enabled = false, proof = null, version = version + 1, updated_at = now()`
      await tx`update marketing.engagement_activations set state = 'paused', reason = 'Backup restaurado: conferir histórico externo e solicitar nova ativação', verified_at = null, version = version + 1 where state <> 'retired'`
      await tx`update marketing.engagement_outbound set state = 'cancelled', error = 'Pendência anterior à restauração' where state = 'pending'`
      await tx`update marketing.engagement_outbound set state = 'uncertain', error = 'Backup não comprova resultado externo', lease_until = null where state = 'sending'`
      await tx`update marketing.engagement_inbound set state = 'ignored', reason = 'Entrada anterior à restauração; não reprocessar' where state = 'pending'`
      await tx`update marketing.engagement_journeys set previous_state = state, state = 'human' where state <> 'closed'`
      await tx`update marketing.engagement_conversations set state = 'waiting-human', version = version + 1 where suppression is null`
    }
  })
}
