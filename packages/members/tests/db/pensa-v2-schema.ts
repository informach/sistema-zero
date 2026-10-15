import { readFile } from 'node:fs/promises'
import type postgres from 'postgres'

/**
 * O schema do Pensa v2 num banco PRÓPRIO de teste (`sistemazero_pensa_v2_test`,
 * `sistemazero_pensa_team_v2_test`): as migrations reais da jornada, mais o DDL à mão do que
 * ainda não tem migration no repositório.
 */
const PENSA_V2_MIGRATIONS = [
  '0060_pensa_planner_v2.sql',
  '0067_creations.sql',
  '0068_account_deletion_cleanup.sql',
  '0070_creation_parts.sql',
  '0075_creation-format-version.sql',
  '0077_pensa_molda_destination.sql',
  '0098_pensa_project_members.sql',
  '0108_pensa_journey_v2.sql',
  '0109_private_zappy_narrations.sql',
  '0110_pensa_lifecycle_cleanup.sql',
  '0111_pensa_provider_budget.sql',
]

export async function applyPensaV2Schema(sql: postgres.Sql): Promise<void> {
  await sql`create schema if not exists members`
  await sql.unsafe(
    `do $$ begin create type members.course_audience as enum ('kids','adult'); exception when duplicate_object then null; end $$`,
  )
  for (const file of PENSA_V2_MIGRATIONS) {
    const ddl = await readFile(
      new URL(`../../src/infrastructure/persistence/drizzle/migrations/${file}`, import.meta.url),
      'utf8',
    )
    for (const raw of ddl.split('--> statement-breakpoint')) {
      const statement = raw.replace(/^--.*$/gm, '').trim()
      // O fixture aproveita apenas a criação do contrato de 0060, jamais sua troca destrutiva.
      if (!statement || /^DROP /i.test(statement)) continue
      try {
        await sql.unsafe(statement)
      } catch (cause) {
        if (!['42P07', '42710', '42701'].includes((cause as { code: string }).code)) throw cause
      }
    }
  }
  await sql.unsafe(
    'alter table members.creations add column if not exists content_fingerprint varchar(70), add column if not exists pending_content_fingerprint varchar(70)',
  )
  await sql.unsafe(
    "alter table members.creation_cleanup_jobs add column if not exists user_ids jsonb not null default '[]'::jsonb",
  )
  await sql.unsafe(
    `create table if not exists members.ai_usage_daily (account_id uuid not null, day date not null, feature varchar(40) not null, used integer not null default 0, privileged boolean not null default false, updated_at timestamptz not null default now(), primary key(account_id, day, feature))`,
  )
  await applyPensaTeamDdl(sql)
}

/**
 * Equipe no v2 (14/10/2026): o DDL da migration `pensa_v2_team`, que ainda não está no
 * repositório (vai ser gerada depois do lote das oficinas). Idempotente, o MESMO SQL da migration.
 * Supõe `pensa_projects` e `pensa_tasks` já criadas.
 */
export async function applyPensaTeamDdl(sql: postgres.Sql): Promise<void> {
  await sql.unsafe(`create table if not exists members.pensa_project_roles (
    project_id uuid not null references members.pensa_projects(id) on delete cascade,
    profile_id uuid not null,
    role varchar(8) not null,
    assigned_by uuid not null,
    created_at timestamptz not null default now(),
    constraint pensa_project_roles_project_id_profile_id_role_pk primary key (project_id, profile_id, role),
    constraint pensa_project_roles_role_check check (role in ('code', 'art'))
  )`)
  await sql.unsafe(
    `create unique index if not exists pensa_project_roles_code_uq on members.pensa_project_roles (project_id) where role = 'code'`,
  )
  await sql.unsafe(
    'create index if not exists pensa_project_roles_profile_idx on members.pensa_project_roles (profile_id)',
  )
  await sql.unsafe(
    'alter table members.pensa_tasks add column if not exists assignee_profile_id uuid, add column if not exists completed_by_profile_id uuid',
  )
}
