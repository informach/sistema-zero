import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { openPensaTestDatabase, pensaTestTarget } from './pensa-native-database'

const enabled = Boolean(process.env.PENSA_TEST_DATABASE_URL)
test.skipIf(!enabled)(
  'scoped maintenance dry-run, cutover and rollback preserve accounting and cancel reverted cleanup',
  async () => {
    const name = 'pensa_native_maintenance_test',
      conn = await openPensaTestDatabase(name, true)
    const id = randomUUID(),
      profile = randomUUID(),
      account = randomUUID(),
      hold = randomUUID()
    const dir = await mkdtemp(join(tmpdir(), 'pensa-maintenance-test-'))
    const manifest = join(dir, 'manifest.json')
    async function run(mode: string, apply = false) {
      const task = Bun.spawn(
        [
          process.execPath,
          'scripts/pensa-maintenance.ts',
          mode,
          '--manifest',
          manifest,
          ...(apply ? ['--apply', '--workers-fenced', '--no-child-data'] : ['--dry-run']),
        ],
        {
          cwd: fileURLToPath(new URL('../../', import.meta.url)),
          env: { ...process.env, PENSA_MAINTENANCE_DATABASE_URL: pensaTestTarget(name).toString() },
          stdout: 'pipe',
          stderr: 'pipe',
        },
      )
      const [output, error, code] = await Promise.all([
        new Response(task.stdout).text(),
        new Response(task.stderr).text(),
        task.exited,
      ])
      if (code !== 0) throw new Error(`Maintenance ${mode} failed: ${error}\n${output}`)
      return output
    }
    try {
      await conn.sql`insert into members.pensa_projects(id,user_id,account_id,audience,kind,name,status,created_at,updated_at) values(${id},${profile},${account},'kids','game','Sentinela','active',now(),now())`
      await conn.sql`insert into members.ai_usage_reservations(id,account_id,profile_id,project_id,day,feature,status,expires_at,privileged,created_at,updated_at) values(${hold},${account},${profile},${id},current_date,'pensa-planning','reserved',now()+interval '1 hour',false,now(),now())`
      await conn.sql`insert into members.ai_usage_daily(account_id,day,feature,used,privileged,updated_at) values(${account},current_date,'pensa-planning',5,false,now())`
      expect(await run('preflight')).toContain('"projects":1')
      expect(await run('cutover')).toContain('"dryRun":true')
      expect(await conn.sql`select id from members.pensa_projects`).toHaveLength(1)
      await run('cutover', true)
      expect(await conn.sql`select id from members.pensa_projects`).toHaveLength(0)
      expect(
        (
          await conn.sql`select status,project_id from members.ai_usage_reservations where id=${hold}`
        )[0],
      ).toMatchObject({ status: 'released', project_id: null })
      expect(await run('verify')).toContain('"ok":true')
      await conn.sql`create view members.pensa_external_view_test as select id from members.pensa_projects`
      let refused: unknown
      try {
        await run('rollback')
      } catch (error) {
        refused = error
      }
      expect(refused).toBeInstanceOf(Error)
      expect(await conn.sql`select id from members.pensa_projects`).toHaveLength(0)
      await conn.sql`drop view members.pensa_external_view_test`
      expect(await run('rollback')).toContain('"dryRun":true')
      await run('rollback', true)
      expect((await conn.sql`select id from members.pensa_projects`)[0]?.id).toBe(id)
      expect(
        (
          await conn.sql`select status,project_id from members.ai_usage_reservations where id=${hold}`
        )[0],
      ).toMatchObject({ status: 'released', project_id: id })
      expect(
        (await conn.sql`select used from members.ai_usage_daily where account_id=${account}`)[0]
          ?.used,
      ).toBe(5)
      expect(
        (await conn.sql`select completed_at from members.pensa_deletion_jobs where id=${id}`)[0]
          ?.completed_at,
      ).not.toBeNull()
    } finally {
      await conn.close()
    }
  },
  60_000,
)
