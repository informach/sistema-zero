/**
 * Confere a saída de `measure-preview-isolation.mjs` rodada no Firefox com o isolamento por site do
 * navegador de mesa (`SZ_MEASURE_FIREFOX_SITE_ISOLATION=1`, perfis do host separados): a casca em
 * outro site precisa isolar o jogo com QUALQUER combinação de cabeçalhos do host, porque a página
 * da aula fica sem COEP (vídeos). Medição de referência: docs/qa/2026-11-20-studio-firefox-site-isolation.md.
 *
 *   node scripts/check-shell-isolation.mjs .cache/mission/isolation-firefox-site.json
 */
import { readFileSync } from 'node:fs'

const file = process.argv[2]
if (!file) throw new Error('Informe o JSON da medição')
const rows = JSON.parse(readFileSync(file, 'utf8'))
const shell = rows.filter((row) => row.arranjo === 'outro-site')
const failures = []
if (shell.length < 4) failures.push(`esperava os 4 perfis do host, vieram ${shell.length}`)
for (const row of rows) {
  if (row.erro) failures.push(`${row.perfilDoHost ?? '?'} ${row.arranjo}: ${row.erro}`)
  if (
    row.navegador?.startsWith('firefox') &&
    !String(row.isolamentoDoFirefox).startsWith('por site')
  )
    failures.push(`${row.perfilDoHost} ${row.arranjo}: medido sem o isolamento por site`)
}
for (const row of shell) {
  if (!row.isolado)
    failures.push(
      `${row.perfilDoHost}: a casca não isolou (relógio ${row.maiorAtrasoDoRelogioMs} ms, clique ${row.cliqueAtendidoEmMs} ms)`,
    )
}
for (const row of rows.filter((r) => r.arranjo === 'srcdoc'))
  console.log(
    `srcdoc ${row.perfilDoHost}: ${row.maiorAtrasoDoRelogioMs} ms (isolado: ${row.isolado})`,
  )
for (const row of shell)
  console.log(
    `casca ${row.perfilDoHost}: ${row.maiorAtrasoDoRelogioMs} ms (isolado: ${row.isolado})`,
  )
if (failures.length) {
  console.error(failures.join('\n'))
  process.exit(1)
}
