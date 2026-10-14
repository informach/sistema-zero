import { readFile } from 'node:fs/promises'
import { Sandbox } from 'railway'

const environmentId = process.env.RAILWAY_ENVIRONMENT_ID
const checkpoint = process.env.LIVE_BROWSER_CHECKPOINT ?? 'live-browser-1-62-1-20261014'
if (!environmentId) throw new Error('RAILWAY_ENVIRONMENT_ID is required')
if (!process.env.RAILWAY_TOKEN && !process.env.RAILWAY_API_TOKEN)
  throw new Error('RAILWAY_TOKEN or RAILWAY_API_TOKEN is required')
const options = { environmentId }
if (!(await Sandbox.checkpoints(options)).some((item) => item.key === checkpoint)) {
  const script = await readFile(
    new URL('../../../.railway/live-browser-base.sh', import.meta.url),
    'utf8',
  )
  const quote = (value: string) => `'${value.replaceAll("'", "'\\''")}'`
  const template = Sandbox.template().run(`bash -c ${quote(script)}`)
  const sandbox = await Sandbox.create(template, { ...options, idleTimeoutMinutes: 10 })
  try {
    await sandbox.checkpoint(checkpoint)
  } finally {
    await sandbox.destroy()
  }
}
console.info(JSON.stringify({ environmentId, checkpoint, ready: true }))
