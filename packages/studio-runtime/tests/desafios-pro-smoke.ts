import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  type ExecutionObjectiveRequest,
  executionObservationUnavailableReason,
  judgeExecutionObservation,
} from '@sistemazero/core/learning'
import { CENARIOS_DO_FAROL_PRO } from '../../../docs/desafios-do-jogo/farol/linguagens'
import { CENARIOS_DAS_NUVENS } from '../../../docs/desafios-do-jogo/nuvens/pro-projetos'
import { ManifestoDeDesafiosSchema } from '../../arquipelago-contracts/src/desafios'
import { createCheckScope, proCheckSourceFiles } from '../../studio/src/check/serverCheck'
import type { Project } from '../../studio/src/core/project'
import {
  CHECK_ENTRY_PATH,
  parseCheckRequest,
  proCheckEntry,
  proCheckModules,
  withCheckEntry,
} from '../src/check'
import { trustedPackageJson, trustedViteConfig } from '../src/contracts'

/**
 * C02 (30/10/2026): o Jardim das Nuvens (JavaScript Pro) no executor REAL: a imagem de produção do
 * studio-runtime, sem rede, faz o `vite build` offline com o `package.json` e o `vite.config.mjs`
 * confiáveis do modelo, como o `/v1/check` (`src/index.ts`), e roda `check-objectives.mjs`. Os
 * arquivos saem do `proCheckSourceFiles`, o mesmo que o Members manda. Julgamento do core.
 * Mesmo molde do `three-objectives-smoke.ts`.
 *
 *   bun packages/studio-runtime/tests/desafios-pro-smoke.ts [--ilha=nuvens|farol] [--cenario=<nome>]
 */
const root = path.resolve(import.meta.dirname, '../../..')
const cache =
  process.env.STUDIO_PYTHON_TEST_CACHE ?? path.join(root, '.cache/studio-python-runtime')
const tag = process.env.STUDIO_PYTHON_TEST_IMAGE ?? 'sistemazero-studio-runtime:verify'
const somente = process.argv.find((arg) => arg.startsWith('--cenario='))?.slice(10)
const soIlha = process.argv.find((arg) => arg.startsWith('--ilha='))?.slice(7)
async function docker(args: string[], stdin?: string) {
  const child = Bun.spawn(['docker', ...args], {
    windowsHide: true,
    ...(stdin === undefined ? {} : { stdin: new TextEncoder().encode(stdin) }),
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
const pin = await docker(['image', 'inspect', tag, '--format', '{{.Id}}'])
assert.equal(pin.exit, 0, pin.stderr)
const image = pin.stdout.trim()
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

const evidencia = path.join(cache, 'desafios-pro', crypto.randomUUID())
await mkdir(evidencia, { recursive: true })
const placar = { execucoes: 0, objetivos: 0, falhas: [] as string[] }

async function rodar(
  slug: string,
  nome: string,
  projeto: Project,
  objetivos: ExecutionObjectiveRequest[],
  passa: boolean,
) {
  const scope = createCheckScope()
  const templateId = projeto.proMeta?.templateId
  assert.ok(templateId)
  const request = parseCheckRequest({
    mode: 'pro',
    executionId: `desafio-${crypto.randomUUID()}`,
    scope,
    templateId,
    files: proCheckSourceFiles(projeto as Project & { kind: 'pro' }),
    objectives: objetivos,
  })
  if (request.mode !== 'pro') throw Error('Pedido Pro ausente')
  const modules = proCheckModules(objetivos)
  const files = {
    ...request.build.files,
    'index.html': withCheckEntry(request.build.files['index.html'] ?? ''),
    [CHECK_ENTRY_PATH]: proCheckEntry(scope, modules),
    'package.json': trustedPackageJson(request.build.templateId, request.build.dependencies),
    'vite.config.mjs': trustedViteConfig(request.build.templateId, request.build.dependencies),
  }
  const options = {
    mode: 'pro',
    scope,
    kit: false,
    objectives: objetivos,
    screenshots: false,
    deadlineMs: 75_000,
  }
  const script = `const fs=require('node:fs'),cp=require('node:child_process'),path=require('node:path');const root='/workspace/builds/proof';fs.mkdirSync(root,{recursive:true});process.chdir(root);const files=${JSON.stringify(files)};for(const [name,content] of Object.entries(files)){fs.mkdirSync(path.dirname(name),{recursive:true});fs.writeFileSync(name,content)};fs.symlinkSync('/opt/sz-runtime/node_modules','node_modules');let build;try{build=cp.execFileSync(process.execPath,['/opt/sz-runtime/node_modules/vite/bin/vite.js','build','--config','./vite.config.mjs','--configLoader','native'],{cwd:root,timeout:60000,stdio:'pipe'}).toString()}catch(e){console.log(JSON.stringify({build:'falhou',output:String(e.stdout)+String(e.stderr)}));process.exit(0)};fs.writeFileSync('check-options.json',${JSON.stringify(JSON.stringify(options))});cp.execFileSync(process.execPath,['/opt/sz-runtime/check-objectives.mjs'],{cwd:root,timeout:90000,stdio:'pipe'});console.log(JSON.stringify({build:'ok',report:JSON.parse(fs.readFileSync('check-result.json','utf8'))}));`
  const name = `sz-desafio-pro-${crypto.randomUUID().replaceAll('-', '')}`
  const directory = path.join(evidencia, `${slug}-${nome}`)
  await mkdir(directory, { recursive: true })
  const timer = setTimeout(() => void docker(['stop', '--time', '1', name]), 200_000)
  try {
    const processo = await docker(
      [
        'run',
        '--rm',
        '--name',
        name,
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
        '/workspace/builds:rw,nosuid,nodev,uid=1000,gid=1000,size=512m',
        '--tmpfs',
        '/tmp:rw,nosuid,nodev,size=256m',
        '--entrypoint',
        'node',
        '-i',
        image,
      ],
      script,
    )
    await writeFile(path.join(directory, 'process.json'), JSON.stringify(processo))
    assert.equal(processo.exit, 0, processo.stderr)
    const saida = JSON.parse(processo.stdout)
    assert.equal(saida.build, 'ok', saida.output)
    const resultados = objetivos.map((o) => {
      const observacao = saida.report.observations.find((x: { id: string }) => x.id === o.id)
      const indisponivel = executionObservationUnavailableReason(o.rule, observacao)
      return { id: o.id, indisponivel, ...judgeExecutionObservation(o.rule, observacao) }
    })
    await writeFile(path.join(directory, 'judge.json'), JSON.stringify(resultados))
    console.log(JSON.stringify({ slug, cenario: nome, resultados }))
    placar.execucoes++
    placar.objetivos += resultados.length
    for (const r of resultados)
      if (r.indisponivel) placar.falhas.push(`${slug}/${nome}/${r.id}: ${r.indisponivel}`)
    const esperado = objetivos.map(() => passa)
    const obtido = resultados.map((r) => r.passed)
    if (JSON.stringify(esperado) !== JSON.stringify(obtido))
      placar.falhas.push(`${slug}/${nome}: esperado ${esperado}, obtido ${obtido}`)
  } finally {
    clearTimeout(timer)
    await docker(['rm', '-f', name])
  }
}

// A29: o projeto autoral do Farol no Pro roda junto com o Jardim das Nuvens.
const pacotes = [
  { ilha: 'nuvens', arquivo: 'nuvens/nuvens-pro', erros: CENARIOS_DAS_NUVENS },
  {
    ilha: 'farol',
    arquivo: 'farol/farol-pro',
    erros: CENARIOS_DO_FAROL_PRO,
    // Cenário aberto (Lenda): o inicial não quebra ao ser jogado; falha na ficha e no R.
    inicialFalha: ['objetivo', 'funcionalidades', 'recomeca'],
  },
].filter((p) => !soIlha || p.ilha === soIlha)
for (const { arquivo, erros, ...resto } of pacotes)
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
      const objetivos = d.conteudo.objetivos.map((o) => ({
        id: o.id,
        rule: o.rule as ExecutionObjectiveRequest['rule'],
      }))
      const cenarios = [
        { nome: 'gabarito', projeto: d.conteudo.gabarito as Project, passa: true },
        {
          nome: 'inicial',
          projeto: d.conteudo.projetoInicial as Project,
          passa: false,
          ...('inicialFalha' in resto ? { ids: resto.inicialFalha } : {}),
        },
        ...(publico ? [] : erros()),
      ] as { nome: string; projeto: Project; ids?: readonly string[]; passa: boolean }[]
      for (const cenario of cenarios) {
        if (somente && somente !== cenario.nome) continue
        await rodar(
          d.slug,
          cenario.nome,
          cenario.projeto,
          objetivos.filter((o) => !cenario.ids || cenario.ids.includes(o.id)),
          cenario.passa,
        )
      }
    }
  }
console.log(JSON.stringify({ placar, evidencia }))
assert.deepEqual(placar.falhas, [])
