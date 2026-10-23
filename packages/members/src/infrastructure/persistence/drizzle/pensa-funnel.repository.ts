import { sql } from 'drizzle-orm'
import type { PensaFunnelCounts, PensaFunnelReader } from '../../../domain/ports/pensa-funnel.port'
import type { Database } from './db'

export class DrizzlePensaFunnelRepository implements PensaFunnelReader {
  constructor(readonly db: Database) {}
  async funnel(since: Date, until: Date): Promise<PensaFunnelCounts> {
    const rows = await this.db.execute(sql`
      with projects as (
        select id from members.pensa_projects where created_at >= ${since.toISOString()}::timestamptz and created_at <= ${until.toISOString()}::timestamptz
      ), milestones as (
        select e.project_key, bool_or(e.kind = 'plan_accepted') as accepted, bool_or(e.kind = 'draft_ready') as ready,
          bool_or(e.kind = 'first_feature') as feature,
          bool_or(e.kind = 'construction_complete') as constructed,
          bool_or(exists(select 1 from jsonb_array_elements(coalesce(e.data->'progressAfter','[]'::jsonb)) progress where progress->>'status' = 'completed' and progress->'verification'->>'source' = 'saved_configuration')) as prepared,
          bool_or(e.kind = 'project_verified') as verified
        from members.pensa_execution_events e join projects p on p.id = e.project_key group by e.project_key
      )
      select
        (select count(*) from projects) as projects,
        (select count(distinct m.project_id) from members.pensa_project_messages m join projects p on p.id = m.project_id where m.context = 'planning') as definition_started,
        (select count(*) from milestones where ready) as draft_ready,
        (select count(*) from milestones where accepted) as plan_accepted,
        (select count(*) from milestones where prepared) as setup_completed,
        (select count(*) from milestones where feature) as first_mission_completed,
        (select count(*) from milestones where constructed) as construction_completed,
        (select count(*) from milestones where verified) as project_completed,
        (select count(distinct d.project_id) from members.pensa_plan_drafts d join projects p on p.id = d.project_id where d.status = 'needs_choice') as pending_choices,
        (select count(distinct r.project_id) from members.pensa_project_revisions r join projects p on p.id = r.project_id where jsonb_array_length(coalesce(r.snapshot->'definition'->'adaptations','[]'::jsonb)) > 0) as adaptations_accepted
    `)
    const r = rows[0]
    return {
      projects: Number(r?.projects ?? 0),
      definitionStarted: Number(r?.definition_started ?? 0),
      draftReady: Number(r?.draft_ready ?? 0),
      planAccepted: Number(r?.plan_accepted ?? 0),
      setupCompleted: Number(r?.setup_completed ?? 0),
      firstMissionCompleted: Number(r?.first_mission_completed ?? 0),
      constructionCompleted: Number(r?.construction_completed ?? 0),
      projectCompleted: Number(r?.project_completed ?? 0),
      pendingChoices: Number(r?.pending_choices ?? 0),
      adaptationsAccepted: Number(r?.adaptations_accepted ?? 0),
    }
  }
}
