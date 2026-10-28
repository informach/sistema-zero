import { createRequire } from 'node:module'
import path from 'node:path'
import tailwind from '@tailwindcss/postcss'
import { createDbConnection } from '../../../arquipelago-api/src/infrastructure/persistence/drizzle/db'
import { migrarBancoDeTeste } from '../../../arquipelago-api/tests/fakes/banco-migrado'
import {
  idMedicao,
  semearMedicao,
  servidorMedicao,
  TOKEN_MEDICAO,
  validarBancoMedicao,
} from '../../../arquipelago-api/tests/fakes/medicao'
import { gameAdminRequest } from '../../src/lib/arquipelago-admin'

const url = process.env.ARQUIPELAGO_MEDICAO_TEST_DATABASE_URL
if (!url) throw new Error('Falta o banco descartável local.')
validarBancoMedicao(url)
const db = createDbConnection(url, { max: 2 })
await migrarBancoDeTeste(db)
await semearMedicao(db)
const api = servidorMedicao(db)
const admin = path.resolve(import.meta.dir, '../..')
const require = createRequire(import.meta.url)
const postcss = createRequire(require.resolve('@tailwindcss/postcss'))('postcss') as (
  plugins: ReturnType<typeof tailwind>[],
) => {
  process(css: string, options: { from: string }): Promise<{ css: string }>
}
const stylePath = path.join(admin, 'src/app/globals.css')
const css = await postcss([tailwind({ base: admin })]).process(await Bun.file(stylePath).text(), {
  from: stylePath,
})
const build = await Bun.build({
  entrypoints: [path.join(admin, 'tests/fixtures/game-measurement-view.tsx')],
  target: 'browser',
  define: { 'process.env.NODE_ENV': '"development"' },
})
if (!build.success) throw new Error(build.logs.join('\n'))
const js = build.outputs.find((o) => o.kind === 'entry-point')
if (!js) throw new Error('Falta o componente compilado.')
const server = Bun.serve({
  hostname: '127.0.0.1',
  port: Number(process.env.MEDICAO_TEST_PORT ?? 4626),
  async fetch(request) {
    const u = new URL(request.url)
    if (u.pathname === '/view.js')
      return new Response(js, { headers: { 'content-type': 'text/javascript' } })
    if (u.pathname === '/view.css')
      return new Response(css.css, { headers: { 'content-type': 'text/css' } })
    if (u.pathname.startsWith('/api/arquipelago/')) {
      const parsed = gameAdminRequest(
        request.method,
        u.pathname.slice('/api/arquipelago/'.length).split('/'),
        u.searchParams,
        undefined,
      )
      const query = 'query' in parsed ? new URLSearchParams(parsed.query).toString() : ''
      return api.handle(
        new Request(`http://local${parsed.path}?${query}`, {
          headers: {
            'x-internal-token': TOKEN_MEDICAO,
            'x-auth-user-id': idMedicao(999),
            'x-auth-user-role': 'admin',
            'x-auth-user-status': 'active',
          },
        }),
      )
    }
    if (u.pathname === '/')
      return new Response(
        '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Medição local</title><link rel="stylesheet" href="/view.css"></head><body class="bg-background text-foreground" style="font-family:Arial,sans-serif"><div id="root"></div><script type="module" src="/view.js"></script></body></html>',
        { headers: { 'content-type': 'text/html' } },
      )
    return new Response(null, { status: 404 })
  },
})
async function stop() {
  await server.stop(true)
  await db.close()
  process.exit(0)
}
process.on('SIGTERM', () => {
  void stop()
})
process.on('SIGINT', () => {
  void stop()
})
console.log(`Medição local pronta em ${server.url}`)
