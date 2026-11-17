import { expect, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'

const workflow = Bun.YAML.parse(readFileSync('.github/workflows/ci.yml', 'utf8')) as {
  jobs: { ci: { steps: { name: string; run?: string; env?: Record<string, string> }[] } }
}
const etapa = workflow.jobs.ci.steps.find((s) => s.name === 'Typecheck (todos os pacotes)')!

function executar(falhar: boolean) {
  const pasta = mkdtempSync(join(tmpdir(), 'sz-ci-typecheck-'))
  // O alvo é imutável e conferido antes do ensaio e de qualquer remoção recursiva.
  if (
    dirname(resolve(pasta)) !== resolve(tmpdir()) ||
    !basename(pasta).startsWith('sz-ci-typecheck-')
  )
    throw Error('Diretório temporário fora do alvo esperado')
  try {
    writeFileSync(
      join(pasta, 'package.json'),
      JSON.stringify({
        name: 'qa-typecheck',
        private: true,
        workspaces: ['packages/a', 'packages/b'],
      }),
    )
    for (const nome of ['a', 'b']) {
      mkdirSync(join(pasta, 'packages', nome), { recursive: true })
      writeFileSync(
        join(pasta, 'packages', nome, 'package.json'),
        JSON.stringify({
          name: `@qa/${nome}`,
          scripts: { typecheck: `bun ../../probe.mjs ${nome}` },
        }),
      )
    }
    writeFileSync(
      join(pasta, 'probe.mjs'),
      String.raw`
import {openSync, closeSync, appendFileSync, unlinkSync} from 'node:fs';
import {join} from 'node:path';
const nome=process.argv[2], trava=join(import.meta.dirname,'compilador.lock'), trace=join(import.meta.dirname,'trace.jsonl');
const fd=openSync(trava,'wx');
appendFileSync(trace,JSON.stringify({nome,fase:'inicio'})+'\n');
try { await new Promise(r=>setTimeout(r,350)); }
finally { closeSync(fd); unlinkSync(trava); }
appendFileSync(trace,JSON.stringify({nome,fase:'fim'})+'\n');
if(process.env.QA_TYPECHECK_FALHAR==='1') process.exitCode=23;
`,
    )
    const shell = process.platform === 'win32' ? 'C:/Program Files/Git/bin/bash.exe' : 'bash'
    const resultado = spawnSync(shell, ['--noprofile', '--norc', '-c', etapa.run!], {
      cwd: pasta,
      env: { ...process.env, ...etapa.env, QA_TYPECHECK_FALHAR: falhar ? '1' : '0' },
      encoding: 'utf8',
      timeout: 15_000,
    })
    const trace = readFileSync(join(pasta, 'trace.jsonl'), 'utf8')
      .trim()
      .split('\n')
      .map((s) => JSON.parse(s) as { nome: string; fase: string })
    return { resultado, trace }
  } finally {
    // Só remove o diretório criado para este ensaio, dentro do diretório temporário.
    rmSync(pasta, { recursive: true, force: true })
  }
}

test('a etapa real verifica todos os pacotes sem sobrepor compiladores', () => {
  const { resultado, trace } = executar(false)
  expect(resultado.status, resultado.stdout + resultado.stderr).toBe(0)
  expect(trace.map((r) => r.fase)).toEqual(['inicio', 'fim', 'inicio', 'fim'])
  expect(trace[0]?.nome).toBe(trace[1]?.nome)
  expect(trace[2]?.nome).toBe(trace[3]?.nome)
  expect(new Set(trace.map((r) => r.nome))).toEqual(new Set(['a', 'b']))
}, 20_000)

test('erros não viram sucesso e o pacote seguinte também é verificado', () => {
  const { resultado, trace } = executar(true)
  expect(resultado.status).not.toBe(0)
  expect(resultado.error).toBeUndefined()
  expect(new Set(trace.filter((r) => r.fase === 'fim').map((r) => r.nome))).toEqual(
    new Set(['a', 'b']),
  )
}, 20_000)
