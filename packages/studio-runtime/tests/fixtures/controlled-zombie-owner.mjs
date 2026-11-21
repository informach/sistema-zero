import { spawn } from 'node:child_process'
import { once } from 'node:events'

const child = spawn(
  process.execPath,
  ['-e', "process.stdout.write('ready');setInterval(()=>{},1000)"],
  { stdio: ['ignore', 'pipe', 'inherit'] },
)
await once(child.stdout, 'data')
console.log(JSON.stringify({ parent: process.pid, child: child.pid }))
await once(child, 'exit')
console.log('reaped')
