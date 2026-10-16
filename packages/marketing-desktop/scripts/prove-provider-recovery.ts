import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { runProvider } from '../src/main/providers'

const directory = path.resolve(`.cache/recovery-${Date.now().toString(36)}`)
const evidence = []
for (const provider of ['codex', 'claude'] as const) {
  const cwd = path.join(directory, provider)
  await mkdir(cwd, { recursive: true })
  const request = {
    provider,
    kind: 'copy' as const,
    prompt:
      'Escreva uma única frase em português convidando um responsável a conhecer uma atividade de criação de jogos. Não prometa resultados. Não use ferramentas.',
  }
  const generated = await runProvider(
    request,
    cwd,
    AbortSignal.timeout(120000),
    () => {},
    undefined,
    'checkpoint',
  )
  const stages: string[] = [],
    started = Date.now()
  const recovered = await runProvider(
    request,
    cwd,
    AbortSignal.timeout(10000),
    (stage) => stages.push(stage),
    undefined,
    'only',
  )
  if (JSON.stringify(generated) !== JSON.stringify(recovered))
    throw new Error('Resposta recuperada divergiu da original')
  if (stages.length !== 1 || !stages[0]?.includes('sem nova geração'))
    throw new Error('A recuperação entrou em produção')
  const result = {
    provider,
    mode: generated.mode,
    identical: true,
    recoveryMs: Date.now() - started,
    stages,
  }
  evidence.push(result)
  console.log(JSON.stringify(result))
}
await writeFile(path.join(directory, 'evidence.json'), JSON.stringify(evidence, null, 2))
console.log(JSON.stringify({ evidence: path.join(directory, 'evidence.json') }))
