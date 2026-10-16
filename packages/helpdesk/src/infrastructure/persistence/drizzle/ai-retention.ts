import type { TransactionSql } from 'postgres'

/** Called under the existing retention advisory lock. Active jobs are never removed. */
export async function pruneAiData(tx: TransactionSql, at: Date, runDays: number) {
  const runsBefore = new Date(at.getTime() - runDays * 86400000).toISOString()
  const operationalBefore = new Date(at.getTime() - 90 * 86400000).toISOString()
  await tx`update helpdesk.tickets set ai_draft = null, ai_draft_run_id = null, ai_draft_at = null where ai_draft_run_id in (select id from helpdesk.ai_runs where created_at < ${runsBefore})`
  await tx`update helpdesk.tickets set ai_summary = null, ai_summary_at = null, ai_classification = null where ai_summary_at < ${runsBefore}`
  await tx`delete from helpdesk.ai_runs where created_at < ${runsBefore}`
  await tx`delete from helpdesk.automation_jobs where state not in ('pending','processing') and finished_at < ${runsBefore}`
  await tx`delete from helpdesk.customer_commands where created_at < ${operationalBefore}`
  await tx`delete from helpdesk.resolution_events where created_at < ${operationalBefore}`
  await tx`delete from helpdesk.automation_handoffs where created_at < ${operationalBefore}`
  await tx`delete from helpdesk.automation_evaluations where created_at < ${operationalBefore} and id::text <> coalesce((select policy->>'evaluationId' from helpdesk.automation_policy where id='default'),'')`
  await tx`delete from helpdesk.automation_policy_events where created_at < ${operationalBefore}`
}
