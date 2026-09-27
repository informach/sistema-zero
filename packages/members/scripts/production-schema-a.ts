/** Release A: install the maintenance barrier before allowing the first backfill. */
const phase = process.env.RELEASE_SCHEMA_STAGE
const mode = process.env.RELEASE_MAINTENANCE_MODE
if (
  process.env.RAILWAY_ENVIRONMENT_NAME !== 'production' ||
  process.env.RAILWAY_PROJECT_ID !== '415d5a1c-5f75-432c-8445-b395d0977ce3'
) {
  throw new Error('Schema A is restricted to the production release')
}
if (mode === 'off') {
  console.log('Schema A: maintenance off, no migrations. Reopening the compatible application.')
} else if (mode !== 'full') {
  throw new Error('Schema A requires full maintenance')
} else if (phase === 'hold') {
  console.log(
    'Schema A held: install and verify maintenance on all writers before applying migrations.',
  )
} else if (phase === 'apply') {
  const child = Bun.spawn(['bun', 'run', 'db:migrate'], {
    cwd: new URL('..', import.meta.url).pathname.replace(/^\/(\w:)/, '$1'),
    stdout: 'inherit',
    stderr: 'inherit',
  })
  if ((await child.exited) !== 0) throw new Error('Schema A migration failed')
} else {
  throw new Error('RELEASE_SCHEMA_STAGE must be hold or apply')
}
