import { expect, test } from 'bun:test'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Mailbox } from '../src/backends/contract'
import { Processes } from '../src/process/manager'
import { ProcessRpc } from '../src/process/rpc'

test('bidirectional owned native process routes fragmented replies and concurrent approval without deadlock', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'zero-native-rpc-'))
  const code = [
    'const readline=require("node:readline")',
    'const input=readline.createInterface({input:process.stdin})',
    'input.on("line",line=>{const message=JSON.parse(line);if(message.method==="start"){process.stdout.write(JSON.stringify({id:"approval",method:"approve",params:{command:"fixture"}})+"\\n");const response=JSON.stringify({id:message.id,result:{started:true}});process.stdout.write(response.slice(0,5));setTimeout(()=>process.stdout.write(response.slice(5)+"\\n"),20)}else if(message.id==="approval")setTimeout(()=>process.stdout.write(JSON.stringify({method:"completed",params:message.result})+"\\n"),40)})',
  ].join(';')
  const child = await new Processes(directory).open({
    executable: process.execPath,
    args: ['-e', code],
    cwd: directory,
  })
  const rpc = new ProcessRpc(child)
  const messages = new Mailbox<unknown>()
  rpc.onRequest = async () => ({ approved: true })
  rpc.onNotification = (_method, params) => messages.push(params)
  rpc.onFailure = (error) => messages.fail(error)
  try {
    expect(await rpc.request('start')).toEqual({ started: true })
    expect(await messages.take(AbortSignal.timeout(5000))).toEqual({ approved: true })
    expect(child.child.exitCode).toBeNull()
  } finally {
    await rpc.close()
  }
}, 20000)
test('native process ending before its response rejects the call', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'zero-native-exit-'))
  const child = await new Processes(directory).open({
    executable: process.execPath,
    args: ['-e', 'process.stdin.once("data",()=>process.exit(0))'],
    cwd: directory,
  })
  const rpc = new ProcessRpc(child)
  try {
    await expect(rpc.request('start')).rejects.toThrow('ended before')
  } finally {
    await rpc.close()
  }
}, 20000)
