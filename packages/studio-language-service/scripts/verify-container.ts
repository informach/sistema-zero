import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const name = `sz-python-language-${crypto.randomUUID()}`
const token = crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '')
const evidence: Record<string, unknown> = {
  createdAt: new Date().toISOString(),
  image: 'sistemazero-python-language:verify',
  name,
}
const command = (args: string[]) => {
  const result = spawnSync('docker', args, { encoding: 'utf8', windowsHide: true, timeout: 30_000 })
  assert.equal(result.status, 0, result.stderr)
  return result.stdout.trim()
}
const imageId = command([
  'image',
  'inspect',
  'sistemazero-python-language:verify',
  '--format',
  '{{.Id}}',
])
evidence.imageId = imageId
let started = false
try {
  command([
    'run',
    '-d',
    '--name',
    name,
    '--network',
    'none',
    '--user',
    '1000:1000',
    '--read-only',
    '--cap-drop',
    'ALL',
    '--security-opt',
    'no-new-privileges',
    '--memory',
    '512m',
    '--memory-swap',
    '512m',
    '--cpus',
    '1',
    '--pids-limit',
    '64',
    '--tmpfs',
    '/tmp:rw,noexec,nosuid,nodev,size=16m',
    '--tmpfs',
    '/workspace:rw,noexec,nosuid,nodev,size=32m,uid=1000,gid=1000',
    '--env',
    `PYTHON_LANGUAGE_TOKEN=${token}`,
    '--entrypoint',
    '/usr/local/bin/node',
    'sistemazero-python-language:verify',
    '--max-old-space-size=96',
    '/opt/language/server.mjs',
  ])
  started = true
  const inspect = JSON.parse(command(['inspect', name]))[0]
  evidence.isolation = {
    network: inspect.HostConfig.NetworkMode,
    user: inspect.Config.User,
    readonly: inspect.HostConfig.ReadonlyRootfs,
    memory: inspect.HostConfig.Memory,
    nanoCpus: inspect.HostConfig.NanoCpus,
    pids: inspect.HostConfig.PidsLimit,
    capDrop: inspect.HostConfig.CapDrop,
    securityOpt: inspect.HostConfig.SecurityOpt,
  }
  // Requests execute inside the no-network container through stdin, never an exposed port.
  const probe = String.raw`
const assert=require('node:assert/strict'); const fs=require('node:fs');
let token='';process.stdin.setEncoding('utf8');process.stdin.on('data',s=>token+=s);process.stdin.on('end',async()=>{
 const base='http://127.0.0.1:8789';const headers={'content-type':'application/json',authorization:'Bearer '+token};
 for(let n=0;;n++){try{const response=await fetch(base+'/healthz',{headers});assert.equal(response.status,200);break}catch(e){if(n>40)throw e;await new Promise(r=>setTimeout(r,100))}}
 let id=0;const send=async(body)=>{const response=await fetch(base+'/command',{method:'POST',headers,body:JSON.stringify({version:1,id:'r'+(++id),...body})});assert.equal(response.status,200);return response.json()};
 const source='from helper import value\nimport turtle\npen = turtle.Turtle()\npen.\n';
 const began=performance.now();
 assert.equal((await send({kind:'sync',entrypoint:'src/main.py',baseRevision:0,revision:1,changes:[{path:'src/main.py',version:1,source},{path:'helper.py',version:1,source:'value="ROOT"\n'},{path:'src/helper.py',version:1,source:'value="SRC"\n'},{path:'sitecustomize.py',version:1,source:'from pathlib import Path\nPath("/tmp/hook-executed").touch()\n'}]})).kind,'synced');
 const result=await send({kind:'query',method:'completions',revision:1,path:'src/main.py',documentVersion:1,offset:source.lastIndexOf('.')+1});
 assert.equal(result.kind,'result',JSON.stringify(result));assert.ok(result.result.some(x=>x.name==='forward'));assert.ok(!fs.existsSync('/tmp/hook-executed'));
 const elapsedMs=performance.now()-began;
 const definition=await send({kind:'query',method:'definitions',revision:1,path:'src/main.py',documentVersion:1,offset:source.indexOf('value')+1});
 assert.equal(definition.kind,'result');assert.equal(definition.result[0].path,'src/helper.py');
 assert.equal((await send({kind:'sync',entrypoint:'other/main.py',baseRevision:1,revision:2,changes:[{path:'src/helper.py',version:2,source:'changed=0\n'}]})).code,'stale-document');
 const unchanged=await send({kind:'query',method:'definitions',revision:1,path:'src/main.py',documentVersion:1,offset:source.indexOf('value')+1});assert.equal(unchanged.result[0].path,'src/helper.py');
 const processes=fs.readdirSync('/proc').filter(x=>/^\d+$/.test(x)).flatMap(pid=>{try{const cmd=fs.readFileSync('/proc/'+pid+'/cmdline','utf8');if(!cmd.split('\x00').some(arg=>arg.endsWith('/dist/pyright-langserver.js')))return[];const env=fs.readFileSync('/proc/'+pid+'/environ','utf8');assert.ok(!env.includes('PYTHON_LANGUAGE_TOKEN'));assert.ok(!env.includes(token));return[{pid,cmd:cmd.replaceAll('\x00',' '),environmentNames:env.split('\x00').filter(Boolean).map(x=>x.split('=')[0])}]}catch(e){if(e.code==='ENOENT')return[];throw e}});
 assert.ok(processes.length>=1);assert.equal((await send({kind:'query',method:'symbols',revision:2,path:'src/main.py',documentVersion:1})).code,'stale-document');
 console.log(JSON.stringify({elapsedMs,completionCount:result.result.length,definitionPath:definition.result[0].path,entrypointMutationRejected:true,processes,hookExecuted:false}));
}).on('error',e=>{console.error(e);process.exitCode=1});
`
  const child = spawn('docker', ['exec', '-i', name, '/usr/local/bin/node', '-e', probe], {
    windowsHide: true,
    stdio: ['pipe', 'pipe', 'pipe'],
  })
  child.stdin.end(token)
  let stdout = '',
    stderr = ''
  child.stdout.on('data', (chunk) => (stdout += chunk))
  child.stderr.on('data', (chunk) => (stderr += chunk))
  const deadline = setTimeout(() => child.kill(), 30_000)
  const code = await new Promise<number | null>((resolve) => child.once('close', resolve))
  clearTimeout(deadline)
  assert.equal(code, 0, stderr)
  evidence.probe = JSON.parse(stdout)
  evidence.stats = JSON.parse(command(['stats', '--no-stream', '--format', '{{json .}}', name]))
  evidence.passed = true
} finally {
  if (started) command(['rm', '--force', name])
  const directory = resolve(import.meta.dirname, '../../../.cache/studio-python-l0')
  await mkdir(directory, { recursive: true })
  await writeFile(
    resolve(directory, 'l5-language-container-proof.json'),
    `${JSON.stringify(evidence, null, 2)}\n`,
  )
  console.log(JSON.stringify(evidence, null, 2))
}
