import { encodeProjectJsonGraph } from '../../../../../packages/core/src/studio/project-json-graph'
import { decodeProjectJsonGraph } from '../../../../../packages/core/src/studio/project-json-graph-decode'
import { localSnapshotsEqual } from '../../../../../packages/studio/src/project-migrations/localTransaction'
import {
  conditionalGeneration,
  conditionalWrite,
  readValues,
  writeInOneTransaction,
} from '../../../../../packages/studio/src/state/idbTransaction'

const encoder = new TextEncoder()
const parts = [
  'meta',
  'files',
  'state',
  'blocks',
  'assets',
  'thumb',
  'head',
  'applications',
  'source',
  'game',
]
const id = 'oficina'
const v4 = parts.map((p) =>
  p === 'game' ? 'sz:game-storage:' + id : 'sz:v4:project-' + p + ':' + id,
)
const ledger = 'qa:v5:ledger'
const head = 'qa:v5:head:oficina'
const fork = 'qa:v5:fork:oficina'
const byteCount = (s) => encoder.encode(s).length
const digest = async (bytes) =>
  Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), (v) =>
    v.toString(16).padStart(2, '0'),
  ).join('')
function check(ok, msg) {
  if (!ok) throw Error(msg)
}
function storeBytes(key, text) {
  return byteCount(key) + byteCount(text)
}
function imageData() {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 384
  const ctx = canvas.getContext('2d')
  const pixels = ctx.createImageData(384, 384)
  let seed = 12345
  for (let i = 0; i < pixels.data.length; i += 4) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    pixels.data[i] = seed >>> 24
    pixels.data[i + 1] = seed >>> 16
    pixels.data[i + 2] = seed >>> 8
    pixels.data[i + 3] = 255
  }
  ctx.putImageData(pixels, 0, 0)
  return canvas.toDataURL('image/png')
}
export async function scenario(old, modern, fixture, large) {
  const label = large ? 'ampla' : 'pequena'
  const s = old.getProjectStorageScope('qa-origem-' + label)
  const candidate = modern.privateRegionalProjectScope('qa-foto-' + label)
  old.setStorageNamespace(s.namespace)
  const p = old.createEmptyProject(id, 'Oficina ' + label)
  const first = fixture.previous
  p.assets = [
    {
      id: 'materia',
      name: 'vila',
      proPath: 'public/materials/vila.png',
      kind: 'image',
      source: 'library',
      libId: 'personal:' + first.id,
      libOrigin: 'pinta',
      width: first.width,
      height: first.height,
      dataUrl: first.dataUrl,
    },
  ]
  p.blocksState = {
    blocks: {
      languageVersion: 0,
      blocks: [{ type: 'sz_js_console_log_text', id: 'primeiro', fields: { VALUE: 'Vila' } }],
    },
  }
  p.files['script.js'] = '// autoria original\n'
  if (large) {
    const png = imageData()
    for (let i = 0; i < 8; i++)
      p.assets.push({
        id: 'img' + i,
        name: 'imagem' + i,
        proPath: 'public/materials/imagem' + i + '.png',
        source: 'upload',
        kind: 'image',
        width: 384,
        height: 384,
        dataUrl: png,
      })
    p.extraFiles = Array.from({ length: 5 }, (_, i) => ({
      name: 'fonte' + i + '.js',
      language: 'javascript',
      content: '/*' + ('abcdefç' + i).repeat(125000) + '*/',
    }))
  }
  await old.persistProject(p, {}, s)
  const admitted = await old.prepareEditableStudioProject(await old.loadProjectById(id, s))
  check(
    admitted.assets.length === p.assets.length &&
      (admitted.extraFiles?.length ?? 0) === (p.extraFiles?.length ?? 0),
    'O leitor 16bf perdeu conteúdo da carga',
  )
  await readValues(s.store, v4)
  await writeInOneTransaction(s.store, {
    puts: [
      [v4.at(-1), { placar: 'oito' }],
      [v4[5], first.dataUrl],
    ],
  })
  const base = await readValues(s.store, v4)
  await writeInOneTransaction(candidate.store, {
    puts: v4.flatMap((key, i) => (base[i] === undefined ? [] : [[key, base[i]]])),
  })
  modern.setProjectStorageNamespace(candidate.namespace)
  const current = fixture.current
  const ok = await modern.refreshPrivateRegionalProjectAsset({
    projectId: id,
    assetId: 'materia',
    scope: candidate,
    capture: {
      width: current.width,
      height: current.height,
      dataUrl: current.dataUrl,
      regional: { dataVersion: 5, sourceId: current.id, sha256: current.regional.sha256 },
    },
  })
  check(ok, 'Falha no refresh regional real')
  const regional = await readValues(candidate.store, v4)
  check(regional[4].assets[0].dataUrl === current.dataUrl, 'PNG5 ausente')
  const heap = [],
    ms = {}
  const mark = (name) => heap.push({ phase: name, jsHeapBytes: performance.memory.usedJSHeapSize })
  async function timed(name, fn) {
    const start = performance.now()
    const value = await fn()
    ms[name] = Number((performance.now() - start).toFixed(2))
    mark(name)
    return value
  }
  mark('dadosProntos')
  const blobKey = (hash) => 'qa:v5:part:' + hash
  const cas = (keys, decide) =>
    conditionalWrite(s.store, s.identity, conditionalGeneration(s.identity), keys, decide)
  async function encode(values) {
    const refs = [],
      bodies = new Map()
    for (let i = 0; i < values.length; i++) {
      if (values[i] === undefined) {
        refs.push(null)
        continue
      }
      const text = encodeProjectJsonGraph(values[i])
      const sha = await digest(encoder.encode(text))
      refs.push(sha)
      bodies.set(blobKey(sha), text)
    }
    return { refs, bodies }
  }
  const v4Bytes = (values) =>
    values.reduce(
      (sum, value, i) =>
        sum + (value === undefined ? 0 : storeBytes(v4[i], encodeProjectJsonGraph(value))),
      0,
    )
  const savedBaseBytes = v4Bytes(base)
  const encoded = await timed('preparar', () => encode(regional))
  const initial = Object.freeze({ version: 1, used: 0, generation: 0 })
  // Fixed-width counters make the ledger itself part of the exact logical byte quota.
  const encLedger = (used, generation) =>
    JSON.stringify({
      version: 1,
      used: String(used).padStart(16, '0'),
      generation: String(generation).padStart(12, '0'),
    })
  const ledgerCharge = storeBytes(ledger, encLedger(0, 0))
  let maxReads = 0
  async function prepareCommit({
    expectedV4,
    entry,
    version,
    prepared,
    prior,
    knownBodies,
    legacyDelta,
    limit,
    failLast = false,
  }) {
    const headText = JSON.stringify({ version: 1, revision: version, refs: prepared.refs })
    const missing = [...prepared.bodies].filter(([key]) => !knownBodies.has(key))
    const delta =
      (prior.generation ? 0 : ledgerCharge) +
      legacyDelta +
      storeBytes(entry, headText) +
      missing.reduce((n, [key, text]) => n + storeBytes(key, text), 0)
    const expectedLedger = prior.generation ? encLedger(prior.used, prior.generation) : undefined
    const keys = [...v4, ledger, entry, ...knownBodies.keys(), ...missing.map(([key]) => key)]
    maxReads = Math.max(maxReads, keys.length)
    return cas(keys, (values) => {
      check(
        expectedV4.every((v, i) => localSnapshotsEqual(values[i], v)),
        'fonte divergente',
      )
      const offset = v4.length
      check(
        values[offset] === expectedLedger && values[offset + 1] === undefined,
        'cabeça divergente',
      )
      let cursor = offset + 2
      for (const [key, text] of knownBodies) {
        check(values[cursor++] === text, 'Corpo privado divergente ' + key)
      }
      for (const [key] of missing) check(values[cursor++] === undefined, 'Corpo imprevisto ' + key)
      const used = prior.used + delta
      if (used > limit) return { write: {}, result: { used, accepted: false } }
      const puts = [...missing, [entry, headText], [ledger, encLedger(used, prior.generation + 1)]]
      if (failLast) puts.push(['qa:nunca-gravar', () => undefined])
      return { write: { puts }, result: { used, accepted: true } }
    })
  }
  const args = {
    expectedV4: base,
    entry: head,
    version: 1,
    prepared: encoded,
    prior: initial,
    knownBodies: new Map(),
    legacyDelta: savedBaseBytes,
  }
  const projected = await prepareCommit({ ...args, limit: 0 })
  const rejected = await prepareCommit({ ...args, limit: projected.used - 1 })
  check(
    !rejected.accepted && (await readValues(s.store, [ledger, head])).every((v) => v === undefined),
    'Quota parcial',
  )
  let rejectedWrite = false
  try {
    await prepareCommit({ ...args, limit: projected.used, failLast: true })
  } catch (e) {
    rejectedWrite = e.name === 'DataCloneError'
  }
  check(
    rejectedWrite &&
      (await readValues(s.store, [ledger, head, ...encoded.bodies.keys()])).every(
        (v) => v === undefined,
      ),
    'Falha no último PUT alterou a origem',
  )
  const accepted = await timed('commit', () => prepareCommit({ ...args, limit: projected.used }))
  check(accepted.accepted, 'Limite exato recusado')
  async function open(entry, expected) {
    const [headText] = await readValues(s.store, [entry])
    const h = JSON.parse(headText)
    const bodies = await readValues(s.store, h.refs.filter(Boolean).map(blobKey))
    let at = 0
    for (let i = 0; i < h.refs.length; i++) {
      if (!h.refs[i]) {
        check(expected[i] === undefined, 'Ausência perdeu presença')
        continue
      }
      const text = bodies[at++]
      check(
        (await digest(encoder.encode(text))) === h.refs[i] &&
          localSnapshotsEqual(expected[i], decodeProjectJsonGraph(text)),
        'Parte diferente após abertura',
      )
    }
  }
  await timed('aberturaVerificada', () => open(head, regional))
  const restored = structuredClone(admitted)
  restored.files['script.js'] = '// restaurado pelo escritor v4'
  await old.restoreProjectFromCloud(restored, { expectedId: id, namespace: s.namespace })
  const changed = await readValues(s.store, v4)
  let staleRejected = false
  try {
    await prepareCommit({ ...args, entry: fork, limit: projected.used })
  } catch (e) {
    staleRejected = e.message === 'fonte divergente'
  }
  check(
    staleRejected && changed[4].assets[0].dataUrl === first.dataUrl,
    'CAS contra restore v4 falhou',
  )
  const forkBytes = v4Bytes(changed)
  const other = await timed('prepararFork', () => encode(changed))
  const forkArgs = {
    expectedV4: changed,
    entry: fork,
    version: 1,
    prepared: other,
    prior: { used: accepted.used, generation: 1 },
    knownBodies: encoded.bodies,
    legacyDelta: forkBytes - savedBaseBytes,
  }
  const forkFloor = await prepareCommit({ ...forkArgs, limit: 0 })
  const finalized = await timed('commitFork', () =>
    prepareCommit({ ...forkArgs, limit: forkFloor.used }),
  )
  check(finalized.accepted, 'Fork fora de cota')
  await timed('reaberturaAmbas', async () => {
    await open(head, regional)
    await open(fork, changed)
  })
  const bodies = new Set([...encoded.bodies.keys(), ...other.bodies.keys()])
  return {
    label,
    assets: admitted.assets.length,
    extraFiles: admitted.extraFiles?.length ?? 0,
    sourceGraphBytes: savedBaseBytes,
    currentSourceBytes: forkBytes,
    withRegional: accepted.used,
    withFork: finalized.used,
    uniqueBodies: bodies.size,
    reusedForkBodies: other.bodies.size + encoded.bodies.size - bodies.size,
    maxPointReads: maxReads,
    checks: { oneByteUnder: true, lastPutAbort: true, staleV4: true, reopenedBoth: true },
    ms,
    heap,
  }
}
