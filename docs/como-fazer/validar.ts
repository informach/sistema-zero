/**
 * Valida `docs/como-fazer/como-fazer.json` com o MESMO validador que o members roda ao publicar
 * (`@sistemazero/core/help`), mais o que só um lote inteiro pode conferir: coleção de cada
 * tutorial existe, slugs únicos, `related` e os links `[..](/como-fazer/<slug>)` do corpo apontam
 * para tutoriais do lote. Sai com código 1 se algo reprovar.
 *
 *   bun docs/como-fazer/validar.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  type HelpCollectionDocument,
  type HelpTutorialDocument,
  helpEditorialWarnings,
  isHelpSlug,
  validateHelpCollection,
  validateHelpTutorial,
} from '../../packages/core/src/help'

interface Lote {
  collections?: Array<HelpCollectionDocument & { position?: number }>
  tutorials: Array<{
    slug: string
    collection: string
    position?: number
    draft: HelpTutorialDocument
  }>
}

const caminho = resolve(import.meta.dir, 'como-fazer.json')
const lote = JSON.parse(readFileSync(caminho, 'utf8')) as Lote

const erros: string[] = []
const avisos: string[] = []

const colecoes = new Set<string>()
for (const c of lote.collections ?? []) {
  for (const issue of validateHelpCollection(c)) erros.push(`coleção ${c.slug}: ${issue.message}`)
  if (colecoes.has(c.slug)) erros.push(`coleção repetida: ${c.slug}`)
  colecoes.add(c.slug)
}

const slugs = new Set(lote.tutorials.map((t) => t.slug))
if (slugs.size !== lote.tutorials.length) erros.push('há slug de tutorial repetido')

const LINK = /\]\(\/como-fazer\/([a-z0-9-]+)\)/g
for (const t of lote.tutorials) {
  if (!isHelpSlug(t.collection) || !colecoes.has(t.collection)) {
    erros.push(`${t.slug}: coleção "${t.collection}" não está no lote`)
  }
  for (const issue of validateHelpTutorial(t.draft, { slug: t.slug })) {
    erros.push(
      `${t.slug}: ${issue.field}${issue.stepId ? ` (${issue.stepId})` : ''}: ${issue.message}`,
    )
  }
  for (const w of helpEditorialWarnings(t.draft)) avisos.push(`${t.slug}: ${w}`)
  for (const r of t.draft.related ?? []) {
    if (!slugs.has(r)) erros.push(`${t.slug}: related "${r}" não existe no lote`)
  }
  for (const step of t.draft.steps) {
    for (const m of step.body.matchAll(LINK)) {
      if (!slugs.has(m[1] as string))
        erros.push(`${t.slug}/${step.id}: link para "${m[1]}" não existe`)
    }
  }
}

const porColecao = new Map<string, number>()
for (const t of lote.tutorials)
  porColecao.set(t.collection, (porColecao.get(t.collection) ?? 0) + 1)

console.log(`${lote.collections?.length ?? 0} coleções, ${lote.tutorials.length} tutoriais`)
for (const [c, n] of porColecao) console.log(`  ${c}: ${n}`)
if (avisos.length) {
  console.log(`\nSugestões (não bloqueiam):`)
  for (const a of avisos) console.log(`  - ${a}`)
}
if (erros.length) {
  console.error(`\n${erros.length} erro(s):`)
  for (const e of erros) console.error(`  - ${e}`)
  process.exit(1)
}
console.log('\nOK: o lote passa no validador do members.')
