/** Prova editorial: nenhuma fala, critério ou projeto pode mudar além dos dois rótulos. */
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { relative } from 'node:path'
import { caminhoAula, listarArquivosAulas } from './caminhos'
import { extrairPartesElevenLabs } from './roteiro-elevenlabs'

const base = process.argv[2]
const output = process.argv[3]
if (!base || !output)
  throw new Error('Uso: bun auditar-rotulos-projeto.ts <commit-base> <relatório.md>')
const normalizar = (text: string) =>
  text
    .replace(/Verificar esta parte|Objetivos desta parte/gi, (label) => {
      const next = label.toLowerCase().startsWith('verificar')
        ? 'verificar projeto'
        : 'objetivos do projeto'
      return label[0] === label[0]?.toUpperCase() ? next[0]?.toUpperCase() + next.slice(1) : next
    })
    .replaceAll('\r\n', '\n')
const original = (path: string) =>
  execFileSync('git', ['show', `${base}:${path}`], {
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  })
const rows: string[] = []
// Âncoras são janelas derivadas de 120 caracteres: a troca do rótulo pode deslocar sua borda.
// O parser valida sua ligação exata à fala; compare os demais campos integralmente.
const spoken = (value: unknown) =>
  JSON.stringify(value, (key, entry) =>
    key === 'ancoraAntes' || key === 'ancoraDepois' ? undefined : entry,
  )
// plannedVideo contém as mesmas âncoras derivadas; não contém a configuração da atividade.
const learning = (value: unknown) =>
  JSON.stringify(value, (key, entry) =>
    key === 'plannedVideo' && typeof entry === 'string' ? '<nota de produção derivada>' : entry,
  )
let lessons = 0
let clips = 0
let affected = 0
for (const name of listarArquivosAulas().filter((name) => name.endsWith('.roteiro.md'))) {
  const path = relative(process.cwd(), caminhoAula(name.replace(/\.roteiro\.md$/, ''))).replaceAll(
    '\\',
    '/',
  )
  const before = extrairPartesElevenLabs(original(`${path}.roteiro.md`))
  const after = extrairPartesElevenLabs(readFileSync(`${path}.roteiro.md`, 'utf8'))
  if (spoken(after) !== normalizar(spoken(before)))
    throw new Error(`Fala/ordem/intervenção alterada: ${path}`)
  const oldManifest = JSON.parse(original(`${path}.manifesto.json`))
  const nextManifest = JSON.parse(readFileSync(`${path}.manifesto.json`, 'utf8'))
  if (learning(nextManifest) !== normalizar(learning(oldManifest)))
    throw new Error(`Manifesto alterado além dos rótulos: ${path}`)
  lessons++
  clips += after.length
  for (let index = 0; index < after.length; index++) {
    const previous = before[index]
    const current = after[index]
    if (!previous || !current) throw new Error('Clipe ausente')
    if (spoken(previous) === spoken(current)) continue
    affected++
    rows.push(`| ${path.split('/').at(-1)} | ${current.clipe} |`)
  }
}
writeFileSync(
  output,
  `# Troca dos rótulos do projeto — impacto na gravação\n\nBase: \`${base}\`.\n\nAuditoria automática: ${lessons} aulas, ${clips} clipes. Somente os dois rótulos aprovados mudaram nas falas, intervenções e manifestos; projetos, critérios, IDs e sequência foram preservados.\n\n${affected} clipes têm texto afetado. A lista identifica os trechos a substituir se já gravados. As fontes ElevenLabs foram regeneradas; áudio e vídeo publicados não foram recriados por esta auditoria.\n\n| Aula | Clipe afetado |\n| --- | --- |\n${rows.join('\n')}\n`,
)
console.log(JSON.stringify({ lessons, clips, affected, output }))
