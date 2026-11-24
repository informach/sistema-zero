// QA do executor REAL. O bearer permanece dentro do Members de staging.
// As duas páginas usam a mesma identidade QA do executor; não entram em contas de alunos.
import { execFile } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { promisify } from 'node:util'

const runFile = promisify(execFile)
const require = createRequire(resolve('packages/studio/package.json'))
const { chromium } = require('@playwright/test')
const directory = resolve('.audits/review-7-dias-2026-11-23/lg02-real')
await mkdir(directory, { recursive: true })
const executionId = `check-lg02-${randomBytes(12).toString('hex')}`
const scope = `__sz${randomBytes(12).toString('hex')}`
const observations = []

function requestFor(label) {
  if (label === 'warm') return { path: '/v1/check/warm', body: { executionId, threeD: false } }
  if (label === 'invalid-warm')
    return { path: '/v1/check/warm', body: { executionId, threeD: 'invalid' } }
  const mark = `LG02-${label}`
  const wait = label === 'tab-b' || label === 'during-failure' ? 3000 : 100
  const longOverlap =
    ['overlap-failure', 'isolated-failure', 'long-control'].includes(process.env.LG02_SCENARIO) &&
    label === 'during-failure'
  const objective = (index) => ({
    id: `texto-${index}`,
    rule: {
      type: 'behavior',
      steps: longOverlap
        ? [
            { action: 'wait', ms: 10000 },
            { action: 'wait', ms: 5000 },
          ]
        : [{ action: 'wait', ms: wait }],
      expect: { target: { kind: 'text' }, compare: 'contains', value: mark },
    },
  })
  return {
    path: '/v1/check',
    body: {
      mode: 'classic',
      executionId:
        process.env.LG02_SCENARIO === 'isolated-failure' && label === 'during-failure'
          ? `${executionId}-b`
          : executionId,
      scope,
      document:
        label === 'execution-failure'
          ? '<!doctype html><body><script>while(true){}</script>'
          : `<!doctype html><body><p>${mark}</p>`,
      objectives: longOverlap ? [objective(1), objective(2)] : [objective(1)],
    },
  }
}

async function actualRequest(label) {
  const input = requestFor(label)
  const source = `;(async()=>{
    const input=${JSON.stringify(input)};
    const base=process.env.STUDIO_PRO_RUNTIME_URL;
    const token=process.env.STUDIO_PRO_RUNTIME_TOKEN;
    if(!base||!token||!new URL(base).hostname.includes('staging'))throw Error('Ambiente recusado');
    const start=Date.now();
    const r=await fetch(new URL(input.path,base),{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify(input.body),signal:AbortSignal.timeout(160000)});
    const body=await r.json();
    console.log(JSON.stringify({label:${JSON.stringify(label)},status:r.status,durationMs:Date.now()-start,body}));
  })().catch(e=>{console.log(JSON.stringify({label:${JSON.stringify(label)},transportError:e.name}));process.exitCode=1})`
  const encoded = Buffer.from(source).toString('base64')
  const command = `bun -e 'eval(Buffer.from("${encoded}","base64").toString())'`
  const { stdout } = await runFile(
    'C:/Users/tocha/AppData/Roaming/npm/node_modules/@railway/cli/bin/railway.exe',
    [
      'ssh',
      '-p',
      '415d5a1c-5f75-432c-8445-b395d0977ce3',
      '-e',
      'f634cff6-aafb-4804-8b69-172fad4e946e',
      '-s',
      'aa282801-ffba-477c-af6d-394b2f4f9af9',
      '--',
      command,
    ],
    { timeout: 180000, windowsHide: true, maxBuffer: 2 * 1024 * 1024 },
  )
  const line = stdout.split(/\r?\n/).find((line) => line.startsWith('{'))
  if (!line) throw new Error('Resposta de QA ausente')
  return JSON.parse(line)
}

const labels = new Set([
  'first',
  'warm',
  'repeat',
  'tab-a',
  'tab-b',
  'invalid-warm',
  'after-invalid',
  'execution-failure',
  'during-failure',
  'recovery',
])
const server = createServer(async (request, response) => {
  const url = new URL(request.url, 'http://127.0.0.1')
  const label = url.searchParams.get('case')
  if (!labels.has(label)) {
    response.writeHead(404).end()
    return
  }
  if (request.method === 'GET' && url.pathname === '/') {
    response.setHeader('content-type', 'text/html; charset=utf-8')
    response.end(`<!doctype html><html lang="pt-BR"><title>QA LG02</title><h1>Verificação QA: ${label}</h1><button>Verificar</button><pre id="result"></pre><script>
      document.querySelector('button').onclick=async()=>{
        const output=document.querySelector('pre');output.textContent='Verificando…';
        const r=await fetch('/run?case=${label}',{method:'POST'});
        output.textContent=JSON.stringify(await r.json(),null,2);output.dataset.complete='true';
      };</script>`)
    return
  }
  if (request.method !== 'POST' || url.pathname !== '/run') {
    response.writeHead(405).end()
    return
  }
  try {
    const observation = await actualRequest(label)
    observations.push(observation)
    console.log(JSON.stringify(observation))
    response.setHeader('content-type', 'application/json')
    response.end(JSON.stringify(observation))
  } catch (error) {
    const observation = { label, relayError: error.name, exitCode: error.code ?? null }
    observations.push(observation)
    console.log(JSON.stringify(observation))
    response.writeHead(502, { 'content-type': 'application/json' }).end(JSON.stringify(observation))
  }
})
await new Promise((done) => server.listen(0, '127.0.0.1', done))
const origin = `http://127.0.0.1:${server.address().port}`
const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
})
try {
  const context = await browser.newContext()
  const a = await context.newPage(),
    b = await context.newPage()
  async function check(page, label) {
    await page.goto(`${origin}/?case=${label}`)
    await page.getByRole('button', { name: 'Verificar' }).click()
    await page.locator('#result[data-complete=true]').waitFor({ timeout: 190000 })
    return JSON.parse(await page.locator('#result').textContent())
  }
  if (['overlap-failure', 'isolated-failure', 'long-control'].includes(process.env.LG02_SCENARIO))
    await check(a, 'warm')
  else {
    for (const label of ['first', 'warm', 'repeat']) await check(a, label)
    await Promise.all([check(a, 'tab-a'), check(b, 'tab-b')])
    await a.screenshot({ path: resolve(directory, 'tab-a.png') })
    await b.screenshot({ path: resolve(directory, 'tab-b.png') })
    await check(a, 'invalid-warm')
    await check(a, 'after-invalid')
  }
  if (process.env.LG02_SCENARIO === 'long-control') await check(b, 'during-failure')
  else await Promise.all([check(a, 'execution-failure'), check(b, 'during-failure')])
  await check(a, 'recovery')
} finally {
  await browser.close()
  server.closeAllConnections()
  await new Promise((done) => server.close(done))
  await writeFile(
    resolve(directory, `${process.env.LG02_SCENARIO ?? 'baseline'}-results.json`),
    JSON.stringify(
      {
        testedAt: new Date().toISOString(),
        environment: 'staging',
        executionId,
        scope: 'QA sintética; duas abas reais com a mesma identidade do executor',
        activationQualified: false,
        missing: [
          'falha de limpeza injetada no contêiner real',
          'suspensão',
          'capacidade',
          'perfis distintos',
          'percurso autenticado completo do Members',
        ],
        observations,
      },
      null,
      2,
    ) + '\n',
  )
}
