// Read-only analysis of the supplied snapshot. No network, credentials, or database access.
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const vm = require('node:vm')
const assert = require('node:assert/strict')
const ts = require('../../node_modules/.bun/typescript@5.9.3/node_modules/typescript')
const root = 'C:/Users/tocha/Downloads/insta-p8-main/insta-p8-main'
const out = __dirname
const files = []
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory() && !['node_modules', '.git', '.next'].includes(e.name)) walk(path.join(dir, e.name))
    else if (e.isFile()) files.push(path.join(dir, e.name))
  }
}
walk(root)
const rel = p => path.relative(root, p).replaceAll('\\', '/')
const sourceFiles = files.filter(p => /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(p))
const graph = new Map()
const inventory = files.map(p => {
  const b = fs.readFileSync(p)
  const row = { path: rel(p), bytes: b.length, sha256: crypto.createHash('sha256').update(b).digest('hex') }
  if (sourceFiles.includes(p)) {
    const s = b.toString('utf8')
    const ast = ts.createSourceFile(p, s, ts.ScriptTarget.Latest, true)
    const imports = [], exports = []
    let anyCount = 0, assertions = 0, functions = 0
    function visit(n) {
      if (ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) {
        if (n.moduleSpecifier && ts.isStringLiteral(n.moduleSpecifier)) imports.push(n.moduleSpecifier.text)
      }
      if (n.kind === ts.SyntaxKind.AnyKeyword) anyCount++
      if (ts.isAsExpression(n) || ts.isTypeAssertionExpression(n)) assertions++
      if (ts.isFunctionLike(n)) functions++
      if (n.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
        if (n.name) exports.push(n.name.getText(ast))
        else if (ts.isVariableStatement(n)) exports.push(...n.declarationList.declarations.map(d => d.name.getText(ast)))
      }
      ts.forEachChild(n, visit)
    }
    visit(ast)
    const deps = imports.flatMap(i => {
      const base = i.startsWith('@/') ? path.join(root, i.slice(2)) : i.startsWith('.') ? path.resolve(path.dirname(p), i) : null
      if (!base) return []
      const found = [base, ...['.ts','.tsx','.js','.jsx','.mjs','.cjs','/index.ts','/index.tsx'].map(ext => base + ext)].find(f => sourceFiles.includes(f))
      return found ? [rel(found)] : []
    })
    graph.set(rel(p), deps)
    Object.assign(row, { lines: s.split(/\r?\n/).length, imports, exports, anyCount, assertions, functions, tsNoCheck: /@ts-nocheck/.test(s), parseDiagnostics: ast.parseDiagnostics.length })
  }
  return row
})
const roots = [...graph.keys()].filter(p => /^app\/.*(?:page|layout|route|loading)\.[tj]sx?$/.test(p) || p.startsWith('scripts/') || p.endsWith('.config.mjs'))
const reached = new Set()
function mark(p) { if (reached.has(p)) return; reached.add(p); for (const d of graph.get(p) || []) mark(d) }
roots.forEach(mark)
for (const row of inventory) if (graph.has(row.path)) row.reachableByStaticImports = reached.has(row.path)
fs.writeFileSync(path.join(out, 'inventory.json'), JSON.stringify(inventory, null, 2) + '\n')

const quiet = { log() {}, warn() {}, error() {} }
const tests = []
function load(file, mocks = {}, extra = '') {
  const code = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8') + extra, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText
  const mod = { exports: {} }
  const context = {
    module: mod, exports: mod.exports,
    require: name => {
      if (Object.hasOwn(mocks, name)) return mocks[name]
      if (['crypto', 'node:crypto'].includes(name)) return crypto
      throw new Error(`Unmocked dependency: ${name}`)
    },
    console: quiet, process: { env: { INSTAGRAM_APP_SECRET: 'audit-fixture' } },
    Buffer, URL, URLSearchParams, AbortSignal, setTimeout, clearTimeout,
    fetch: async () => { throw new Error('Network disabled in audit') },
  }
  vm.runInNewContext(code, context, { filename: file })
  return mod.exports
}
const response = { NextResponse: { json: (body, options) => ({ body, status: options?.status || 200 }) } }
const user = { id: 'owner', business_account_id: 'business', page_id: 'business', access_token: 'fixture', username: 'fixture', groq_auto_reply_enabled: true }
function harness(rules, opts = {}) {
  const calls = [], rows = [], seen = new Set()
  const db = { from(table) {
    let insert, filters = []
    const q = {
      select() { return this }, eq(...v) { filters.push(v); return this }, or() { return this },
      order() { return this }, limit() { return this }, single() { return this },
      update() { return this }, insert(v) { insert = v; return this },
      then(resolve, reject) {
        if (opts.dbFails) return Promise.reject(new Error('fixture DB unavailable')).then(resolve, reject)
        let data = null, error = null
        if (table === 'users') data = user
        if (table === 'automations') data = rules
        if (table === 'conversations') data = { id: 'conv' }
        if (table === 'messages' && !insert) data = []
        if (insert) {
          rows.push({ table, row: insert })
          if (seen.has(insert.id)) error = { code: '23505' }
          seen.add(insert.id)
        }
        return Promise.resolve({ data, error }).then(resolve, reject)
      },
    }
    return q
  } }
  const send = async (...args) => { calls.push({ type: 'dm', args }); return { ok: !opts.sendFails } }
  const api = {
    sendTextDM: send, sendCardDM: send, sendMediaDM: send,
    sendSenderAction: async () => ({ ok: true }),
    replyToComment: async () => { calls.push({ type: 'public' }); return { ok: true } },
    fetchProfile: async () => ({ username: 'sender' }), verifyIdOwnership: async () => false,
    sleep: async () => {}, buildFollowGateCard: x => x,
  }
  const webhook = load('app/api/instagram/webhook/route.ts', {
    'next/server': response,
    '@/lib/supabase-server': { getSupabaseServerClient: async () => db },
    '@/lib/supabase-migrate': { ensureSchema: async () => {} },
    '@/lib/instagram-api': api,
    '@/lib/ai-reply': { generateAIReply: async () => { calls.push({ type: 'ai' }); return 'fixture AI' } },
    '@/lib/unlock-tracking': { unlockKey: () => 'key', bumpUnlockAttempt: async () => 1, clearUnlockAttempts: async () => {} },
  }, '\nexport { keywordMatches };')
  const post = async entry => {
    const raw = JSON.stringify({ entry: [entry] })
    const signature = 'sha256=' + crypto.createHmac('sha256', 'audit-fixture').update(raw).digest('hex')
    return webhook.POST({ text: async () => raw, headers: { get: () => signature } })
  }
  return { post, calls, rows, db, keywordMatches: webhook.keywordMatches }
}
const event = (text, extra = {}) => ({ id: 'business', messaging: [{ sender: { id: 'sender' }, recipient: { id: 'business' }, message: { mid: 'same-event', text, ...extra } }] })
const rule = (source, type, value) => ({ id: source, trigger_source: source, trigger_type: type, trigger_value: value, response_content: { message: 'fixture reply' } })
async function check(name, fn) { const result = await fn(); tests.push({ name, result, status: 'observed' }) }

async function main() {
  await check('No active automation drops incoming inbox message and AI fallback', async () => {
    const h = harness([]); await h.post(event('hello'))
    assert.equal(h.rows.length, 0); assert.equal(h.calls.length, 0)
    return { savedMessages: 0, aiCalls: 0 }
  })
  await check('Replayed DM event sends twice despite duplicate message primary key', async () => {
    const h = harness([rule('dm', 'keyword', 'hello')]); await h.post(event('hello')); await h.post(event('hello'))
    const sent = h.calls.filter(c => c.type === 'dm').length; assert.equal(sent, 2)
    return { sameEventDeliveries: 2, outboundSends: sent }
  })
  await check('Story reply can match both story and DM branches', async () => {
    const h = harness([rule('story', 'reply', 'hello'), rule('dm', 'keyword', 'hello')]); await h.post(event('hello', { reply_to: { story: { id: 'story1' } } }))
    const sent = h.calls.filter(c => c.type === 'dm').length; assert.equal(sent, 2)
    return { incomingEvents: 1, outboundSends: sent }
  })
  await check('Public confirmation occurs before failed private reply', async () => {
    const h = harness([rule('comment', 'keyword', 'hello')], { sendFails: true })
    await h.post({ id: 'business', changes: [{ field: 'comments', value: { id: 'comment1', text: 'hello', from: { id: 'sender' }, media: { id: 'post1' } } }] })
    assert.deepEqual(h.calls.map(c => c.type), ['public', 'dm'])
    return { order: ['public', 'dm_failed'], savedMessages: h.rows.length }
  })
  await check('Database failure acknowledged with HTTP 200', async () => {
    const h = harness([], { dbFails: true }); const r = await h.post(event('hello')); assert.equal(r.status, 200)
    return r
  })
  await check('Portuguese matching has no accent normalization', async () => {
    const h = harness([])
    const result = { 'FERIAS/FÉRIAS': h.keywordMatches('FERIAS', 'FÉRIAS'), 'OLÁ/OLÁ': h.keywordMatches('OLÁ', 'OLÁ'), 'JEITO/jeito': h.keywordMatches('JEITO', 'jeito') }
    assert.equal(result['FERIAS/FÉRIAS'], false); assert.equal(result['OLÁ/OLÁ'], false); assert.equal(result['JEITO/jeito'], true)
    return result
  })
  await check('Automation GET accepts caller userId without any authentication object', async () => {
    const h = harness([{ id: 'fixture-rule' }])
    const route = load('app/api/automations/route.ts', { 'next/server': response, '@/lib/supabase-server': { getSupabaseServerClient: async () => h.db } })
    const r = await route.GET({ nextUrl: new URL('https://fixture.invalid/api/automations?userId=another-owner') })
    assert.equal(r.status, 200)
    return { status: r.status, recordsReturned: r.body.length, sessionSupplied: false }
  })
  // Run the two original checks with their own mocked APIs and a local TS compiler.
  for (const file of ['scripts/check-dm-ordering.cjs', 'scripts/check-reply-api.cjs']) {
    const logs = []
    const ctx = {
      console: { log: (...x) => logs.push(x.join(' ')), error() {}, warn() {} },
      process: { env: {}, exitCode: 0 }, Buffer, AbortSignal, DOMException, setImmediate, setTimeout,
      require: name => name === 'typescript' ? ts : name === 'node:fs' ? { readFileSync: (p, ...args) => fs.readFileSync(path.join(root, p), ...args) } : require(name),
    }
    ctx.global = ctx
    const code = fs.readFileSync(path.join(root, file), 'utf8').replace(/main\(\)\.catch\([\s\S]*$/, 'global.done = main();')
    vm.runInNewContext(code, ctx, { filename: file })
    await ctx.done
    tests.push({ name: file, status: 'passed', result: logs.filter(x => x.startsWith('PASS:')) })
  }
  const source = inventory.filter(r => r.lines)
  const summary = {
    capturedAt: new Date().toISOString(), root, files: inventory.length, sourceFiles: source.length,
    sourceLines: source.reduce((n, f) => n + f.lines, 0),
    anyKeywords: source.reduce((n, f) => n + f.anyCount, 0),
    assertions: source.reduce((n, f) => n + f.assertions, 0),
    tsNoCheck: source.filter(f => f.tsNoCheck).map(f => f.path),
    parseErrors: source.filter(f => f.parseDiagnostics),
    notReachedByStaticImports: source.filter(f => !f.reachableByStaticImports).map(f => f.path),
    largest: [...source].sort((a,b) => b.lines-a.lines).slice(0,5).map(f=>({path:f.path,lines:f.lines})),
    tests,
    limits: ['Mocked local execution only; no Meta/Supabase calls', 'Static reachability is not proof of unused public APIs or runtime routes', 'No full dependency install, typecheck, build or browser validation'],
  }
  fs.writeFileSync(path.join(out, 'evidence.json'), JSON.stringify(summary, null, 2) + '\n')
  console.log(JSON.stringify(summary, null, 2))
}
main().catch(e => { console.error(e); process.exitCode = 1 })
