/**
 * Regera os campos `ir.behavior` dos exemplos do Mundo 3D a partir dos fontes
 * `world-3d/__gen_*.ts` (chamadas `SZWorld3D.*`), os mesmos que o drift test
 * `world-3d/__tests__/examples.test.ts` confere. Molde: `gen-game-3d-examples.ts`.
 *
 * Uso:
 *   bun scripts/gen-world-3d-examples.ts
 *   bun scripts/gen-world-3d-examples.ts --check
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parse } from '@babel/parser'
import * as t from '@babel/types'
import { normalizeSZIR } from '../src/ir'
import { BOLICHE_SOURCE } from '../src/official-extensions/world-3d/__gen_boliche'
import { CACA_ESTRELAS_SOURCE } from '../src/official-extensions/world-3d/__gen_cacaEstrelas'
import { COASTAL_PROCEDURAL_SOURCE } from '../src/official-extensions/world-3d/__gen_coastal_procedural'
import { CORRIDA_SOURCE } from '../src/official-extensions/world-3d/__gen_corrida'
import { FAZENDINHA_SOURCE } from '../src/official-extensions/world-3d/__gen_fazendinha'
import { FOLIO_PROCEDURAL_SOURCE } from '../src/official-extensions/world-3d/__gen_folio_procedural'
import { ILHA_SOURCE } from '../src/official-extensions/world-3d/__gen_ilha'
import { INVERNO_SOURCE } from '../src/official-extensions/world-3d/__gen_inverno'
import { LUA_SOURCE } from '../src/official-extensions/world-3d/__gen_lua'
import { MEU_MUNDO_SOURCE } from '../src/official-extensions/world-3d/__gen_meumundo'
import { PARQUE_SOURCE } from '../src/official-extensions/world-3d/__gen_parque'
import { PISTA_MALUCA_SOURCE } from '../src/official-extensions/world-3d/__gen_pistaMaluca'
import { VILA_SOURCE } from '../src/official-extensions/world-3d/__gen_vila'
import { VOCATION_PROCEDURAL_SOURCE } from '../src/official-extensions/world-3d/__gen_vocation_procedural'
import { parseJS } from '../src/parsers/js'

const worldRoot = join(import.meta.dir, '..', 'src', 'official-extensions', 'world-3d')

const exampleSources: Record<string, string> = {
  meuMundoExample: MEU_MUNDO_SOURCE,
  corridaExample: CORRIDA_SOURCE,
  pistaMalucaExample: PISTA_MALUCA_SOURCE,
  bolicheExample: BOLICHE_SOURCE,
  invernoExample: INVERNO_SOURCE,
  ilhaExample: ILHA_SOURCE,
  parqueExample: PARQUE_SOURCE,
  cacaEstrelasExample: CACA_ESTRELAS_SOURCE,
  vilaExample: VILA_SOURCE,
  luaExample: LUA_SOURCE,
  fazendinhaExample: FAZENDINHA_SOURCE,
}

const referenceSources: Record<string, string> = {
  folioProceduralExample: FOLIO_PROCEDURAL_SOURCE,
  coastalProceduralExample: COASTAL_PROCEDURAL_SOURCE,
  vocationProceduralExample: VOCATION_PROCEDURAL_SOURCE,
}

function generatedBehavior(source: string, extensionId: string): object {
  const ir = JSON.parse(
    JSON.stringify(
      normalizeSZIR({
        html: [],
        css: [],
        js: parseJS(source),
        extensions: [{ extensionId }],
      }),
    ),
  ) as { behavior?: object }
  if (!ir.behavior) throw new Error(`Fonte de ${extensionId} não gerou IR v2`)
  return ir.behavior
}

function regenerate(content: string, sources: Record<string, string>, extensionId: string): string {
  const ast = parse(content, { sourceType: 'module', plugins: ['typescript'] })
  const newline = content.includes('\r\n') ? '\r\n' : '\n'
  const replacements: Array<{ start: number; end: number; value: string }> = []

  for (const statement of ast.program.body) {
    if (!t.isExportNamedDeclaration(statement) || !t.isVariableDeclaration(statement.declaration)) {
      continue
    }
    for (const declaration of statement.declaration.declarations) {
      if (!t.isIdentifier(declaration.id) || !t.isObjectExpression(declaration.init)) continue
      const source = sources[declaration.id.name]
      if (!source) continue
      const irProperty = declaration.init.properties.find(
        (property): property is t.ObjectProperty =>
          t.isObjectProperty(property) &&
          ((t.isIdentifier(property.key) && property.key.name === 'ir') ||
            (t.isStringLiteral(property.key) && property.key.value === 'ir')),
      )
      if (!irProperty || !t.isObjectExpression(irProperty.value)) {
        throw new Error(`Campo ir não encontrado em ${declaration.id.name}`)
      }
      const behaviorProperty = irProperty.value.properties.find(
        (property): property is t.ObjectProperty =>
          t.isObjectProperty(property) &&
          ((t.isIdentifier(property.key) && property.key.name === 'behavior') ||
            (t.isStringLiteral(property.key) && property.key.value === 'behavior')),
      )
      if (
        !behaviorProperty ||
        behaviorProperty.value.start == null ||
        behaviorProperty.value.end == null
      ) {
        throw new Error(`Campo ir.behavior não encontrado em ${declaration.id.name}`)
      }
      const value = JSON.stringify(generatedBehavior(source, extensionId), null, 2).replaceAll(
        '\n',
        `${newline}  `,
      )
      replacements.push({
        start: behaviorProperty.value.start,
        end: behaviorProperty.value.end,
        value,
      })
    }
  }

  if (replacements.length !== Object.keys(sources).length) {
    throw new Error(
      `Esperava ${Object.keys(sources).length} exemplos; encontrei ${replacements.length}`,
    )
  }

  let output = content
  for (const replacement of replacements.sort((a, b) => b.start - a.start)) {
    output = `${output.slice(0, replacement.start)}${replacement.value}${output.slice(replacement.end)}`
  }
  return output
}

function formatTypeScript(content: string, examplesPath: string): string {
  const result = Bun.spawnSync({
    cmd: ['bunx', 'biome', 'format', '--stdin-file-path', examplesPath],
    stdin: Buffer.from(content),
    stdout: 'pipe',
    stderr: 'pipe',
  })
  if (result.exitCode !== 0) {
    throw new Error(`Biome não formatou examples.ts:\n${result.stderr.toString()}`)
  }
  return result.stdout.toString()
}

const catalogs = [
  { path: join(worldRoot, 'examples.ts'), extensionId: 'world-3d', sources: exampleSources },
  {
    path: join(worldRoot, 'referenceExamples.ts'),
    extensionId: 'world-3d',
    sources: referenceSources,
  },
]
const checkOnly = process.argv.includes('--check')
const stale: string[] = []
let total = 0

for (const catalog of catalogs) {
  const current = readFileSync(catalog.path, 'utf8')
  const generated = formatTypeScript(
    regenerate(current, catalog.sources, catalog.extensionId),
    catalog.path,
  )
  total += Object.keys(catalog.sources).length
  if (checkOnly) {
    if (generated !== current) stale.push(catalog.path)
  } else {
    writeFileSync(catalog.path, generated)
  }
}

if (stale.length > 0) {
  console.error(
    `Exemplos desatualizados em ${stale.join(', ')}. Rode bun run gen:world-3d-examples.`,
  )
  process.exit(1)
}

console.log(`IR de ${total} exemplos do Mundo 3D ${checkOnly ? 'está atualizada' : 'regenerada'}.`)
