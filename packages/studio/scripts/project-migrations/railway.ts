import { createHash } from 'node:crypto'
import { dirname, join } from 'node:path'

/** Ferramenta operacional isolada. Não é importada pelo editor nem pelo servidor. */
export const STAGING_PROJECT = '415d5a1c-5f75-432c-8445-b395d0977ce3'
const SERVICES = {
  database: 'aa282801-ffba-477c-af6d-394b2f4f9af9',
  objects: 'fc8a1b29-ac14-4dc9-a7b3-03d497b8bf4f',
}
export const TABLES = {
  'members.creations': {
    key: 'id',
    where: "tool = 'studio' and storage_ref is not null",
    columns: [
      'revision',
      'last_reserved_revision',
      'format_version',
      'storage_ref',
      'bytes',
      'parts',
      'synced_at',
    ],
  },
  'members.studio_submissions': {
    key: 'id',
    where:
      "exists (select 1 from members.lesson_blocks b where b.id=t.block_id and b.kind='studio')",
    columns: ['project', 'previous_project'],
  },
  'members.lesson_blocks': { key: 'id', where: 'true', columns: ['content', 'content_revision'] },
  'members.courses': { key: 'id', where: 'true', columns: ['metadata', 'version'] },
  'members.lessons': { key: 'id', where: 'true', columns: [] },
  'members.lesson_attachments': { key: 'id', where: 'true', columns: [] },
  'members.studio_block_grants': { key: 'id', where: 'true', columns: ['blocks'] },
  'members.lesson_drafts': {
    key: 'lesson_id',
    where: 'true',
    columns: ['document', 'revision', 'published_revision'],
  },
  'members.lesson_structures': {
    key: 'lesson_id',
    where: 'true',
    columns: ['sections', 'revision'],
  },
  'members.lesson_criteria_migration_snapshots': {
    key: 'lesson_id',
    where: 'true',
    columns: ['previous_sections', 'migrated_sections'],
  },
  'hub.threads': { key: 'id', where: 'play_id is not null', columns: ['studio_meta'] },
} as const
export type Table = keyof typeof TABLES
export type Row = Record<string, unknown>
export type Bucket = 'ugc' | 'private'
export interface StoredObject {
  bucket: Bucket
  key: string
  bytes: string
  etag: string
}
export const hash = (value: string | Uint8Array): string =>
  createHash('sha256').update(value).digest('hex')

async function remote<T>(service: keyof typeof SERVICES, source: string): Promise<T> {
  // Payload pelo stdin: não passa pelo shell nem pelo limite de argumentos do Windows.
  const evaluate =
    'let source="";for await(const chunk of process.stdin)source+=chunk;await eval("(async()=>{"+source+"})()")'
  const command =
    service === 'database'
      ? `bun -e '${evaluate}'`
      : `node -e '(async()=>{${evaluate}})().catch(e=>{console.error(e.message);process.exit(1)})'`
  let executable = Bun.which('railway')
  if (!executable) throw new Error('Railway CLI não encontrado')
  if (/\.cmd$/i.test(executable))
    executable = join(dirname(executable), 'node_modules/@railway/cli/bin/railway.exe')
  const child = Bun.spawn(
    [
      executable,
      'ssh',
      '-p',
      STAGING_PROJECT,
      '-e',
      'staging',
      '-s',
      SERVICES[service],
      '--',
      command,
    ],
    { stdin: new TextEncoder().encode(source), stdout: 'pipe', stderr: 'pipe' },
  )
  const [stdout, stderr, code] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ])
  if (code !== 0)
    throw new Error(`Railway ${service}: ${stderr.slice(-1000) || stdout.slice(-1000)}`)
  const line = stdout.split(/\r?\n/).find((line) => line.startsWith('__G2D_RESULT__'))
  if (!line) throw new Error('Resposta remota sem marcador de resultado')
  return JSON.parse(line.slice(14)) as T
}

const guard = `if(process.env.RAILWAY_ENVIRONMENT_NAME!=='staging'||process.env.RAILWAY_PROJECT_ID!==${JSON.stringify(STAGING_PROJECT)})throw Error('Ambiente de migração recusado');`
const emit = `console.log('__G2D_RESULT__'+JSON.stringify(result));`
const sqlSetup = `${guard}const postgres=(await import('/app/packages/members/node_modules/postgres/src/index.js')).default;const sql=postgres(process.env.DATABASE_URL,{max:1});`
const r2Setup = `${guard}if(process.env.R2_UGC_BUCKET!=='testes-ugc'||process.env.R2_PRIVATE_BUCKET!=='testes-privado')throw Error('Buckets de migração recusados');const sdk=require('/app/node_modules/.bun/node_modules/@aws-sdk/client-s3');const client=new sdk.S3Client({region:'auto',endpoint:'https://'+process.env.R2_ACCOUNT_ID+'.r2.cloudflarestorage.com',credentials:{accessKeyId:process.env.R2_ACCESS_KEY_ID,secretAccessKey:process.env.R2_SECRET_ACCESS_KEY}});const buckets={ugc:'testes-ugc',private:'testes-privado'};`

export async function inventoryRows(): Promise<Record<Table, Row[]>> {
  const queries = Object.entries(TABLES)
    .map(
      ([table, info]) =>
        `result[${JSON.stringify(table)}]=(await tx.unsafe(${JSON.stringify(`select to_jsonb(t) as row from ${table} t where ${info.where} order by ${info.key}`)})).map(x=>x.row);`,
    )
    .join('')
  return remote(
    'database',
    `${sqlSetup}let result={};try{await sql.begin('read only',async tx=>{${queries}});${emit}}finally{await sql.end()}`,
  )
}

export async function assertStagingCandidate(commit: string): Promise<void> {
  if (!/^[a-f0-9]{40}$/.test(commit)) throw new Error('Informe o SHA completo da versão candidata')
  for (const service of ['database', 'objects'] as const)
    await remote(
      service,
      `${guard}if(process.env.RAILWAY_GIT_COMMIT_SHA!==${JSON.stringify(commit)})throw Error('A versão candidata ainda não está implantada neste serviço');${service === 'database' ? "const {STUDIO_PROJECT_FORMAT_VERSION}=await import('/app/packages/core/src/studio/index.ts');if(STUDIO_PROJECT_FORMAT_VERSION!==2)throw Error('O serviço ainda aceita o contrato histórico');" : ''}const result={ok:true};${emit}`,
    )
}

export async function readObjects(
  refs: Array<{ bucket: Bucket; key: string }>,
): Promise<StoredObject[]> {
  return remote(
    'objects',
    `${r2Setup}const result=[];for(const ref of ${JSON.stringify(refs)}){try{const o=await client.send(new sdk.GetObjectCommand({Bucket:buckets[ref.bucket],Key:ref.key}));if(o.ContentLength>41943040)throw Error('Objeto acima do limite');result.push({...ref,etag:o.ETag,bytes:Buffer.from(await o.Body.transformToByteArray()).toString('base64')});}catch(e){if(e.$metadata?.httpStatusCode!==404)throw e;}}${emit}`,
  )
}

/** Backup e novos blobs só podem nascer. Conteúdo existente diferente é conflito. */
export async function putObject(object: Omit<StoredObject, 'etag'>, etag?: string): Promise<void> {
  await remote(
    'objects',
    `${r2Setup}const x=${JSON.stringify(object)};const bytes=Buffer.from(x.bytes,'base64');let result;try{result=await client.send(new sdk.PutObjectCommand({Bucket:buckets[x.bucket],Key:x.key,Body:bytes,ContentType:x.key.endsWith('.gz')?'application/gzip':'application/json',${etag ? `IfMatch:${JSON.stringify(etag)}` : "IfNoneMatch:'*'"}}));result={ok:true};}catch(e){if(e.$metadata?.httpStatusCode!==412)throw e;const o=await client.send(new sdk.GetObjectCommand({Bucket:buckets[x.bucket],Key:x.key}));if(!Buffer.from(await o.Body.transformToByteArray()).equals(bytes))throw Error('Conflito de objeto: '+x.key);result={ok:true,alreadyApplied:true};}${emit}`,
  )
}

export interface RowChange {
  table: Table
  before: Row
  after: Row
}

/** Ensaia tipos SQL e a comparação exata, em transação explicitamente somente leitura. */
export async function validateRowChanges(changes: RowChange[]): Promise<number> {
  for (const change of changes) if (!TABLES[change.table]) throw new Error('Tabela inválida')
  const queries = changes
    .map(({ table, before, after }) => {
      const query = `select (to_jsonb(jsonb_populate_record(null::${table},$1::text::jsonb))=$1::text::jsonb) as exact, exists(select 1 from ${table} t where to_jsonb(t)=$2::text::jsonb or to_jsonb(t)=$1::text::jsonb) as source`
      return `{
      const [row]=await tx.unsafe(${JSON.stringify(query)},[${JSON.stringify(JSON.stringify(after))},${JSON.stringify(JSON.stringify(before))}]);
      if(!row.exact||!row.source)throw Error(${JSON.stringify(`Simulação SQL divergente: ${table}:${before[TABLES[table].key]}`)});result++;
    }`
    })
    .join('')
  return remote(
    'database',
    `${sqlSetup}let result=0;try{await sql.begin('read only',async tx=>{${queries}});${emit}}finally{await sql.end()}`,
  )
}
/** Uma transação compara TODAS as colunas, inclusive reservas e edições concorrentes. */
export async function compareAndSwapRows(
  changes: RowChange[],
  sources: Record<Table, Row[]>,
): Promise<void> {
  for (const change of changes) {
    const info = TABLES[change.table]
    if (!info || change.before[info.key] !== change.after[info.key])
      throw new Error('Identidade de linha inválida')
    for (const key of Object.keys(change.after))
      if (
        JSON.stringify(change.before[key]) !== JSON.stringify(change.after[key]) &&
        !(info.columns as readonly string[]).includes(key)
      )
        throw new Error(`Coluna não autorizada: ${change.table}.${key}`)
  }
  const statements = changes
    .map(({ table, before, after }) => {
      const info = TABLES[table]
      const columns = Object.keys(after).filter(
        (key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]),
      )
      // O payload é passado como JSONB parametrizado; jsonb_populate_record conserva tipos SQL.
      const query = `update ${table} t set ${columns.map((key) => `${key}=v.${key}`).join(',')} from jsonb_populate_record(null::${table},$1::text::jsonb) v where t.${info.key}=v.${info.key} and to_jsonb(t)=$2::text::jsonb returning t.${info.key}`
      return `{
      const before=JSON.parse(${JSON.stringify(JSON.stringify(before))}),after=JSON.parse(${JSON.stringify(JSON.stringify(after))});
      const rows=await tx.unsafe(${JSON.stringify(query)},[JSON.stringify(after),JSON.stringify(before)]);
      if(rows.length!==1){const present=await tx.unsafe(${JSON.stringify(`select 1 from ${table} t where to_jsonb(t)=$1::text::jsonb`)},[JSON.stringify(after)]);if(present.length!==1)throw Error(${JSON.stringify(`Conflito de revisão: ${table}:${before[info.key]}`)});}
    }`
    })
    .join('')
  // O hash publicado depende também das linhas que não mudaram e da ausência de novas linhas.
  // Bloqueio breve de escrita durante a comparação/promoção; uploads e backups já terminaram.
  const snapshotChecks = Object.entries(TABLES)
    .map(([table, info]) => {
      const alternatives = changes.filter((c) => c.table === table).map((c) => c.after)
      return `{
      const expected=JSON.parse(${JSON.stringify(JSON.stringify(sources[table as Table]))});
      const alternatives=JSON.parse(${JSON.stringify(JSON.stringify(alternatives))});
      const actual=(await tx.unsafe(${JSON.stringify(`select to_jsonb(t) as row from ${table} t where ${info.where}`)})).map(x=>x.row);
      const stable=v=>Array.isArray(v)?'['+v.map(stable).join(',')+']':v&&typeof v==='object'?'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+stable(v[k])).join(',')+'}':JSON.stringify(v);
      if(actual.length!==expected.length||actual.some(row=>!expected.some(old=>stable(old)===stable(row))&&!alternatives.some(next=>stable(next)===stable(row))))throw Error(${JSON.stringify(`Inventário mudou: ${table}`)});
    }`
    })
    .join('')
  const tableLocks = `await tx.unsafe(${JSON.stringify(`lock table ${Object.keys(TABLES).sort().join(',')} in share row exclusive mode`)});`
  const owners = [
    ...new Set(
      changes.filter((c) => c.table === 'members.creations').map((c) => String(c.before.user_id)),
    ),
  ].sort()
  const locks = owners
    .map(
      (owner) =>
        `await tx.unsafe('select pg_advisory_xact_lock(hashtextextended($1,0))',[${JSON.stringify(`creation-quota:${owner}`)}]);`,
    )
    .join('')
  const quota = owners
    .map(
      (owner) =>
        `if(Number((await tx.unsafe("select coalesce(sum(bytes),0) as bytes from members.creations where user_id=$1::uuid and deleted_at is null and storage_ref is not null",[${JSON.stringify(owner)}]))[0].bytes)>1073741824)throw Error('Migração excede quota do perfil');`,
    )
    .join('')
  await remote(
    'database',
    `${sqlSetup}try{await sql.begin(async tx=>{await tx.unsafe("set local lock_timeout='5s'");await tx.unsafe("select pg_advisory_xact_lock(hashtextextended('studio-document-migration',0))");${locks}${tableLocks}${snapshotChecks}${statements}${quota}});const result={ok:true};${emit}}finally{await sql.end()}`,
  )
}
