import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, open, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'
import type {
  MediaProof,
  Snapshot,
} from '../../packages/members/src/domain/course-publication/course-sync'
import type { SyncRequest } from '../../packages/members/src/infrastructure/persistence/drizzle/course-sync'

const project = '415d5a1c-5f75-432c-8445-b395d0977ce3'
const environmentIds = {
  staging: 'f634cff6-aafb-4804-8b69-172fad4e946e',
  production: '19c212a5-85c0-493c-9630-a7a0569e8412',
}
const root = resolve(import.meta.dir, '../..')
const quote = (value: string) => `'${value.replaceAll("'", "'\\''")}'`
const sha = (value: string) => createHash('sha256').update(value).digest('hex')

export async function bundle(service: 'members' | 'admin') {
  const entry =
    service === 'members'
      ? 'packages/members/scripts/course-audience-sync/run.ts'
      : 'packages/admin/scripts/course-audience-media.ts'
  const result = await Bun.build({
    entrypoints: [join(root, entry)],
    target: service === 'members' ? 'bun' : 'node',
    format: 'esm',
    minify: false,
    plugins: [
      {
        name: 'operational-boundaries',
        setup(build) {
          // Keep canonical publication and policy loading at their deployed file URLs.
          build.onLoad(
            {
              filter:
                /course-audience-sync[\\/]run\.ts$|persistence[\\/]drizzle[\\/](course-sync|course-knowledge-sync)\.ts$/,
            },
            async (args) => {
              if (service !== 'members') return undefined
              const contents = (await Bun.file(args.path).text())
                .replace(/from '(\.[^']+)'/g, (match, path) => {
                  const local = resolve(dirname(args.path), path)
                  const owned = relative(join(root, 'packages/members/src'), local).replaceAll(
                    '\\',
                    '/',
                  )
                  if (
                    owned.startsWith('../') ||
                    owned.startsWith('domain/') ||
                    /(?:^|\/)course-(?:knowledge-)?sync$/.test(owned)
                  )
                    return match
                  return `from '/app/packages/members/src/${owned.replace(/\.ts$/, '')}.ts'`
                })
                .replace(
                  "from 'drizzle-orm'",
                  "from '/app/packages/members/node_modules/drizzle-orm/index.js'",
                )
              return { contents, loader: 'ts' }
            },
          )
          build.onResolve({ filter: /^\/app\// }, (args) => ({ path: args.path, external: true }))
          // The CLI is server-only too; remove the browser guard, never any production consumer.
          build.onResolve({ filter: /^server-only$/ }, () => ({
            path: 'server-only',
            namespace: 'operational-server',
          }))
          build.onLoad({ filter: /.*/, namespace: 'operational-server' }, () => ({
            contents: '',
            loader: 'js',
          }))
        },
      },
    ],
  })
  if (!result.success) throw new AggregateError(result.logs, 'Não foi possível preparar o script')
  return result.outputs[0]!.text()
}

export async function remote(
  service: 'members' | 'admin',
  environment: keyof typeof environmentIds,
  code: string,
  request: unknown,
  logPath: string,
) {
  // Reserve evidence before launching. A retry cannot write remotely then fail on an old log.
  const reservation = await open(logPath, 'wx', 0o600)
  await reservation.close()
  const inputReader =
    service === 'members'
      ? 'Bun.stdin.text()'
      : "new Promise((resolve,reject)=>{let s='';process.stdin.setEncoding('utf8');process.stdin.on('data',x=>s+=x);process.stdin.on('end',()=>resolve(s));process.stdin.on('error',reject)})"
  const bootstrap = `const input=JSON.parse(await ${inputReader});const fs=await import('node:fs/promises');const os=await import('node:os');const path=await import('node:path');const url=await import('node:url');const dir=await fs.mkdtemp(path.join(os.tmpdir(),'sz-course-audience-'));const file=path.join(dir,'run.mjs');const timer=setTimeout(()=>{console.error('Prazo operacional de oito minutos excedido');process.exit(1)},480000);timer.unref();try{await fs.writeFile(file,Buffer.from(input.code,'base64'),{flag:'wx',mode:0o600});const mod=await import(url.pathToFileURL(file).href);const result=await mod.run(input.request);console.log('COURSE_SYNC_RESULT='+JSON.stringify(result))}catch(error){console.error(error.name+': '+error.message);process.exitCode=1}finally{clearTimeout(timer);await fs.rm(dir,{recursive:true,force:true})}`

  const railway = join(process.env.APPDATA ?? '', 'npm/node_modules/@railway/cli/bin/railway.js')
  const child = spawn(
    process.execPath,
    [
      railway,
      'ssh',
      '--project',
      project,
      '--environment',
      environmentIds[environment],
      '--service',
      service,
      '--',
      [service === 'members' ? 'bun' : 'node', '-e', bootstrap].map(quote).join(' '),
    ],
    { cwd: root, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] },
  )
  let stdout = '',
    stderr = ''
  child.stdout.setEncoding('utf8').on('data', (s) => {
    stdout += s
  })
  child.stderr.setEncoding('utf8').on('data', (s) => {
    stderr += s
  })
  child.stdin.on('error', () => {})
  child.stdin.end(JSON.stringify({ code: Buffer.from(code).toString('base64'), request }))
  const timer = setTimeout(() => child.kill(), 10 * 60_000)
  const exit = await new Promise<number | null>((done, reject) => {
    child.once('error', reject)
    child.once('exit', done)
  })
  clearTimeout(timer)
  await writeFile(logPath, `${stdout}\n${stderr}`, { flag: 'w' })
  if (exit !== 0) throw new Error(`${service}: execução falhou (${exit}). Confira ${logPath}`)
  const result = stdout.split(/\r?\n/).find((l) => l.startsWith('COURSE_SYNC_RESULT='))
  if (!result) throw new Error('Execução sem recibo final')
  return JSON.parse(result.slice('COURSE_SYNC_RESULT='.length))
}

async function main() {
  const [mode, environment, sourceSlug, targetSlug, directory, actorId] = process.argv.slice(2)
  if (
    !['prepare', 'apply', 'verify'].includes(mode ?? '') ||
    !['staging', 'production'].includes(environment ?? '') ||
    !sourceSlug ||
    !targetSlug ||
    !directory ||
    !actorId
  )
    throw new Error(
      'Uso: bun scripts/release/sync-course-audiences.ts prepare|apply|verify staging|production slug-kids slug-adulto diretório-privado uuid-admin',
    )
  const env = environment as keyof typeof environmentIds
  const request: SyncRequest = {
    environment: env,
    sourceSlug,
    targetSlug,
    actorId: actorId!,
    mode: 'plan',
  }
  const membersCode = await bundle('members')
  if (mode === 'prepare') {
    await mkdir(directory, { recursive: false })
    const inventory = (await remote(
      'members',
      env,
      membersCode,
      request,
      join(directory, 'inventory.log'),
    )) as { snapshot: Snapshot }
    await writeFile(join(directory, 'backup.json'), JSON.stringify(inventory.snapshot, null, 2), {
      flag: 'wx',
    })
    const adminCode = await bundle('admin')
    const media: MediaProof = await remote(
      'admin',
      env,
      adminCode,
      inventory.snapshot,
      join(directory, 'media.log'),
    )
    const prepared = await remote(
      'members',
      env,
      membersCode,
      { ...request, media },
      join(directory, 'plan.log'),
    )
    if (sha(JSON.stringify(inventory.snapshot)) !== sha(JSON.stringify(prepared.snapshot)))
      throw new Error('A árvore mudou depois do backup. Prepare novamente em outro diretório')
    await writeFile(
      join(directory, 'prepared.json'),
      JSON.stringify(
        {
          request: { ...request, media },
          prepared,
          membersCodeSha: sha(membersCode),
          adminCodeSha: sha(adminCode),
          backupSha: sha(await readFile(join(directory, 'backup.json'), 'utf8')),
        },
        null,
        2,
      ),
      { flag: 'wx' },
    )
    console.log(
      JSON.stringify({
        mode,
        environment,
        planHash: prepared.plan.planHash,
        changed: prepared.plan.changed,
        lessons: prepared.plan.lessons.length,
        generatedVoices: media.generated,
        reusedVoices: media.reused,
      }),
    )
    return
  }
  const saved = JSON.parse(await readFile(join(directory, 'prepared.json'), 'utf8'))
  if (
    saved.request.actorId !== actorId ||
    saved.request.environment !== env ||
    saved.request.sourceSlug !== sourceSlug ||
    saved.request.targetSlug !== targetSlug ||
    saved.membersCodeSha !== sha(membersCode) ||
    saved.backupSha !== sha(await readFile(join(directory, 'backup.json'), 'utf8'))
  )
    throw new Error('O plano ou backup não corresponde ao comando e ao código')
  const result = await remote(
    'members',
    env,
    membersCode,
    {
      ...saved.request,
      mode: mode === 'apply' ? 'apply' : 'verify',
      expectedPlanHash: saved.prepared.plan.planHash,
    },
    join(directory, mode === 'apply' ? 'apply.log' : `verify-${Date.now()}.log`),
  )
  if (mode === 'verify') {
    if (result.plan.changed) throw new Error('O adulto ainda difere do Kids')
    console.log(
      JSON.stringify({ mode, environment, equivalent: true, sourceHash: result.plan.sourceHash }),
    )
  } else {
    await writeFile(join(directory, 'receipt.json'), JSON.stringify(result, null, 2), {
      flag: 'wx',
    })
    console.log(JSON.stringify(result))
  }
}
if (import.meta.main) await main()
