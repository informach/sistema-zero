import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { chmod, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  judgePythonProjectExecution,
  type PythonProjectExecutionObjective,
  preparePythonProjectExecution,
} from '@sistemazero/core/learning'
import { pythonMissionRequest } from '@sistemazero/core/studio/python-mission-execution'
import {
  studioPythonDeploymentRoute,
  studioPythonLogicalFiles,
  studioPythonRuntimeRoute,
  verifyStudioPythonDeployment,
} from '@sistemazero/core/studio/python-runtime-distribution'
import { pythonFrameContentSecurityPolicy } from '@sistemazero/core/studio/python-runtime-policy'
import {
  AMBIENTE_PYTHON_C02,
  EXTENSOES_DA_RELEASE_C02,
} from '../../../docs/desafios-do-jogo/ambiente-python'
import { CENARIOS_DO_PICO } from '../../../docs/desafios-do-jogo/pico/python-projetos'
import { CENARIOS_DO_RECIFE } from '../../../docs/desafios-do-jogo/recife/python-projetos'
import { ManifestoDeDesafiosSchema } from '../../arquipelago-contracts/src/desafios'
import { preparePythonExecutionSnapshot } from '../../studio/src/runtime/python/snapshot'

/**
 * C02 (30/10/2026): os desafios Python do Recife e do Pico no executor Python REAL: a imagem de
 * produção do studio-runtime (Chromium e Pyodide, sem rede) roda `python-mission.mjs` com a
 * distribuição PUBLICADA da release ativa (baixada do host do runtime, cada arquivo conferido
 * contra o manifesto por `verifyStudioPythonDeployment`), e o julgamento é o `judgePythonProjectExecution`
 * do core, o mesmo do `PythonProjectCheckerService`. O retrato do projeto sai do
 * `preparePythonExecutionSnapshot`, o mesmo que o Members usa. Mesmo molde do
 * `python-mission-smoke.ts`.
 *
 *   bun packages/studio-runtime/tests/desafios-python-smoke.ts [--ilha=recife|pico]
 *     [--cenario=<nome>]
 *
 * Variáveis: `STUDIO_PYTHON_TEST_CACHE` (distribuições baixadas e evidências),
 * `STUDIO_PYTHON_RUNTIME_HOST` (padrão: o runtime de staging) e `STUDIO_PYTHON_TEST_IMAGE` (a
 * imagem publicada do executor, por exemplo a tag local do deploy de staging).
 */
const root = path.resolve(import.meta.dirname, '../../..')
const cache =
  process.env.STUDIO_PYTHON_TEST_CACHE ?? path.join(root, '.cache/studio-python-l0/missions')
const argumento = (nome: string) =>
  process.argv.find((arg) => arg.startsWith(`--${nome}=`))?.slice(nome.length + 3)

// A distribuição PUBLICADA da release ativa, pelas rotas públicas do runtime (só leitura).
const host =
  process.env.STUDIO_PYTHON_RUNTIME_HOST ??
  'https://sistemazero-studio-runtime-staging.helena-bcc.workers.dev'
const sha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')
const metadados = await fetch(
  host + studioPythonDeploymentRoute(AMBIENTE_PYTHON_C02.manifestSha256),
  {
    signal: AbortSignal.timeout(30_000),
  },
)
assert.equal(metadados.status, 200, `A release ${AMBIENTE_PYTHON_C02.releaseId} não está publicada`)
const { release, distribution } = await verifyStudioPythonDeployment(await metadados.json())
assert.equal(release.manifestSha256, AMBIENTE_PYTHON_C02.manifestSha256)
assert.equal(release.profileId, AMBIENTE_PYTHON_C02.profileId)
assert.equal(release.releaseId, AMBIENTE_PYTHON_C02.releaseId)
assert.equal(distribution.pythonVersion, AMBIENTE_PYTHON_C02.pythonVersion)
assert.deepEqual(release.manifest.extensions, EXTENSOES_DA_RELEASE_C02)
const distribuicao = path.join(cache, 'publicadas', release.manifestSha256)
// O host não serve `_http/gzip/*` pelo caminho: é a representação gzip do arquivo lógico, entregue
// a quem aceita gzip. Pede assim e guarda os bytes comprimidos, sem descomprimir.
const comprimido = new Map(
  distribution.httpRepresentations?.map((item) => [item.artifactPath, item.path]),
)
for (const file of distribution.files) {
  const target = path.join(distribuicao, file.path)
  const guardado = await readFile(target).catch(() => null)
  if (guardado && sha256(guardado) === file.sha256) continue
  const logico = comprimido.get(file.path)
  const resposta: Response = await fetch(
    `${host}${studioPythonRuntimeRoute(release.manifestSha256)}${logico ?? file.path}`,
    {
      signal: AbortSignal.timeout(120_000),
      ...(logico ? { headers: { 'Accept-Encoding': 'gzip' }, decompress: false } : {}),
    },
  )
  assert.equal(resposta.status, 200, file.path)
  const bytes = new Uint8Array(await resposta.arrayBuffer())
  assert.equal(sha256(bytes), file.sha256, `${file.path} difere da release`)
  await mkdir(path.dirname(target), { recursive: true })
  await writeFile(target, bytes)
}
await writeFile(
  path.join(distribuicao, 'distribution.json'),
  `${JSON.stringify(distribution, null, 2)}\n`,
)

const imageTag = process.env.STUDIO_PYTHON_TEST_IMAGE ?? 'sistemazero-studio-runtime:verify'
async function docker(args: string[]) {
  const child = Bun.spawn(['docker', ...args], {
    windowsHide: true,
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const [exit, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ])
  return { exit, stdout, stderr }
}
const pin = await docker(['image', 'inspect', imageTag, '--format', '{{.Id}}'])
assert.equal(pin.exit, 0, pin.stderr)
const image = pin.stdout.trim()
assert.match(image, /^sha256:[a-f0-9]{64}$/)
const perfil = await docker([
  'run',
  '--rm',
  '--network',
  'none',
  '--entrypoint',
  'cat',
  image,
  '/opt/sz-runtime/validation-profile.json',
])
assert.equal(perfil.exit, 0, perfil.stderr)
assert.deepEqual(
  JSON.parse(perfil.stdout),
  JSON.parse(
    await readFile(
      path.join(root, 'packages/studio-runtime/runtime/validation-profile.json'),
      'utf8',
    ),
  ),
  'A prova exige a imagem de produção atual',
)

type Cenario = { nome: string; projeto: unknown; ids?: readonly string[]; passa: boolean }
const ilhas = [
  { ilha: 'recife', arquivo: 'recife/recife-python', erros: CENARIOS_DO_RECIFE },
  { ilha: 'pico', arquivo: 'pico/pico-python', erros: CENARIOS_DO_PICO },
].filter(({ ilha }) => !argumento('ilha') || ilha === argumento('ilha'))
const evidencia = path.join(cache, 'desafios-python', crypto.randomUUID())
await mkdir(evidencia, { recursive: true })
const placar = { execucoes: 0, objetivos: 0, falhas: [] as string[] }

async function rodar(slug: string, cenario: Cenario, objetivos: PythonProjectExecutionObjective[]) {
  const directory = path.join(evidencia, `${slug}-${cenario.nome}`)
  await mkdir(path.join(directory, 'project'), { recursive: true })
  const snapshot = await preparePythonExecutionSnapshot(cenario.projeto)
  for (const file of snapshot.files) {
    const target = path.join(directory, 'project', file.path)
    await mkdir(path.dirname(target), { recursive: true })
    await writeFile(target, file.bytes)
  }
  const metadata = {
    ...snapshot,
    files: snapshot.files.map(({ bytes, ...file }) => ({ ...file, byteLength: bytes.byteLength })),
  }
  const plan = await preparePythonProjectExecution(
    {
      projectId: metadata.projectId,
      revision: metadata.revision,
      runtimeManifestSha256: release.manifestSha256,
      runId: crypto.randomUUID(),
    },
    objetivos,
  )
  const mission = pythonMissionRequest(plan)
  await writeFile(
    path.join(directory, 'python-mission-options.json'),
    JSON.stringify({
      version: 1,
      runtimeManifestSha256: release.manifestSha256,
      runtimeFiles: studioPythonLogicalFiles(distribution),
      runtimeDeployment: { release, distribution },
      runtimeContentSecurityPolicy: pythonFrameContentSecurityPolicy(
        `https://studio-python-runtime.invalid/v1/runtimes/${release.manifestSha256}/`,
      ),
      payload: { version: 1, name: '', snapshot: metadata },
      mission,
    }),
  )
  if (process.platform !== 'win32') await chmod(directory, 0o777)
  const container = `sz-desafio-${crypto.randomUUID().replaceAll('-', '')}`
  const comando = [
    'run',
    '--rm',
    '--name',
    container,
    '--network',
    'none',
    '--memory',
    '1g',
    '--cpus',
    '1',
    '--pids-limit',
    '256',
    '--read-only',
    '--cap-drop',
    'ALL',
    '--security-opt',
    'no-new-privileges',
    '--tmpfs',
    '/tmp:rw,nosuid,nodev,size=256m',
    '--mount',
    `type=bind,source=${directory},target=/workspace/mission`,
    '--mount',
    `type=bind,source=${distribuicao},target=/workspace/mission/runtime,readonly`,
    '--workdir',
    '/workspace/mission',
    '--entrypoint',
    'node',
    image,
    '/opt/sz-runtime/python-mission.mjs',
  ]
  const timer = setTimeout(() => void docker(['stop', '--time', '1', container]), 240_000)
  try {
    const processo = await docker(comando)
    await writeFile(path.join(directory, 'process.json'), JSON.stringify(processo))
    assert.equal(processo.exit, 0, processo.stdout + processo.stderr)
    const raw = JSON.parse(
      await readFile(path.join(directory, 'python-mission-result.json'), 'utf8'),
    )
    const resultados = judgePythonProjectExecution(plan, raw.mission)
    // O Members só aprova com o programa saudável (`report.status === 'passed'`) em cada execução.
    const saudavel = (raw.executions as { report: { status: string; errors: unknown[] } }[]).every(
      (e) => e.report.status === 'passed' && e.report.errors.length === 0,
    )
    await writeFile(path.join(directory, 'judge.json'), JSON.stringify({ saudavel, resultados }))
    console.log(JSON.stringify({ slug, cenario: cenario.nome, saudavel, resultados }))
    placar.execucoes++
    placar.objetivos += resultados.length
    if (cenario.passa && !saudavel) placar.falhas.push(`${slug}/${cenario.nome}: programa com erro`)
    const esperado = objetivos.map(() => cenario.passa)
    const obtido = objetivos.map((o) => resultados.find((r) => r.id === o.id)?.passed === true)
    if (JSON.stringify(esperado) !== JSON.stringify(obtido))
      placar.falhas.push(`${slug}/${cenario.nome}: esperado ${esperado}, obtido ${obtido}`)
  } finally {
    clearTimeout(timer)
    await docker(['rm', '-f', container])
  }
}

for (const { arquivo, erros } of ilhas)
  for (const publico of ['', '-adulto']) {
    const manifesto = ManifestoDeDesafiosSchema.parse(
      JSON.parse(
        await readFile(
          path.join(root, `docs/desafios-do-jogo/${arquivo}${publico}.manifesto.json`),
          'utf8',
        ),
      ),
    )
    for (const d of manifesto.desafios) {
      const objetivos = d.conteudo.objetivos.map((o) => {
        assert.equal(o.programmingLanguage, 'python')
        return {
          id: o.id,
          rule: o.rule as PythonProjectExecutionObjective['rule'],
          ...('stdin' in o && o.stdin ? { stdin: o.stdin } : {}),
        }
      })
      // Os dois públicos guardam os mesmos projetos; os erros rodam uma vez, no Kids.
      const cenarios: Cenario[] = [
        { nome: 'gabarito', projeto: d.conteudo.gabarito, passa: true },
        { nome: 'inicial', projeto: d.conteudo.projetoInicial, passa: false },
        ...(publico ? [] : erros()),
      ]
      for (const cenario of cenarios) {
        if (argumento('cenario') && argumento('cenario') !== cenario.nome) continue
        await rodar(
          d.slug,
          cenario,
          objetivos.filter((o) => !cenario.ids || cenario.ids.includes(o.id)),
        )
      }
    }
  }
console.log(JSON.stringify({ placar, evidencia }))
assert.deepEqual(placar.falhas, [])
