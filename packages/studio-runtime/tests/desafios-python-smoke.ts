import assert from 'node:assert/strict'
import { chmod, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  judgePythonProjectExecution,
  type PythonProjectExecutionObjective,
  preparePythonProjectExecution,
} from '@sistemazero/core/learning'
import { pythonMissionRequest } from '@sistemazero/core/studio/python-mission-execution'
import { studioPythonLogicalFiles } from '@sistemazero/core/studio/python-runtime-distribution'
import { pythonFrameContentSecurityPolicy } from '@sistemazero/core/studio/python-runtime-policy'
import { createStudioRuntimeRelease } from '@sistemazero/core/studio/runtime-catalog'
import {
  AMBIENTE_PYTHON_C02,
  EXTENSOES_DA_RELEASE_C02,
} from '../../../docs/desafios-do-jogo/ambiente-python'
import { CENARIOS_DO_PICO } from '../../../docs/desafios-do-jogo/pico/python-projetos'
import { CENARIOS_DO_RECIFE } from '../../../docs/desafios-do-jogo/recife/python-projetos'
import { ManifestoDeDesafiosSchema } from '../../arquipelago-contracts/src/desafios'
import { buildPythonRuntimeDistribution } from '../../studio/scripts/build-python-runtime'
import { preparePythonExecutionSnapshot } from '../../studio/src/runtime/python/snapshot'

/**
 * C02 (30/10/2026): os desafios Python do Recife e do Pico no executor Python REAL: a imagem de
 * produção do studio-runtime (Chromium e Pyodide, sem rede) roda `python-mission.mjs` com a
 * distribuição construída do vendor verificado, e o julgamento é o `judgePythonProjectExecution`
 * do core, o mesmo do `PythonProjectCheckerService`. O retrato do projeto sai do
 * `preparePythonExecutionSnapshot`, o mesmo que o Members usa. Mesmo molde do
 * `python-mission-smoke.ts`.
 *
 *   bun packages/studio-runtime/tests/desafios-python-smoke.ts [--release] [--ilha=recife|pico]
 *     [--cenario=<nome>]
 *
 * `--release` só constrói a distribuição e imprime a release (para `ambiente-python.ts`).
 * Variáveis: `STUDIO_PYTHON_TEST_CACHE` (vendor e distribuições) e `STUDIO_PYTHON_TEST_IMAGE`.
 */
const root = path.resolve(import.meta.dirname, '../../..')
const cache =
  process.env.STUDIO_PYTHON_TEST_CACHE ?? path.join(root, '.cache/studio-python-l0/missions')
const argumento = (nome: string) =>
  process.argv.find((arg) => arg.startsWith(`--${nome}=`))?.slice(nome.length + 3)

const build = await buildPythonRuntimeDistribution({
  vendorDirectory: path.join(cache, 'vendor'),
  outputDirectory: path.join(cache, 'distributions'),
})
const release = await createStudioRuntimeRelease({
  manifestVersion: 1,
  profileId: AMBIENTE_PYTHON_C02.profileId,
  releaseId: AMBIENTE_PYTHON_C02.releaseId,
  programmingLanguage: 'python',
  kinds: ['classic', 'pro'],
  modes: ['blocks', 'bridge', 'code'],
  capabilities: ['execute'],
  extensions: EXTENSOES_DA_RELEASE_C02.map(({ id, versions }) => ({ id, versions: [...versions] })),
  sourceTargets: ['browser', 'desktop'],
  requiredBrowserFeatures: ['wasm', 'worker', 'jspi', 'trusted-types'],
  artifacts: build.manifest.files.map(({ path, sha256 }) => ({ path, sha256 })),
  python: {
    version: build.manifest.pythonVersion,
    packages: [],
    providedModules: build.manifest.providedModules,
    features: build.manifest.features,
  },
})
if (process.argv.includes('--release')) {
  console.log(
    JSON.stringify({
      manifestSha256: release.manifestSha256,
      pythonVersion: build.manifest.pythonVersion,
      features: build.manifest.features,
      distribution: build.directory,
    }),
  )
  process.exit(0)
}
assert.equal(
  release.manifestSha256,
  AMBIENTE_PYTHON_C02.manifestSha256,
  'A release da prova mudou: atualize ambiente-python.ts e regenere os manifestos.',
)
assert.equal(build.manifest.pythonVersion, AMBIENTE_PYTHON_C02.pythonVersion)

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
      runtimeFiles: studioPythonLogicalFiles(build.manifest),
      runtimeDeployment: { release, distribution: build.manifest },
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
    `type=bind,source=${build.directory},target=/workspace/mission/runtime,readonly`,
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
