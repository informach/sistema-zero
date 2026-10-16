import { afterEach, expect, test } from 'bun:test'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { JsonRpcClient } from '../src/main/json-rpc'
import { collectProcess, nativeEnvironment } from '../src/main/native-client'

const clients: JsonRpcClient[] = []
afterEach(() => {
  for (const client of clients.splice(0)) client.close()
})

function protocol(body: string) {
  const child = spawn(
    process.execPath,
    [
      '-e',
      `
    const readline = require('node:readline');
    const send = (value) => process.stdout.write(JSON.stringify(value) + '\\n');
    readline.createInterface({input: process.stdin}).on('line', (line) => {
      const message = JSON.parse(line); ${body}
    });
  `,
    ],
    { stdio: 'pipe', windowsHide: true, env: nativeEnvironment() },
  )
  const client = new JsonRpcClient(child)
  clients.push(client)
  return { client, child }
}

test('reconstitui mensagens fragmentadas e recusa aprovação nativa', async () => {
  const { client } = protocol(`
    if (message.method === 'start') {
      process.stdout.write('{"id":' + message.id);
      setTimeout(() => {
        process.stdout.write(',"result":{"ok":true}}\\n');
        send({id: 'approval', method: 'item/commandExecution/requestApproval', params: {}});
      }, 10);
    } else if (message.id === 'approval') {
      send({method: 'approval-result', params: {code: message.error.code}});
    }
  `)
  const notification = once(client, 'notification')
  expect(await client.request('start', {})).toEqual({ ok: true })
  expect((await notification)[0]).toEqual({ method: 'approval-result', params: { code: -32601 } })
})

test('queda do processo rejeita pedidos pendentes e não deixa conexão utilizável', async () => {
  const { client } = protocol('process.exit(1)')
  await expect(client.request('start', {})).rejects.toThrow('encerrada')
  await expect(client.request('retry', {})).rejects.toThrow('encerrado')
})

test('timeout encerra a sessão e impede resposta tardia de parecer sucesso', async () => {
  const { client } = protocol('setTimeout(() => send({id: message.id, result: true}), 2000)')
  await expect(client.request('slow', {}, 100)).rejects.toThrow('no prazo')
  await expect(client.request('retry', {})).rejects.toThrow('encerrado')
})

test('erro do protocolo mantém contexto sem revelar credencial', async () => {
  const { client } = protocol(
    'send({id: message.id, error: {code: 401, message: "Bearer secret-value sk-test-secret"}})',
  )
  try {
    await client.request('account/read', {})
    throw new Error('Deveria falhar')
  } catch (error) {
    expect((error as Error).message).toContain('account/read (401)')
    expect((error as Error).message).not.toContain('secret')
  }
})

test('cancelamento encerra processo nativo sem reportar resultado', async () => {
  const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], {
    stdio: 'pipe',
    windowsHide: true,
    env: nativeEnvironment(),
  })
  const abort = new AbortController()
  const closed = once(child, 'close')
  const completion = collectProcess(child, 5000, abort.signal)
  abort.abort()
  await expect(completion).rejects.toThrow('cancelada')
  await closed
})
