/**
 * Regera os campos `ir.behavior` dos exemplos do Jogo 3D e do Jogo 3D Avançado a partir
 * dos fontes JavaScript que também alimentam os testes de drift.
 *
 * Uso:
 *   bun scripts/gen-game-3d-examples.ts
 *   bun scripts/gen-game-3d-examples.ts --check
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parse } from '@babel/parser'
import * as t from '@babel/types'
import { normalizeSZIR } from '../src/ir'
import { A_LENDA_DO_HEROI_SOURCE } from '../src/official-extensions/game-3d/__gen_aLendaDoHeroi'
import { CACA_ESTELAR_SOURCE } from '../src/official-extensions/game-3d/__gen_cacaEstelar'
import { CERCO_NA_BASE_SOURCE } from '../src/official-extensions/game-3d/__gen_cercoNaBase'
import { CORRIDA_INFINITA_SOURCE } from '../src/official-extensions/game-3d/__gen_corridaInfinita'
import { LABIRINTO_ROBOS_SOURCE } from '../src/official-extensions/game-3d/__gen_labirintoRobos'
import { MINA_DE_CRISTAIS_SOURCE } from '../src/official-extensions/game-3d/__gen_minaDeCristais'
import { MUNDO_BLOCOS_SOURCE } from '../src/official-extensions/game-3d/__gen_mundoBlocos'
import { PATRULHA_ESPACIAL_SOURCE } from '../src/official-extensions/game-3d/__gen_patrulhaEspacial'
import { REINO_COGUMELO_SOURCE } from '../src/official-extensions/game-3d/__gen_reinoCogumelo'
import { REUNIR_REBANHO_SOURCE } from '../src/official-extensions/game-3d/__gen_reunirRebanho'
import { TORRES_DEFENSORAS_SOURCE } from '../src/official-extensions/game-3d/__gen_torresDefensoras'
import { A_LENDA_DO_HEROI_PROFISSIONAL_SOURCE } from '../src/official-extensions/game-3d-advanced/__gen_aLendaDoHeroiProfissional'
import { ATRAVESSE_PROFISSIONAL_SOURCE } from '../src/official-extensions/game-3d-advanced/__gen_atravesseProfissional'
import { CACA_ESTELAR_PROFISSIONAL_SOURCE } from '../src/official-extensions/game-3d-advanced/__gen_cacaEstelarProfissional'
import { CERCO_NA_BASE_PROFISSIONAL_SOURCE } from '../src/official-extensions/game-3d-advanced/__gen_cercoNaBaseProfissional'
import { CHEFAO_SOURCE } from '../src/official-extensions/game-3d-advanced/__gen_chefao'
import { CORRIDA_PROFISSIONAL_SOURCE } from '../src/official-extensions/game-3d-advanced/__gen_corridaProfissional'
import { GUARDIAO_SOURCE } from '../src/official-extensions/game-3d-advanced/__gen_guardiao'
import { LABIRINTO_PROFISSIONAL_SOURCE } from '../src/official-extensions/game-3d-advanced/__gen_labirintoProfissional'
import { MINA_DE_CRISTAIS_PROFISSIONAL_SOURCE } from '../src/official-extensions/game-3d-advanced/__gen_minaDeCristaisProfissional'
import { MUNDO_PROFISSIONAL_SOURCE } from '../src/official-extensions/game-3d-advanced/__gen_mundoProfissional'
import { PATRULHA_PROFISSIONAL_SOURCE } from '../src/official-extensions/game-3d-advanced/__gen_patrulhaProfissional'
import { QUICARAM_SOURCE } from '../src/official-extensions/game-3d-advanced/__gen_quicaram'
import { REUNIR_REBANHO_PROFISSIONAL_SOURCE } from '../src/official-extensions/game-3d-advanced/__gen_reunirRebanhoProfissional'
import { TIRO_SOURCE } from '../src/official-extensions/game-3d-advanced/__gen_tiro'
import { parseJS } from '../src/parsers/js'

const studioRoot = join(import.meta.dir, '..')
const baseExamplesPath = join(studioRoot, 'src', 'official-extensions', 'game-3d', 'examples.ts')
const advancedExamplesPath = join(
  studioRoot,
  'src',
  'official-extensions',
  'game-3d-advanced',
  'examples.ts',
)

function sourceFromLegacyTest(filename: string): string {
  const path = join(
    studioRoot,
    'src',
    'official-extensions',
    'game-3d-advanced',
    '__tests__',
    filename,
  )
  const testSource = readFileSync(path, 'utf8')
  const match = /const SOURCE = `([\s\S]*?)`\.trim\(\)/.exec(testSource)
  if (!match?.[1]) throw new Error(`SOURCE não encontrado em ${filename}`)
  return match[1].trim()
}

const baseSources: Record<string, string> = {
  corridaInfinitaExample: CORRIDA_INFINITA_SOURCE,
  labirintoRobosExample: LABIRINTO_ROBOS_SOURCE,
  mundoBlocosExample: MUNDO_BLOCOS_SOURCE,
  patrulhaEspacialExample: PATRULHA_ESPACIAL_SOURCE,
  defesaDaTorreBasicoExample: TORRES_DEFENSORAS_SOURCE,
  reunirRebanhoBasicoExample: REUNIR_REBANHO_SOURCE,
  aLendaDoHeroiBasicoExample: A_LENDA_DO_HEROI_SOURCE,
  cacaEstelarBasicoExample: CACA_ESTELAR_SOURCE,
  cercoNaBaseBasicoExample: CERCO_NA_BASE_SOURCE,
  minaDeCristaisBasicoExample: MINA_DE_CRISTAIS_SOURCE,
  reinoCogumeloExample: REINO_COGUMELO_SOURCE,
}

const advancedSources: Record<string, string> = {
  defesaDaTorreExample: sourceFromLegacyTest('examples.test.ts'),
  saltoNasNuvensExample: sourceFromLegacyTest('platformerExample.test.ts'),
  parkourDoVulcaoExample: sourceFromLegacyTest('parkourExample.test.ts'),
  quadraMalucaExample: QUICARAM_SOURCE,
  guardiaoDoPortalExample: GUARDIAO_SOURCE,
  tiroAoAlvoExample: TIRO_SOURCE,
  chefaoDasSombrasExample: CHEFAO_SOURCE,
  corridaInfinitaProfissionalExample: CORRIDA_PROFISSIONAL_SOURCE,
  labirintoDosRobosProfissionalExample: LABIRINTO_PROFISSIONAL_SOURCE,
  mundoDeBlocosProfissionalExample: MUNDO_PROFISSIONAL_SOURCE,
  patrulhaEspacialProfissionalExample: PATRULHA_PROFISSIONAL_SOURCE,
  atravesseProfissionalExample: ATRAVESSE_PROFISSIONAL_SOURCE,
  reunirRebanhoProfissionalExample: REUNIR_REBANHO_PROFISSIONAL_SOURCE,
  aLendaDoHeroiProfissionalExample: A_LENDA_DO_HEROI_PROFISSIONAL_SOURCE,
  cacaEstelarProfissionalExample: CACA_ESTELAR_PROFISSIONAL_SOURCE,
  cercoNaBaseProfissionalExample: CERCO_NA_BASE_PROFISSIONAL_SOURCE,
  minaDeCristaisProfissionalExample: MINA_DE_CRISTAIS_PROFISSIONAL_SOURCE,
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
  { path: baseExamplesPath, extensionId: 'game-3d', sources: baseSources },
  { path: advancedExamplesPath, extensionId: 'game-3d-advanced', sources: advancedSources },
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
    if (generated !== current) stale.push(catalog.extensionId)
  } else {
    writeFileSync(catalog.path, generated)
  }
}

if (stale.length > 0) {
  console.error(
    `Exemplos desatualizados em ${stale.join(', ')}. Rode bun run gen:game-3d-examples.`,
  )
  process.exit(1)
}

console.log(`IR de ${total} exemplos 3D ${checkOnly ? 'está atualizada' : 'regenerada'}.`)
