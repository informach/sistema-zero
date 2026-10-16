#!/usr/bin/env bun
import { realpath } from 'node:fs/promises'
import { eventSchema, runSchema, sessionSchema, terminalStates } from '@sistemazero/agent-core'
import { connectRuntime } from '@sistemazero/agent-runtime'
import { z } from 'zod'

const HELP = `Sistema Zero — agente local

  sistemazero                              Abrir TUI no workspace atual
  sistemazero run [--mode plan|build] "tarefa"  Executar e acompanhar em JSONL
  sistemazero tool [--session ID] NOME JSON  Executar capability pelo mesmo dispatcher
  sistemazero auth openrouter|brave|github|telegram  Segredo pelo stdin para o cofre
  sistemazero auth claude|codex login|logout       Cliente e login oficiais
  sistemazero auth staff request|verify EMAIL     Código de acesso do Sistema Zero
  sistemazero auth staff logout
  sistemazero auth mcp SERVIDOR REFERENCIA         Segredo pelo stdin
  sistemazero rpc METODO [JSON|--stdin]      API local; payload sensível exige stdin
  sistemazero doctor                       Verificar runtime, armazenamento e dependências
  sistemazero mcp [WORKSPACE] [plan|build]   Servidor MCP local autenticado
  sistemazero --help                       Ajuda sem carregar o renderer

TUI: /help, /connections, /models, /backend, /mode, /tasks, /team, /workflows,
/browser, /checkpoints, /attach, /fork, /export. F1 ajuda; Tab alterna foco.
Ctrl+C cancela a tarefa ativa; a interface pode ser fechada sem parar o supervisor.
SISTEMAZERO_HOME escolhe o perfil. Não coloque credenciais em argumentos ou prompts.
Integrações externas requerem suas configurações; assinaturas não viram chaves OpenRouter.`
export async function cli(args: string[]) {
  const [command, ...rest] = args
  if (command === '--help' || command === '-h') {
    console.log(HELP)
    return
  }
  if (command === '--version') {
    console.log('0.1.0')
    return
  }
  if (!command) {
    if (!process.stdin.isTTY || !process.stdout.isTTY)
      throw new Error('TUI requer terminal. Use run ou --help.')
    const { start } = await import('./app')
    await start(await realpath(process.cwd()))
    return
  }
  if (
    command === 'auth' &&
    (rest[0] === 'claude' || rest[0] === 'codex') &&
    (rest[1] === 'login' || rest[1] === 'logout')
  ) {
    const { nativeAuth } = await import('@sistemazero/agent-runtime/auth')
    await nativeAuth(rest[0], rest[1])
    return
  }
  if (command === 'mcp') {
    const { serveTools } = await import('@sistemazero/agent-runtime/mcp')
    await serveTools(rest[0] ?? process.cwd(), z.enum(['plan', 'build']).parse(rest[1] ?? 'plan'))
    return
  }
  const client = await connectRuntime()
  try {
    if (command === 'doctor') {
      const status = z
        .object({ readiness: z.string(), recoveryError: z.string().optional() })
        .passthrough()
      let runtime = status.parse(await client.request('ping'))
      const deadline = Date.now() + 25000
      while (runtime.readiness === 'recovering' && Date.now() < deadline) {
        await Bun.sleep(100)
        runtime = status.parse(await client.request('ping'))
      }
      console.log(
        JSON.stringify(
          {
            runtime,
            connections: await client.request('connections'),
            storage:
              runtime.readiness === 'ready'
                ? await client.request('storage.status')
                : { unavailable: runtime.recoveryError ?? runtime.readiness },
            bun: Bun.version,
            platform: process.platform,
            rg: Boolean(Bun.which('rg')),
            git: Boolean(Bun.which('git')),
            node: Bun.which('node') ?? null,
            docker: Bun.which('docker') ?? null,
            terminal: process.platform === 'win32' ? 'ConPTY + Job Object' : 'PTY unverified',
            support:
              process.platform === 'win32'
                ? 'Windows x64 tested; see docs/tui'
                : 'platform not homologated',
          },
          null,
          2,
        ),
      )
      if (runtime.readiness !== 'ready') process.exitCode = 1
      return
    }
    if (command === 'rpc') {
      if (!rest[0]) throw new Error('Informe o método')
      const sensitive = ['auth.set', 'mcp.secret', 'integration.secret', 'staff.otp.verify']
      if (sensitive.includes(rest[0]) && rest[1] !== '--stdin')
        throw new Error('Este método exige --stdin; credenciais não podem aparecer nos argumentos')
      const input = rest[1] === '--stdin' ? await readStdin(1_000_000) : rest[1]
      console.log(
        JSON.stringify(await client.request(rest[0], input ? JSON.parse(input) : {}), null, 2),
      )
      return
    }
    if (command === 'auth') {
      if (rest[0] === 'staff') {
        if (rest[1] === 'request') {
          await client.request('staff.otp.request', { email: rest[2] })
          console.log('Código solicitado. Use auth staff verify EMAIL com o código pelo stdin.')
          return
        }
        if (rest[1] === 'verify') {
          await client.request('staff.otp.verify', { email: rest[2], code: await readStdin(32) })
          console.log('Sistema Zero conectado.')
          return
        }
        if (rest[1] === 'logout') {
          await client.request('staff.logout')
          console.log('Sistema Zero desconectado.')
          return
        }
        throw new Error(
          'Uso: auth staff request|verify EMAIL ou auth staff logout. Configure o gateway com rpc staff.configure.',
        )
      }
      if (!['openrouter', 'brave', 'mcp', 'github', 'telegram'].includes(rest[0] ?? ''))
        throw new Error('Use auth openrouter|brave (stdin) ou auth claude|codex login|logout')
      const key = await readStdin(4096)
      if (rest[0] === 'mcp') {
        if (!rest[1] || !rest[2])
          throw new Error('Uso: auth mcp SERVIDOR REFERENCIA (segredo pelo stdin)')
        await client.request('mcp.secret', { server: rest[1], reference: rest[2], value: key })
      } else if (rest[0] === 'github' || rest[0] === 'telegram')
        await client.request('integration.secret', { kind: rest[0], value: key })
      else await client.request('auth.set', { provider: rest[0], key })
      console.log(`${rest[0]} conectado.`)
      return
    }
    if ((command !== 'run' && command !== 'tool') || !rest.length) throw new Error(HELP)
    let sessionId: string | undefined
    let mode: 'plan' | 'build' | undefined
    while (rest[0]?.startsWith('--')) {
      const option = rest.shift()
      const value = rest.shift()
      if (option === '--session') sessionId = z.string().min(1).parse(value)
      else if (option === '--mode') mode = z.enum(['plan', 'build']).parse(value)
      else throw new Error('Opção inválida: ' + option)
    }
    if (!rest.length) throw new Error('Informe a tarefa ou ferramenta')
    const workspace = await realpath(process.cwd())
    const session = sessionSchema.parse(
      sessionId
        ? await client.request('session.get', { id: sessionId })
        : await client.request('session.create', {
            workspace,
            title: rest.join(' ').slice(0, 100),
          }),
    )
    if (session.workspace !== workspace)
      throw new Error('Abra o CLI no workspace da sessão selecionada')
    const run = runSchema.parse(
      await client.request('run.start', {
        requestId: crypto.randomUUID(),
        sessionId: session.id,
        mode,
        input: rest.join(' '),
        ...(command === 'tool'
          ? { task: { kind: 'tool', name: rest[0], arguments: rest[1] ? JSON.parse(rest[1]) : {} } }
          : {}),
      }),
    )
    let cursor = 0
    let done = false
    const cancel = () => {
      void client
        .request('run.cancel', { id: run.id })
        .catch((error) => console.error(String(error)))
    }
    process.once('SIGINT', cancel)
    try {
      while (!done) {
        const events = z
          .array(eventSchema)
          .parse(await client.request('events', { runId: run.id, after: cursor, wait: true }))
        for (const event of events) {
          console.log(JSON.stringify(event))
          cursor = event.sequence
          if (event.type === 'run.state') {
            const state = runSchema.parse(event.payload)
            if (terminalStates.has(state.state)) {
              done = true
              if (state.state !== 'succeeded') process.exitCode = 1
            }
          }
        }
      }
    } finally {
      process.off('SIGINT', cancel)
    }
  } finally {
    client.close()
  }
}
async function readStdin(limit: number) {
  if (process.stdin.isTTY)
    throw new Error(
      'Forneça o conteúdo pelo stdin a partir de um gerenciador de segredos. Ele não será exibido.',
    )
  const chunks: Buffer[] = []
  let bytes = 0
  for await (const chunk of process.stdin) {
    const data = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    bytes += data.length
    if (bytes > limit) throw new Error('Entrada excede o limite permitido')
    chunks.push(data)
  }
  return Buffer.concat(chunks).toString('utf8').trim()
}
if (import.meta.main) {
  try {
    await cli(process.argv.slice(2))
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}
