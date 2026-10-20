import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createPythonLanguageBootstrap } from '@sistemazero/core/studio/python-language-bootstrap'
import { renderPythonProvidedModuleStub } from '@sistemazero/core/studio/python-provided-modules-render'

/** QA only. Pin both the addressable OCI source and its selected platform identity. */
export function parseContainerVerificationOptions(args: readonly string[]) {
  const fields = new Map<string, string>()
  for (const argument of args) {
    const match = /^--(image|platform-manifest|run|bootstrap|bundle-sha256)=(.+)$/.exec(argument)
    assert.ok(
      match,
      'Expected --image, --platform-manifest, --run, --bootstrap and --bundle-sha256',
    )
    const [, key, value] = match
    assert.ok(key && value && !fields.has(key), 'Duplicate or empty option')
    fields.set(key, value)
  }
  const sourceImageRef = fields.get('image') ?? ''
  const expectedPlatformManifestDigest = fields.get('platform-manifest') ?? ''
  const run = fields.get('run') ?? ''
  const bootstrap = fields.get('bootstrap') ?? ''
  const bundleSha256 = fields.get('bundle-sha256') ?? ''
  assert.match(
    sourceImageRef,
    /^sha256:[a-f0-9]{64}$/,
    'An immutable source image reference is required',
  )
  assert.match(
    expectedPlatformManifestDigest,
    /^sha256:[a-f0-9]{64}$/,
    'An explicit platform manifest digest is required',
  )
  assert.match(run, /^[a-z0-9][a-z0-9-]{0,63}$/, 'A fresh run name is required')
  assert.ok(bootstrap, 'A canonical provided-module bootstrap file is required')
  assert.match(bundleSha256, /^[a-f0-9]{64}$/, 'The expected server bundle SHA256 is required')
  return {
    sourceImageRef,
    expectedPlatformManifestDigest,
    platform: 'linux/amd64',
    run,
    bootstrap: resolve(bootstrap),
    bundleSha256,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function record(value: unknown): Record<string, unknown> {
  assert.ok(isRecord(value), 'Expected object')
  return value
}

export function assertOwnedContainer(raw: unknown, id: string, owner: string) {
  const inspection = record(raw)
  assert.match(id, /^[a-f0-9]{64}$/)
  assert.equal(inspection.Id, id, 'Container identity changed')
  assert.equal(
    record(record(inspection.Config).Labels)['sz.language22.qa-owner'],
    owner,
    'Container is not owned by this invocation',
  )
}

/** Never return Config.Env or the complete Docker inspection. */
export function inspectContainerIsolation(
  raw: unknown,
  identity: {
    sourceImageRef: string
    expectedPlatformManifestDigest: string
    expectedPlatformDescriptor: unknown
  },
  owner: string,
) {
  const inspection = record(raw)
  const host = record(inspection.HostConfig)
  const config = record(inspection.Config)
  assert.equal(
    config.Image,
    identity.sourceImageRef,
    'The run must reference the pinned OCI source',
  )
  assert.equal(
    inspection.Image,
    identity.sourceImageRef,
    'The store must report the exact source index',
  )
  const expectedDescriptor = record(identity.expectedPlatformDescriptor)
  assert.equal(expectedDescriptor.digest, identity.expectedPlatformManifestDigest)
  assert.deepEqual(
    record(inspection.ImageManifestDescriptor),
    expectedDescriptor,
    'The selected platform manifest must match the complete pinned descriptor',
  )
  assert.equal(record(config.Labels)['sz.language22.qa-owner'], owner)
  assert.equal(host.NetworkMode, 'none')
  assert.equal(config.User, '1000:1000')
  assert.equal(host.ReadonlyRootfs, true)
  assert.equal(host.Memory, 512 * 1024 * 1024)
  assert.equal(host.MemorySwap, 512 * 1024 * 1024)
  assert.equal(host.NanoCpus, 1_000_000_000)
  assert.equal(host.PidsLimit, 64)
  assert.deepEqual(host.CapDrop, ['ALL'])
  assert.ok(Array.isArray(host.SecurityOpt) && host.SecurityOpt.includes('no-new-privileges'))
  assert.deepEqual(host.PortBindings, {})
  assert.deepEqual(host.Binds, null)
  assert.deepEqual(record(host.Tmpfs), {
    '/tmp': 'rw,noexec,nosuid,nodev,size=16m',
    '/workspace': 'rw,noexec,nosuid,nodev,size=32m,uid=1000,gid=1000',
  })
  return {
    storeImageIdentity: inspection.Image,
    platformManifestDescriptor: inspection.ImageManifestDescriptor,
    sourceImageRef: config.Image,
    owner,
    network: host.NetworkMode,
    user: config.User,
    readonly: host.ReadonlyRootfs,
    memory: host.Memory,
    memorySwap: host.MemorySwap,
    nanoCpus: host.NanoCpus,
    pids: host.PidsLimit,
    capDrop: host.CapDrop,
    securityOpt: host.SecurityOpt,
    tmpfs: host.Tmpfs,
  }
}

export function redactVerificationError(error: unknown, secrets: readonly string[]) {
  let message = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
  for (const secret of secrets) if (secret) message = message.replaceAll(secret, '[REDACTED]')
  return message
}

// QA supervisor only: observes the unmodified server's termination. Not distributed.
export const LANGUAGE_QA_SUPERVISOR = `
const fs=require('node:fs');const {spawn}=require('node:child_process');
const child=spawn(process.execPath,['--max-old-space-size=96','/opt/language/server.mjs'],{stdio:'ignore'});
const publish=state=>{fs.writeFileSync('/tmp/language-qa-owner.next',JSON.stringify(state));fs.renameSync('/tmp/language-qa-owner.next','/tmp/language-qa-owner.json')};
publish({pid:child.pid,exited:false});
child.on('error',()=>publish({exited:true,spawnError:true}));
child.on('exit',(code,signal)=>publish({pid:child.pid,exited:true,code,signal}));
setInterval(()=>{},1000);
`

// Real Node-image probe. Credentials/configuration arrive only over stdin.
export const LANGUAGE_QA_PROBE = String.raw`
const assert=require('node:assert/strict');const fs=require('node:fs');const http=require('node:http');
const {createHash}=require('node:crypto');const {createRequire}=require('node:module');
const sha=value=>createHash('sha256').update(value).digest('hex');
let input='';process.stdin.setEncoding('utf8');process.stdin.on('data',chunk=>input+=chunk);
process.stdin.on('end',()=>main(JSON.parse(input)).catch(error=>{let text=String(error.stack||error);for(const value of JSON.parse(input).secrets)text=text.split(value).join('[REDACTED]');console.error(text);process.exitCode=1}));
async function main({token,wrongToken,bootstrap,mode,bundleSha256,stubSha256}){
 assert.equal(process.getuid(),1000);assert.equal(sha(fs.readFileSync('/opt/language/server.mjs')),bundleSha256);
 const requireImage=createRequire('/opt/language/server.mjs');const official=requireImage.resolve('pyright/langserver.index.js');
 const pyrightVersion=JSON.parse(fs.readFileSync(requireImage.resolve('pyright/package.json'),'utf8')).version;assert.equal(pyrightVersion,'1.1.414');
 const base='http://127.0.0.1:8789';const headers={'content-type':'application/json',authorization:'Bearer '+token};
 const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 const request=(path,body,auth=headers)=>fetch(base+path,{method:body===undefined?'GET':'POST',headers:auth,...(body===undefined?{}:{body:JSON.stringify(body)})});
 let health;
 for(let n=0;n<=40;n++){try{health=await request('/healthz');break}catch(error){if(n===40)throw error;await pause(100)}}
 assert.ok(health);assert.equal(health.status,503);assert.deepEqual(await health.json(),{ready:false});
 assert.equal((await request('/healthz',undefined,{})).status,401);
 assert.equal((await request('/configure',bootstrap,{'content-type':'application/json',authorization:'Bearer '+wrongToken})).status,401);
 assert.equal((await request('/configure',bootstrap,{'content-type':'application/json'})).status,401);
 assert.equal((await request('/command',{version:1,id:'before',kind:'dispose'})).status,503);
 const owner=()=>JSON.parse(fs.readFileSync('/tmp/language-qa-owner.json','utf8'));
 const waitExit=async()=>{for(let n=0;n<=40;n++){const state=owner();if(state.exited){assert.equal(state.code,0);assert.equal(state.signal,null);return state}if(n===40)assert.fail('Server did not physically exit');await pause(100)}};
 const roots=()=>fs.readdirSync('/workspace').filter(name=>name.startsWith('.python-language-modules-'));
 if(mode==='forged'){
  const forged=structuredClone(bootstrap);forged.runtimeRelease.manifestSha256='0'.repeat(64);
  const response=await request('/configure',forged);assert.equal(response.status,400);assert.deepEqual(await response.json(),{error:'invalid-configuration'});
  const exited=await waitExit();assert.deepEqual(roots(),[]);
  for(const pid of fs.readdirSync('/proc').filter(value=>/^\d+$/.test(value))){try{assert.ok(!fs.readFileSync('/proc/'+pid+'/cmdline','utf8').split('\x00').includes(official))}catch(error){if(error.code!=='ENOENT'&&error.code!=='ESRCH')throw error}}
  let reachable=false;try{await request('/healthz');reachable=true}catch{}assert.equal(reachable,false);
  console.log(JSON.stringify({mode,node:process.version,pyrightVersion,uid:process.getuid(),healthBefore:503,invalidConfiguration:400,noLegacyFallback:true,serverExit:exited,metadataRemoved:true}));return;
 }
 const configure=await request('/configure',mode==='legacy'?{protocolVersion:1}:bootstrap);
 assert.equal(configure.status,200);assert.deepEqual(await configure.json(),{protocolVersion:1,ready:true});
 const ready=await request('/healthz');assert.equal(ready.status,200);assert.deepEqual(await ready.json(),{ready:true});
 assert.equal((await request('/configure',{protocolVersion:1})).status,409);
 let id=0,revision=0,entrypoint='src/main.py',source='';const versions=new Map();
 const send=async body=>{const response=await request('/command',{version:1,id:'r'+(++id),...body});assert.equal(response.status,200);return response.json()};
 const sync=async(next,changes={},nextEntry=entrypoint)=>{
  const baseRevision=revision++;entrypoint=nextEntry;source=next;
  const entries=Object.entries({...changes,[entrypoint]:source}).map(([path,source])=>{const version=(versions.get(path)||0)+1;versions.set(path,version);return{path,source,version}});
  const response=await send({kind:'sync',entrypoint,baseRevision,revision,changes:entries});assert.equal(response.kind,'synced');assert.equal(response.revision,revision);
 };
 const query=(method,offset)=>send({kind:'query',method,path:entrypoint,revision,documentVersion:versions.get(entrypoint),...(offset===undefined?{}:{offset})});
 const diagnostics=async()=>{const reply=await query('diagnostics');assert.equal(reply.kind,'result');return reply.result};
 const began=performance.now();let completionCount=0;const assertions=[];
 if(mode==='legacy'){
  await sync('from pathlib import Path\nPath("/tmp/source-executed").touch()\nfrom helper import value\nimport turtle\npen = turtle.Turtle()\npen.forward\n',{'helper.py':'value="ROOT"\n','src/helper.py':'value="SRC"\n','sitecustomize.py':'from pathlib import Path\nPath("/tmp/hook-executed").touch()\n'});
  const result=await query('completions',source.lastIndexOf('pen.')+4);assert.equal(result.kind,'result');assert.ok(result.result.some(item=>item.name==='forward'));completionCount=result.result.length;
  const definition=await query('definitions',source.indexOf('value')+1);assert.equal(definition.kind,'result');assert.equal(definition.result[0].path,'src/helper.py');
  const rejected=await send({kind:'sync',entrypoint:'other/main.py',baseRevision:1,revision:2,changes:[{path:'src/helper.py',version:2,source:'changed=0\n'}]});assert.equal(rejected.code,'stale-document');
  assert.equal((await query('definitions',source.indexOf('value')+1)).result[0].path,'src/helper.py');
  assert.equal((await send({kind:'query',method:'symbols',revision:2,path:entrypoint,documentVersion:1})).code,'stale-document');
  assertions.push('turtle-completion','entry-directory-definition','invalid-entrypoint-atomic','stale-query');
 }else{
  assert.equal(roots().length,1);const stub='/workspace/'+roots()[0]+'/sz_audio/sz_audio/__init__.pyi';assert.equal(sha(fs.readFileSync(stub)),stubSha256);
  const provided='from sz_audio import play as tocar\nimport math\nvalues: list[int] = [1, 2]\nroot: float = math.sqrt(4)\nvoice: int = tocar("click.wav", volume=0.5)\nprint(len(values), root, voice)\n';
  const author='from sz_audio import play as tocar\nvalue: str = tocar(1)\n';const implementation='def play(path: int) -> str:\n    return "AUTHOR"\n';
  await sync(provided);assert.deepEqual(await diagnostics(),[]);
  const hover=await query('hover',source.indexOf('tocar("'));assert.equal(hover.kind,'result');assert.ok(hover.result.text.includes('path: str'));
  assert.deepEqual((await query('definitions',source.indexOf('tocar("'))).result,[]);
  assert.equal((await query('signatureHelp',source.indexOf('volume=')+2)).kind,'result');
  await sync(author,{'src/sz_audio.py':implementation});assert.deepEqual(await diagnostics(),[]);assert.equal((await query('definitions',source.indexOf('tocar(1'))).result[0].path,'src/sz_audio.py');
  await sync(provided,{'src/sz_audio.py':null,'src/sz_audio/child.py':''});assert.deepEqual(await diagnostics(),[]);
  await sync(author,{'src/sz_audio/__init__.py':implementation});assert.deepEqual(await diagnostics(),[]);assert.equal((await query('definitions',source.indexOf('tocar(1'))).result[0].path,'src/sz_audio/__init__.py');
  await sync(provided.replace('"click.wav"','123'),{'src/sz_audio/__init__.py':null});const invalid=await diagnostics();assert.equal(invalid.length,1);assert.equal(invalid[0].code,'reportArgumentType');
  await sync(provided,{'src/sz_audio/__init__.py':implementation},'other/main.py');assert.deepEqual(await diagnostics(),[]);
  await sync(author,{'other/sz_audio.pyi':'def play(path: int) -> str: ...\n'});const stubDiagnostic=await diagnostics();assert.equal(stubDiagnostic.length,1);assert.equal(stubDiagnostic[0].code,'reportMissingModuleSource');assert.equal(stubDiagnostic[0].severity,'warning');assert.equal((await query('definitions',source.indexOf('tocar(1'))).result[0].path,'other/sz_audio.pyi');
  await sync(provided,{'other/sz_audio.pyi':null});assert.deepEqual(await diagnostics(),[]);
  assertions.push('exact-stub-bytes','typed-api','external-definition-redacted','author-module','namespace-fallback','author-package','invalid-argument','entrypoint-directory','author-stub','delete-restores-provided');
 }
 // Cancellation must affect the real query reply, not merely ACK an absent request ID.
 await sync(source,{'src/cancel_work.py':Array.from({length:7000},(_,n)=>'v'+n+': int = '+n).join('\n')+'\n'});
 const requestId='cancel-target';const payload=JSON.stringify({version:1,id:requestId,kind:'query',method:'projectDiagnostics',revision,path:entrypoint,documentVersion:versions.get(entrypoint)});
 let written;const bodyWritten=new Promise(resolve=>written=resolve);
 const pending=new Promise((resolve,reject)=>{const req=http.request(base+'/command',{method:'POST',headers:{...headers,'content-length':Buffer.byteLength(payload)}},response=>{let bytes='';response.setEncoding('utf8');response.on('data',chunk=>bytes+=chunk);response.on('end',()=>{try{assert.equal(response.statusCode,200);resolve(JSON.parse(bytes))}catch(error){reject(error)}})});req.on('error',reject);req.end(payload,written)});
 void pending.catch(()=>{});
 await bodyWritten;const cancel=await send({kind:'cancel',requestId});assert.equal(cancel.kind,'ack');
 const cancelled=await pending;assert.equal(cancelled.id,requestId);assert.equal(cancelled.kind,'error');assert.equal(cancelled.code,'cancelled');
 const processes=[];
 for(const pid of fs.readdirSync('/proc').filter(value=>/^\d+$/.test(value))){
  try{const executable=fs.readlinkSync('/proc/'+pid+'/exe');assert.ok(!/\/python(?:[0-9.]*)$/.test(executable),'Unexpected Python executable');
   const args=fs.readFileSync('/proc/'+pid+'/cmdline','utf8').split('\x00').filter(Boolean);if(!args.includes(official))continue;
   assert.deepEqual(args.slice(1),['--max-old-space-size=192',official,'--stdio']);
   const env=fs.readFileSync('/proc/'+pid+'/environ','utf8');assert.ok(!env.includes(token));assert.ok(!env.includes(wrongToken));const names=env.split('\x00').filter(Boolean).map(value=>value.split('=')[0]);assert.ok(!names.includes('PYTHON_LANGUAGE_TOKEN'));assert.deepEqual(names,['PATH']);
   processes.push({pid,entrypoint:official,heapMiB:192,stdio:true,environmentNames:names});
  }catch(error){if(error.code==='ENOENT'||error.code==='ESRCH')continue;throw error}
 }
 assert.equal(processes.length,1);assert.ok(!fs.existsSync('/tmp/source-executed'));assert.ok(!fs.existsSync('/tmp/hook-executed'));
 const disposed=await send({kind:'dispose'});assert.equal(disposed.kind,'ack');const exited=await waitExit();
 for(let n=0;n<=40;n++){if(processes.every(({pid})=>!fs.existsSync('/proc/'+pid)))break;if(n===40)assert.fail('Pyright did not physically exit');await pause(100)}
 assert.deepEqual(roots(),[]);
 console.log(JSON.stringify({mode,node:process.version,pyrightVersion,uid:process.getuid(),healthBefore:503,healthAfter:200,configureOnce:true,assertions,completionCount,elapsedMs:performance.now()-began,cancel:{requestId,replyCode:cancelled.code},processes,serverExit:exited,metadataRemoved:true,markersExecuted:false}));
}
`

export async function verifyLanguageContainer(args: readonly string[]) {
  const options = parseContainerVerificationOptions(args)
  const directory = resolve(
    import.meta.dirname,
    '../../../.cache/studio-python-l0',
    `language22-container-${options.run}`,
  )
  await mkdir(resolve(directory, '..'), { recursive: true })
  await mkdir(directory) // Never overwrite or combine historical runs.
  const secrets: string[] = []
  const evidence: Record<string, unknown> = {
    createdAt: new Date().toISOString(),
    options: {
      sourceImageRef: options.sourceImageRef,
      expectedPlatformManifestDigest: options.expectedPlatformManifestDigest,
      platform: options.platform,
      run: options.run,
      bundleSha256: options.bundleSha256,
    },
    verifierSha256: createHash('sha256')
      .update(await readFile(import.meta.filename))
      .digest('hex'),
    supervisorSha256: createHash('sha256').update(LANGUAGE_QA_SUPERVISOR).digest('hex'),
    probeSha256: createHash('sha256').update(LANGUAGE_QA_PROBE).digest('hex'),
    host: { bun: Bun.version, node: process.version, platform: process.platform },
  }
  const command = (args: string[]) => {
    const result = spawnSync('docker', args, {
      encoding: 'utf8',
      windowsHide: true,
      timeout: 30_000,
    })
    assert.equal(result.status, 0, redactVerificationError(result.stderr || result.error, secrets))
    return result.stdout.trim()
  }
  const cases: Record<string, unknown>[] = []
  evidence.cases = cases
  try {
    const bootstrapBytes = await readFile(options.bootstrap)
    const bootstrap = await createPythonLanguageBootstrap(
      JSON.parse(bootstrapBytes.toString('utf8')),
    )
    const modules = bootstrap.runtimeRelease?.manifest.python?.providedModules
    assert.ok(
      modules && modules.length === 1 && modules[0]?.descriptor.importName === 'sz_audio',
      'Gate requires the exact sz_audio QA release',
    )
    const stubSha256 = createHash('sha256')
      .update(renderPythonProvidedModuleStub(modules[0].descriptor))
      .digest('hex')
    evidence.bootstrapSha256 = createHash('sha256').update(bootstrapBytes).digest('hex')
    evidence.releaseSha256 = bootstrap.runtimeRelease?.manifestSha256
    evidence.stubSha256 = stubSha256
    const sourceImages = JSON.parse(command(['image', 'inspect', options.sourceImageRef]))
    assert.ok(Array.isArray(sourceImages) && sourceImages.length === 1)
    const sourceImage = record(sourceImages[0])
    assert.equal(sourceImage.Id, options.sourceImageRef)
    assert.equal(record(sourceImage.Descriptor).digest, options.sourceImageRef)
    assert.equal(
      record(sourceImage.Descriptor).mediaType,
      'application/vnd.oci.image.index.v1+json',
    )
    const images = JSON.parse(
      command(['image', 'inspect', '--platform', options.platform, options.sourceImageRef]),
    )
    assert.ok(Array.isArray(images) && images.length === 1)
    const image = record(images[0])
    assert.equal(
      image.Id,
      options.expectedPlatformManifestDigest,
      'Selected platform differs from the explicit pin',
    )
    assert.equal(image.Os, 'linux')
    assert.equal(image.Architecture, 'amd64')
    const platformDescriptor = record(image.Descriptor)
    assert.equal(platformDescriptor.digest, options.expectedPlatformManifestDigest)
    assert.equal(platformDescriptor.mediaType, 'application/vnd.oci.image.manifest.v1+json')
    assert.deepEqual(platformDescriptor.platform, { architecture: 'amd64', os: 'linux' })
    assert.ok(
      typeof platformDescriptor.size === 'number' &&
        Number.isSafeInteger(platformDescriptor.size) &&
        platformDescriptor.size > 0,
    )
    assert.deepEqual(image.Config, sourceImage.Config)
    assert.deepEqual(image.RootFS, sourceImage.RootFS)
    evidence.image = {
      sourceImageRef: options.sourceImageRef,
      sourceDescriptor: sourceImage.Descriptor,
      platform: options.platform,
      platformManifestDescriptor: platformDescriptor,
      configProjectionSha256: createHash('sha256')
        .update(JSON.stringify(image.Config))
        .digest('hex'),
      configProjectionIsOciBlobDigest: false,
      id: image.Id,
      architecture: image.Architecture,
      os: image.Os,
      rootFS: image.RootFS,
    }
    for (const mode of ['legacy', 'provided', 'forged']) {
      const name = `sz-language22-${options.run}-${mode}`
      const owner = crypto.randomUUID()
      const cidFile = resolve(directory, `${mode}.cid`)
      const token =
        crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '')
      const wrongToken =
        crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '')
      secrets.push(token, wrongToken)
      const result: Record<string, unknown> = { mode, name }
      cases.push(result)
      let creationAttempted = false
      let creationAcknowledged = false
      let primaryError: unknown
      let cleanupError: unknown
      try {
        assert.equal(
          command(['ps', '-a', '--filter', `name=^/${name}$`, '--format', '{{.ID}}']),
          '',
          'Container name already exists',
        )
        creationAttempted = true
        command([
          'run',
          '-d',
          '--name',
          name,
          '--platform',
          options.platform,
          '--cidfile',
          cidFile,
          '--label',
          `sz.language22.qa-owner=${owner}`,
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
          options.sourceImageRef,
          '--max-old-space-size=32',
          '-e',
          LANGUAGE_QA_SUPERVISOR,
        ])
        creationAcknowledged = true
        result.creationCommandAcknowledged = true
        const inspected = JSON.parse(command(['inspect', name]))
        assert.ok(Array.isArray(inspected) && inspected.length === 1)
        const cid = (await readFile(cidFile, 'utf8')).trim()
        assertOwnedContainer(inspected[0], cid, owner)
        result.containerId = cid
        result.isolation = inspectContainerIsolation(
          inspected[0],
          { ...options, expectedPlatformDescriptor: platformDescriptor },
          owner,
        )
        const child = spawn(
          'docker',
          [
            'exec',
            '-i',
            name,
            '/usr/local/bin/node',
            '--max-old-space-size=96',
            '-e',
            LANGUAGE_QA_PROBE,
          ],
          { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] },
        )
        child.stdin.on('error', () => {})
        child.stdin.end(
          JSON.stringify({
            token,
            wrongToken,
            secrets: [token, wrongToken],
            bootstrap,
            mode,
            bundleSha256: options.bundleSha256,
            stubSha256,
          }),
        )
        let stdout = '',
          stderr = '',
          timedOut = false
        child.stdout.on('data', (chunk) => {
          stdout += chunk
        })
        child.stderr.on('data', (chunk) => {
          stderr += chunk
        })
        const deadline = setTimeout(() => {
          timedOut = true
          child.kill()
        }, 30_000)
        const code = await new Promise<number | null>((resolve, reject) => {
          child.once('error', reject)
          child.once('close', resolve)
        }).finally(() => clearTimeout(deadline))
        result.exitCode = code
        result.timedOut = timedOut
        const safeStderr = redactVerificationError(stderr, secrets)
        result.stderr = safeStderr
        assert.equal(timedOut, false, 'Probe exceeded the original 30s bound')
        assert.equal(code, 0, safeStderr)
        result.probe = JSON.parse(redactVerificationError(stdout, secrets))
        result.passed = true
      } catch (error) {
        primaryError = error
        result.error = redactVerificationError(error, secrets)
      } finally {
        if (creationAttempted) {
          try {
            const cid = (
              await readFile(cidFile, 'utf8').catch((error) => {
                if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return ''
                throw error
              })
            ).trim()
            // A name is only a lookup hint; removal still requires full ID and nonce.
            const candidate =
              cid ||
              command([
                'ps',
                '-a',
                '--no-trunc',
                '--filter',
                `name=^/${name}$`,
                '--format',
                '{{.ID}}',
              ])
            if (candidate) {
              const inspected = JSON.parse(command(['inspect', candidate]))
              assert.ok(Array.isArray(inspected) && inspected.length === 1)
              assertOwnedContainer(inspected[0], candidate, owner)
              command(['rm', '--force', candidate])
            }
            assert.equal(
              command(['ps', '-a', '--filter', `name=^/${name}$`, '--format', '{{.ID}}']),
              '',
              'Owned container cleanup must be confirmed',
            )
            result.cleanup = {
              removedById: candidate || null,
              absentAfterCleanupObserved: true,
              observedAt: new Date().toISOString(),
              creationUnknown: !creationAcknowledged && !candidate,
              // An absent lookup does not prove rollback of an unacknowledged create.
              creationCommandAcknowledged: creationAcknowledged,
            }
          } catch (error) {
            cleanupError = error
            result.cleanupError = redactVerificationError(error, secrets)
          }
        }
      }
      if (primaryError !== undefined) throw primaryError
      if (cleanupError !== undefined) throw cleanupError
    }
    evidence.passed = true
  } catch (error) {
    evidence.passed = false
    evidence.error = redactVerificationError(error, secrets)
    throw error
  } finally {
    evidence.finishedAt = new Date().toISOString()
    await writeFile(resolve(directory, 'receipt.json'), `${JSON.stringify(evidence, null, 2)}\n`, {
      flag: 'wx',
    })
    console.log(JSON.stringify(evidence, null, 2))
  }
}

if (import.meta.main) {
  await verifyLanguageContainer(process.argv.slice(2)).catch(() => {
    process.exitCode = 1
  })
}
