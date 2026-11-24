/**
 * Inventário das cópias do motor 2D que a conversão para o Pro escreveu (`public/sz-ext/<id>.js`).
 * Mora no core (`packages/core/src/studio/pro-engine-copies.generated.ts`), fonte única de quem o
 * usa: o "Atualizar o motor" do Pro (só uma cópia ainda igual a uma destas é trocada) e a revisão
 * do Pro no Estúdio, no BFF, no Members e no compilador remoto (uma cópia destas, intacta, fica fora
 * do teto de 256 mil caracteres por arquivo da criança). O motor é composto pelo Estúdio, por isso
 * o gerador mora aqui.
 *
 *   bun scripts/gen-pro-engine-copies.ts            acrescenta o motor de agora (rode ao mudar o motor)
 *   bun scripts/gen-pro-engine-copies.ts --check    falha se o motor de agora não está no inventário
 *   bun scripts/gen-pro-engine-copies.ts --history 2026-08-12 origin/main origin/staging staging
 *       refaz os estados publicados a partir do git (primeiro pai de cada ref e todo commit que mexeu
 *       no fecho do motor; a staging local entra porque também é implantada à mão): cada estado
 *       distinto do fecho de imports do motor é extraído para uma pasta temporária e composto pelo
 *       próprio código daquele estado. Rodado em 23/11/2026 sobre essas três refs.
 *
 * O inventário só cresce. Ficam de fora os estados anteriores a 15106f159 (13/08/2026): até ali a
 * fonte do jogo morava dentro do motor, e o motor de agora a lê de `public/sz-font.js`, que aqueles
 * projetos não têm. Trocar o motor mudaria a letra do jogo. Até 17/11 havia um texto só por motor,
 * registrado como `completo`; a troca escreve o motor completo de agora no lugar dele.
 */
import { createHash } from 'node:crypto'
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, posix } from 'node:path'
import { fileURLToPath } from 'node:url'

const EXTENSIONS = ['game-2d', 'game-2d-advanced'] as const
const VARIANTS = ['completo', 'sem-cenario-pinta'] as const
type Extension = (typeof EXTENSIONS)[number]
type Variant = (typeof VARIANTS)[number]
type Inventory = Record<Extension, Record<Variant, string[]>>
const FONT_OUTSIDE_ENGINE_COMMIT = '15106f159'
const output = fileURLToPath(
  new URL('../../core/src/studio/pro-engine-copies.generated.ts', import.meta.url),
)
const repo = fileURLToPath(new URL('../../..', import.meta.url))
const sha256 = (text: string) => createHash('sha256').update(text, 'utf8').digest('hex')

function readInventory(): Inventory {
  const inventory: Inventory = {
    'game-2d': { completo: [], 'sem-cenario-pinta': [] },
    'game-2d-advanced': { completo: [], 'sem-cenario-pinta': [] },
  }
  if (!existsSync(output)) return inventory
  // Lido como texto: o script não depende do módulo que ele mesmo gera.
  let extension: Extension | undefined
  let variant: Variant | undefined
  for (const line of readFileSync(output, 'utf8').split('\n')) {
    const key = /^ {2}'([a-z0-9-]+)': \{$/.exec(line)?.[1]
    if (key) extension = EXTENSIONS.find((id) => id === key)
    const group = /^ {4}'?([a-z-]+)'?: \[$/.exec(line)?.[1]
    if (group) variant = VARIANTS.find((name) => name === group)
    const hash = /^ {6}'([0-9a-f]{64})',$/.exec(line)?.[1]
    if (hash && extension && variant) inventory[extension][variant].push(hash)
  }
  return inventory
}

function writeInventory(inventory: Inventory) {
  const body = EXTENSIONS.map(
    (id) =>
      `  '${id}': {\n${VARIANTS.map(
        (variant) =>
          `    ${variant === 'completo' ? variant : `'${variant}'`}: [\n${inventory[id][variant]
            .map((hash) => `      '${hash}',\n`)
            .join('')}    ],\n`,
      ).join('')}  },\n`,
  ).join('')
  writeFileSync(
    output,
    `// Gerado por \`bun run --cwd packages/studio gen:pro-engine-copies\`. Não editar à mão.
// sha256 (UTF-8) de cada cópia \`public/sz-ext/<id>.js\` que a conversão para o Pro escreveu desde
// 15106f159 (13/08/2026), na ordem em que apareceram. Ver o cabeçalho do script.
import type { StudioProEngineInventory } from './pro-engine-copies'

export const STUDIO_PRO_ENGINE_COPIES: StudioProEngineInventory = {
${body}}
`,
  )
}

function add(inventory: Inventory, id: Extension, variant: Variant, hash: string): boolean {
  if (inventory[id][variant].includes(hash)) return false
  inventory[id][variant].push(hash)
  return true
}

async function currentHashes() {
  const { currentProEngineCopies } = await import('../src/modes/pro/proEngineCopies')
  const rows: Array<[Extension, Variant, string]> = []
  for (const id of EXTENSIONS) {
    const copies = await currentProEngineCopies(id)
    for (const variant of VARIANTS) rows.push([id, variant, sha256(copies[variant])])
  }
  return rows
}

/** Um estado histórico extraído: imprime os sha256 que a conversão daquele estado escreveria. */
async function evaluateState(root: string, eras: Record<'g2d' | 'gk', string>) {
  const base = join(root, 'packages/studio/src/official-extensions')
  const targets = [
    {
      id: 'game-2d',
      target: 'g2d',
      era: eras.g2d,
      file: 'game-2d/runtime.ts',
      name: 'gameTwoDRuntime',
    },
    {
      id: 'game-2d-advanced',
      target: 'gk',
      era: eras.gk,
      file: 'game-2d-advanced/runtime.ts',
      name: 'gameKitRuntime',
    },
  ] as const
  const out: Record<string, string> = {}
  for (const item of targets) {
    if (item.era === 'none') continue
    const runtime: Record<string, unknown> = await import(join(base, item.file))
    const plain = runtime[item.name]
    if (typeof plain !== 'string') throw new Error(`${item.id}: ${item.name} ausente`)
    // Antes de 17/11 havia um texto só; depois, o completo e o sem cenário (`mapTwoDBootstrap`).
    if (item.era === 'A') out[`${item.id}|completo`] = sha256(plain)
    else if (item.era === 'B') {
      const bootstrap: Record<string, unknown> = await import(join(base, 'map-2d/bootstrap.ts'))
      const compose = bootstrap.mapTwoDBootstrap
      if (typeof compose !== 'function') throw new Error('mapTwoDBootstrap ausente')
      const full: unknown = await compose(item.target)
      const withoutScene: unknown = await compose(item.target, { code: '' })
      if (typeof full !== 'string' || withoutScene !== plain)
        throw new Error(`${item.id}: variantes divergentes`)
      out[`${item.id}|completo`] = sha256(full)
      out[`${item.id}|sem-cenario-pinta`] = sha256(plain)
    } else throw new Error(`${item.id}: forma desconhecida do runtime`)
  }
  console.log(JSON.stringify(out))
}

function git(...args: string[]) {
  const run = Bun.spawnSync(['git', '-C', repo, ...args], { stdout: 'pipe', stderr: 'pipe' })
  if (run.exitCode !== 0) throw new Error(`git ${args.join(' ')}: ${run.stderr.toString()}`)
  return run.stdout.toString()
}

async function history(since: string, refs: string[]) {
  const blobs = new Map<string, string>()
  const blob = (id: string) => {
    const cached = blobs.get(id)
    if (cached !== undefined) return cached
    const text = git('cat-file', 'blob', id)
    blobs.set(id, text)
    return text
  }
  const transpiler = new Bun.Transpiler({ loader: 'ts' })
  const scanned = new Map<string, string[]>()
  const importsOf = (id: string) => {
    const cached = scanned.get(id)
    if (cached) return cached
    const list = transpiler.scanImports(blob(id)).map((item) => item.path)
    scanned.set(id, list)
    return list
  }
  const paths = [
    'packages/studio/src/official-extensions',
    'packages/studio/src/extensions',
    'packages/studio/src/ir',
    'packages/studio/src/three',
    'packages/studio/src/css',
    'packages/studio/src/html',
    'packages/studio/src/core',
    'packages/studio/src/codecs',
    'packages/core/src/studio',
    'packages/studio/package.json',
    'packages/core/package.json',
  ]
  // Primeiro pai (o que cada branch publicou) e todo commit que mexeu no fecho do motor.
  const commits = [
    ...new Set(
      (
        git('rev-list', '--first-parent', `--since=${since}`, ...refs) +
        git('rev-list', '--full-history', `--since=${since}`, ...refs, '--', ...paths)
      )
        .split('\n')
        .filter(Boolean),
    ),
  ].filter(
    (commit) =>
      Bun.spawnSync([
        'git',
        '-C',
        repo,
        'merge-base',
        '--is-ancestor',
        FONT_OUTSIDE_ENGINE_COMMIT,
        commit,
      ]).exitCode === 0,
  )
  const entries = [
    'packages/studio/src/official-extensions/game-2d/runtime.ts',
    'packages/studio/src/official-extensions/game-2d-advanced/runtime.ts',
    'packages/studio/src/official-extensions/map-2d/bootstrap.ts',
  ]
  const states = new Map<
    string,
    { date: string; files: Map<string, string>; eras: Record<'g2d' | 'gk', string> }
  >()
  for (const commit of commits) {
    const tree = new Map<string, string>()
    for (const line of git(
      'ls-tree',
      '-r',
      '--full-tree',
      commit,
      '--',
      'packages/studio/src',
      'packages/core/src',
      'packages/studio/package.json',
      'packages/core/package.json',
    ).split('\n')) {
      const match = /^\d+ blob ([0-9a-f]+)\t(.+)$/.exec(line)
      if (match) tree.set(match[2]!, match[1]!)
    }
    const studioPackage = tree.get('packages/studio/package.json')
    const corePackage = tree.get('packages/core/package.json')
    if (!studioPackage || !corePackage) continue
    const imports: Record<string, string> = JSON.parse(blob(studioPackage)).imports ?? {}
    const exportsMap: Record<string, unknown> = JSON.parse(blob(corePackage)).exports ?? {}
    const find = (base: string) =>
      [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`]
        .map((path) => posix.normalize(path))
        .find((path) => tree.has(path))
    const resolve = (from: string, spec: string) => {
      if (spec.startsWith('.')) return find(posix.join(posix.dirname(from), spec))
      if (spec.startsWith('#'))
        return imports[spec] ? find(posix.join('packages/studio', imports[spec])) : undefined
      if (!spec.startsWith('@sistemazero/core')) return undefined
      const sub = `.${spec.slice('@sistemazero/core'.length)}`
      let target = exportsMap[sub]
      for (const [pattern, value] of Object.entries(exportsMap))
        if (
          typeof target !== 'string' &&
          pattern.endsWith('/*') &&
          typeof value === 'string' &&
          sub.startsWith(pattern.slice(0, -1))
        )
          target = value.replace('*', sub.slice(pattern.length - 1))
      return typeof target === 'string' ? find(posix.join('packages/core', target)) : undefined
    }
    const seen = new Set<string>()
    const queue = entries.filter((path) => tree.has(path))
    while (queue.length) {
      const path = queue.shift()!
      if (seen.has(path) || !/\.tsx?$/.test(path)) continue
      seen.add(path)
      for (const spec of importsOf(tree.get(path)!)) {
        const target = resolve(path, spec)
        if (target) queue.push(target)
      }
    }
    const eraOf = (index: string, target: string, name: string) => {
      const id = tree.get(index)
      if (!id) return 'none'
      const text = blob(id)
      return text.includes(`mapTwoDBootstrap('${target}', context)`)
        ? 'B'
        : new RegExp(`\\b${name}\\b`).test(text)
          ? 'A'
          : '?'
    }
    const eras = {
      g2d: eraOf(
        'packages/studio/src/official-extensions/game-2d/index.ts',
        'g2d',
        'gameTwoDRuntime',
      ),
      gk: eraOf(
        'packages/studio/src/official-extensions/game-2d-advanced/index.ts',
        'gk',
        'gameKitRuntime',
      ),
    }
    const files = new Map([...seen].sort().map((path) => [path, tree.get(path)!]))
    files.set('packages/studio/package.json', studioPackage)
    files.set('packages/core/package.json', corePackage)
    const key = `${eras.g2d}${eras.gk}|${[...files].map(([path, id]) => `${path}:${id}`).join(',')}`
    const date = git('log', '-1', '--format=%cI', commit).trim()
    const known = states.get(key)
    if (!known || date < known.date) states.set(key, { date, files, eras })
  }
  console.error(`${commits.length} commits, ${states.size} estados distintos`)
  const root = mkdtempSync(join(tmpdir(), 'sz-motor-pro-'))
  const inventory = readInventory()
  try {
    // Cópia real (nunca junção): apagar a pasta temporária não alcança o node_modules do repositório.
    cpSync(
      join(dirname(Bun.resolveSync('zod/package.json', import.meta.dir))),
      join(root, 'node_modules/zod'),
      {
        recursive: true,
        dereference: true,
      },
    )
    const ordered = [...states.values()].sort((a, b) => a.date.localeCompare(b.date))
    for (const [index, state] of ordered.entries()) {
      rmSync(join(root, 'packages'), { recursive: true, force: true })
      rmSync(join(root, 'node_modules/@sistemazero'), { recursive: true, force: true })
      for (const [path, id] of state.files) {
        const target = path.startsWith('packages/core/')
          ? join(root, 'node_modules/@sistemazero/core', path.slice('packages/core/'.length))
          : join(root, path)
        mkdirSync(dirname(target), { recursive: true })
        writeFileSync(target, blob(id))
      }
      const run = Bun.spawnSync(
        [
          'bun',
          fileURLToPath(import.meta.url),
          '--eval-state',
          root,
          state.eras.g2d,
          state.eras.gk,
        ],
        { stdout: 'pipe', stderr: 'pipe' },
      )
      if (run.exitCode !== 0)
        throw new Error(`Estado de ${state.date}: ${run.stderr.toString().slice(-600)}`)
      const hashes: Record<string, string> = JSON.parse(run.stdout.toString())
      for (const [key, hash] of Object.entries(hashes)) {
        const [name, group] = key.split('|')
        const id = EXTENSIONS.find((extension) => extension === name)
        const variant = VARIANTS.find((item) => item === group)
        if (!id || !variant) throw new Error(`Chave inesperada: ${key}`)
        add(inventory, id, variant, hash)
      }
      console.error(`${index + 1}/${ordered.length} ${state.date}`)
    }
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
  writeInventory(inventory)
}

const [mode, ...rest] = process.argv.slice(2)
if (mode === '--eval-state') {
  const [root, g2d, gk] = rest
  if (!root || !g2d || !gk) throw new Error('uso: --eval-state <pasta> <era g2d> <era gk>')
  await evaluateState(root, { g2d, gk })
} else if (mode === '--history') {
  const [since, ...refs] = rest
  if (!since || !refs.length) throw new Error('uso: --history <desde> <ref...>')
  await history(since, refs)
} else {
  const inventory = readInventory()
  const missing = (await currentHashes()).filter(
    ([id, variant, hash]) => !inventory[id][variant].includes(hash),
  )
  if (mode === '--check') {
    if (missing.length) {
      console.error(
        `O motor 2D mudou e a cópia nova não está no inventário do Pro (${missing.map(([id, variant]) => `${id}/${variant}`).join(', ')}). Rode: bun scripts/gen-pro-engine-copies.ts`,
      )
      process.exit(1)
    }
  } else {
    for (const [id, variant, hash] of missing) add(inventory, id, variant, hash)
    writeInventory(inventory)
    console.log(
      missing.length ? `${missing.length} cópia(s) acrescentada(s).` : 'Inventário em dia.',
    )
  }
}
