import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { openPensaTestDatabase } from './pensa-native-database'

const enabled = Boolean(process.env.PENSA_TEST_DATABASE_URL)

test.skipIf(!enabled)(
  'native Pensa migrations replay on an empty disposable PostgreSQL database',
  async () => {
    const conn = await openPensaTestDatabase('pensa_native_fresh_test')
    try {
      const tables =
        await conn.sql`select table_name from information_schema.tables where table_schema = 'members' and table_name like 'pensa_%'`
      const names = tables.map((t) => t.table_name)
      expect(names).toContain('pensa_project_revisions')
      expect(names).toContain('pensa_mission_progress')
      expect(names).not.toContain('pensa_tasks')
      expect(names).not.toContain('pensa_cycles')
    } finally {
      await conn.close()
    }
  },
  60_000,
)

test.skipIf(!enabled)(
  'native cutover preserves saved creations, shared accounting and scoped cleanup',
  async () => {
    const conn = await openPensaTestDatabase('pensa_native_upgrade_test', true)
    const project = randomUUID(),
      profile = randomUUID(),
      account = randomUUID(),
      cycle = randomUUID(),
      reservation = randomUUID()
    const creationIds = [randomUUID(), randomUUID(), randomUUID()]
    try {
      await conn.sql`insert into members.pensa_projects (id,user_id,account_id,audience,kind,name,status,created_at,updated_at) values (${project},${profile},${account},'kids','game','Teste','active',now(),now())`
      await conn.sql`insert into members.pensa_cycles (id,project_id,number,stage,created_at,updated_at) values (${cycle},${project},1,'z',now(),now())`
      await conn.sql`insert into members.ai_usage_reservations(id,account_id,profile_id,project_id,day,feature,status,expires_at,privileged,created_at,updated_at) values (${reservation},${account},${profile},${project},current_date,'pensa-planning','committed',now()+interval '1 hour',false,now(),now())`
      await conn.sql`insert into members.pensa_provider_usage(account_id,day,calls,updated_at) values (${account},current_date,7,now())`
      await conn.sql`insert into members.ai_usage_daily(account_id,day,feature,used,privileged,updated_at) values (${account},current_date,'pensa-planning',3,false,now())`
      for (const [index, tool] of ['studio', 'pinta', 'molda'].entries())
        await conn.sql`insert into members.creations(id,user_id,account_id,tool,item_id,name,kind,item_updated_at,revision,format_version,bytes,storage_ref,synced_at,created_at) values (${creationIds[index]!},${profile},${account},${tool},${`sentinel-${tool}`},'Sentinela','model',now(),1,1,10,${`creations/${profile}/${tool}/sentinel/1.gz`},now(),now())`
      await conn.upgrade()
      expect(
        await conn.sql`select * from members.creations where id in ${conn.sql(creationIds)}`,
      ).toHaveLength(3)
      const [hold] =
        await conn.sql`select status,project_id from members.ai_usage_reservations where id=${reservation}`
      expect(hold?.status).toBe('committed')
      expect(hold?.project_id).toBeNull()
      expect(
        (
          await conn.sql`select calls from members.pensa_provider_usage where account_id=${account}`
        )[0]?.calls,
      ).toBe(7)
      expect(
        (await conn.sql`select used from members.ai_usage_daily where account_id=${account}`)[0]
          ?.used,
      ).toBe(3)
      const [job] =
        await conn.sql`select prefixes from members.pensa_deletion_jobs where id=${project}`
      expect(job?.prefixes).toEqual([`creations/${profile}/pensa/${project}/`])
    } finally {
      await conn.close()
    }
  },
  60_000,
)
