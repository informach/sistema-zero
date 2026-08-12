/**
 * Regera os campos `ir` dos exemplos do Jogo 3D Avançado a partir dos fontes
 * JavaScript que também alimentam os testes de drift.
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
const examplesPath = join(
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

const sources: Record<string, string> = {
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

function generatedIR(source: string): object {
  return JSON.parse(
    JSON.stringify(
      normalizeSZIR({
        html: [],
        css: [],
        js: parseJS(source),
        extensions: [{ extensionId: 'game-3d-advanced' }],
      }),
    ),
  ) as object
}

function regenerate(content: string): string {
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
      if (!irProperty || irProperty.value.start == null || irProperty.value.end == null) {
        throw new Error(`Campo ir não encontrado em ${declaration.id.name}`)
      }
      const value = JSON.stringify(generatedIR(source), null, 2).replaceAll('\n', `${newline}  `)
      replacements.push({ start: irProperty.value.start, end: irProperty.value.end, value })
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

function formatTypeScript(content: string): string {
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

const current = readFileSync(examplesPath, 'utf8')
const generated = formatTypeScript(regenerate(current))
if (process.argv.includes('--check')) {
  if (generated !== current) {
    console.error('examples.ts está desatualizado. Rode bun run gen:game-3d-examples.')
    process.exit(1)
  }
  console.log(`IR de ${Object.keys(sources).length} exemplos 3D está atualizada.`)
} else {
  writeFileSync(examplesPath, generated)
  console.log(`IR de ${Object.keys(sources).length} exemplos 3D regenerada.`)
}
