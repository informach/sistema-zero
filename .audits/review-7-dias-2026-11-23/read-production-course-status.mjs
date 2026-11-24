// Read-only content inventory. Never prints the connection URL or account/student data.
;(async () => {
  const { createRequire } = await import('node:module')
  const module = createRequire('/app/packages/members/package.json')('postgres')
  const postgres = module.default ?? module
  if (!process.env.DATABASE_URL) throw new Error('Database configuration unavailable')
  const sql = postgres(process.env.DATABASE_URL, { max: 1, connect_timeout: 8, idle_timeout: 5 })
  try {
    const rows = await sql.begin('read only', async tx => {
      await tx.unsafe("set local statement_timeout = '8s'")
      await tx.unsafe("set local lock_timeout = '2s'")
      return tx.unsafe(`select c.slug,c.title,c.status,c.audience,c.learner,c.level,c.track,c.career_slot,
        c.sequential_lock,c.updated_at,
        count(l.id)::int as lessons,
        count(l.id) filter(where l.is_published)::int as published_lessons
        from members.courses c
        left join members.lessons l on l.course_id=c.id and l.archived_at is null
        where c.modality='recorded'
        and (c.slug ~* '(jornada-faisca|ilha.*farol|jardim|ponte|simbol|moedas|cabana|primeiro.*desenho|vilao|autista|frustra)'
          or c.title ~* '(vilão|vilao|autista|frustra|baú|bau dos|cabana|ponte apressada)')
        group by c.id order by c.title limit 100`)
    })
    console.log(JSON.stringify({ queriedAt: new Date().toISOString(), readOnly: true, courses: rows }, null, 2))
  } finally { await sql.end({ timeout: 1 }) }
})().catch(error => { console.error('COURSE_READ_FAILED', error.name, error.message); process.exitCode = 1 })
