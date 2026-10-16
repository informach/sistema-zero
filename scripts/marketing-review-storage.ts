import path from 'node:path'
import { z } from 'zod'
/** Explicit, read-only Railway lookup. Credentials remain in memory and are never logged or saved. */
export async function reviewStorage() {
  if (!process.argv.includes('--staging-storage')) return {}
  if (!process.env.APPDATA)
    throw new Error('Esta prova usa a instalação local do Railway CLI no Windows')
  const command = Bun.spawn(
    [
      'node',
      path.join(process.env.APPDATA, 'npm/node_modules/@railway/cli/bin/railway.js'),
      'variable',
      'list',
      '--project',
      '415d5a1c-5f75-432c-8445-b395d0977ce3',
      '--environment',
      'f634cff6-aafb-4804-8b69-172fad4e946e',
      '--service',
      '7b8a87e6-a92f-4a5c-adc1-c4d2fe23b737',
      '--json',
    ],
    { stdout: 'pipe', stderr: 'pipe' },
  )
  const [status, stdout] = await Promise.all([
    command.exited,
    new Response(command.stdout).text(),
    new Response(command.stderr).text(),
  ])
  if (status !== 0)
    throw new Error('A configuração do armazenamento de staging não pôde ser consultada')
  const config = z
    .object({
      R2_ACCOUNT_ID: z.string().regex(/^[a-f0-9]{32}$/),
      R2_ACCESS_KEY_ID: z.string().min(1),
      R2_SECRET_ACCESS_KEY: z.string().min(1),
      R2_MARKETING_BUCKET: z.literal('testes-marketing'),
    })
    .safeParse(JSON.parse(stdout))
  if (!config.success)
    throw new Error('A configuração não corresponde ao bucket de testes esperado')
  console.log('MARKETING_REVIEW_STORAGE bucket=testes-marketing environment=staging')
  return config.data
}
