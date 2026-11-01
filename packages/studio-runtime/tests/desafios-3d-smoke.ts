/**
 * Os desafios 3D das ilhas (lacunas, 01/11/2026) no executor de verdade: a imagem do
 * `studio-runtime` (`sistemazero-studio-runtime:verify`), sem rede, abre o documento que o Members
 * prepara (`prepareClassicCheckDocument`) e confere os objetivos. Para cada ilha, o projeto
 * inicial não cumpre nenhum objetivo e o gabarito cumpre todos, inclusive o extra.
 *
 * Rodar: bun packages/studio-runtime/tests/desafios-3d-smoke.ts [--ilha=pico]
 */
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { isSectionExecutionRule, judgeExecutionObservation } from '@sistemazero/core/learning'
import {
  DESAFIOS_3D,
  objetivosTresD,
  projetoTresD,
} from '../../../docs/desafios-do-jogo/tres-d/projetos'
import { createCheckScope, prepareClassicCheckDocument } from '../../studio/src/check/serverCheck'

const root = path.resolve(import.meta.dirname, '../../..')
const cache =
  process.env.STUDIO_PYTHON_TEST_CACHE ?? path.join(root, '.cache/studio-python-runtime')
const tag = process.env.STUDIO_PYTHON_TEST_IMAGE ?? 'sistemazero-studio-runtime:verify'
const ilha = process.argv.find((a) => a.startsWith('--ilha='))?.slice('--ilha='.length)

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
const pin = await docker(['image', 'inspect', tag, '--format', '{{.Id}}'])
assert.equal(pin.exit, 0, pin.stderr)
const image = pin.stdout.trim()
const evidence = path.join(cache, 'desafios-3d', crypto.randomUUID())
await mkdir(evidence, { recursive: true })

const desafios = DESAFIOS_3D.filter((d) => !ilha || d.ilha === ilha)
assert.ok(desafios.length > 0, `Ilha sem desafio 3D: ${ilha}`)
let falhas = 0
for (const d of desafios)
  for (const pronto of [false, true]) {
    const scope = createCheckScope()
    const objectives = objetivosTresD(d).map((o) => {
      if (!isSectionExecutionRule(o.rule)) throw new Error(`Objetivo sem execução: ${o.id}`)
      return { id: o.id, rule: o.rule }
    })
    const document = await prepareClassicCheckDocument(projetoTresD(d, pronto), scope)
    const options = { mode: 'classic', scope, objectives, screenshots: false, deadlineMs: 75_000 }
    const script = `const fs=require('node:fs'),cp=require('node:child_process');const root='/workspace/builds/proof';fs.mkdirSync(root,{recursive:true});process.chdir(root);fs.writeFileSync('game.html',${JSON.stringify(document)});fs.writeFileSync('check-options.json',${JSON.stringify(JSON.stringify(options))});cp.execFileSync(process.execPath,['/opt/sz-runtime/check-objectives.mjs'],{cwd:root,timeout:80000,stdio:'pipe'});console.log(fs.readFileSync('check-result.json','utf8'));`
    const name = `sz-desafio-3d-${crypto.randomUUID().replaceAll('-', '')}`
    const child = Bun.spawn(
      [
        'docker',
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
      {
        windowsHide: true,
        stdin: new TextEncoder().encode(script),
        stdout: 'pipe',
        stderr: 'pipe',
      },
    )
    const timer = setTimeout(() => void docker(['stop', '--time', '1', name]), 100_000)
    try {
      const [exit, stdout, stderr] = await Promise.all([
        child.exited,
        new Response(child.stdout).text(),
        new Response(child.stderr).text(),
      ])
      const caso = `${d.ilha}-${pronto ? 'gabarito' : 'inicial'}`
      if (exit !== 0) {
        falhas++
        await writeFile(path.join(evidence, `${caso}.erro.txt`), `${stderr}\n${stdout}`)
        console.log(`FALHA ${caso}: o executor parou (${stderr.trim().split('\n').at(-1)})`)
        continue
      }
      const report = JSON.parse(stdout)
      const results = objectives.map((o) => ({
        id: o.id,
        ...judgeExecutionObservation(
          o.rule,
          report.observations.find((x: { id: string }) => x.id === o.id),
        ),
      }))
      const certo = results.every((r) => r.passed === pronto)
      if (!certo) falhas++
      await writeFile(
        path.join(evidence, `${caso}.json`),
        JSON.stringify({ image, results, report }, null, 2),
      )
      console.log(
        `${certo ? 'ok   ' : 'FALHA'} ${caso}: ${results.map((r) => `${r.id}=${r.passed}`).join(' ')}`,
      )
    } finally {
      clearTimeout(timer)
      await docker(['rm', '-f', name])
    }
  }
console.log(`evidência: ${evidence}`)
assert.equal(falhas, 0, `${falhas} caso(s) com resultado errado`)
