/**
 * Valida `docs/como-fazer/como-fazer.json` com o MESMO validador que o members roda ao publicar
 * (`@sistemazero/core/help`), mais o que só um lote inteiro pode conferir: coleção de cada
 * tutorial existe, slugs únicos, `related` e os links `[..](/como-fazer/<slug>)` do corpo apontam
 * para tutoriais do lote. Sai com código 1 se algo reprovar.
 *
 * Também confere o vocabulário da aventura (Diretrizes Pedagógicas, seção 6), que é regra da
 * criança e não do core: o core é dividido com o Admin e com a comunidade adulta, que falam de
 * curso e aula. Ver `vocabularioDaAventura` abaixo.
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
import {
  concordanciasErradas,
  guiasPessoa,
  palavrasDaEscola,
} from '../aulas-interativas/qa/palavras-da-escola'

/**
 * O vocabulário da aventura nos textos que a criança lê: título, resumo, título e corpo de cada
 * passo e o texto alternativo da imagem (que o leitor de tela lê em voz alta). Ficam de fora:
 * - as `keywords`, porque a busca precisa achar o tutorial quando a criança digita "aula",
 *   "curso" ou "professor" por costume;
 * - o endereço dos links (`](/como-fazer/plataforma-enviar-atividade)`), que é slug e não muda.
 *   O texto do link continua conferido.
 *
 * A régua é a mesma dos manifestos e dos roteiros (`palavras-da-escola.ts`), com três regras
 * só desta biblioteca:
 * - "tarefa" no sentido de lição de casa também sai. No Pensa ela fica: é o nome do cartão do
 *   plano e do botão **Concluir tarefa**.
 * - "etapa" passa só no Pensa. Lá ela nomeia os passos do método ZERO ("Etapa Z", "Voltar para a
 *   etapa atual"), e trocar o nome no Pensa é decisão em aberto da dona (pendências de
 *   06/10/2026). Fora do Pensa, "etapa" é a seção da escola e reprova.
 * - Botão é "clique em", como nas falas das fases (decisão de 06/10/2026): "toque em **Botão**"
 *   reprova. O toque fica para os objetos DENTRO do jogo ("toque nos esconderijos"), que não
 *   aparecem em negrito, porque o negrito desta biblioteca é o nome de um botão ou controle.
 *
 * E "guia" como pessoa reprova (`GUIA_PESSOA`, decisão de 06/10/2026, à noite): quem recebe o
 * projeto e responde os recados é a equipe, e o botão diz o que a criança envia ("Enviar meu
 * projeto", "Enviar (1)"). O **Guia do Pensa** passa: é o painel da tarefa.
 */
const SO_NO_PENSA = /^(?:etapas?|tarefas?)$/i
const TAREFA = /\btarefas?\b/gi
const TOQUE_EM_BOTAO =
  /\b(?:toque|tocar|toca|aperte|apertar|aperta)\s+(?:em|no|na|nos|nas)\s+\*\*/gi
const ENDERECO_DO_LINK = /\]\([^)]*\)/g

function vocabularioDaAventura(texto: string, noPensa: boolean): string[] {
  const visivel = texto.replace(ENDERECO_DO_LINK, ']')
  const escola = [...palavrasDaEscola(visivel), ...[...visivel.matchAll(TAREFA)].map((m) => m[0])]
    .filter((palavra) => !(noPensa && SO_NO_PENSA.test(palavra)))
    .map((palavra) => `palavra da escola "${palavra}"`)
  const concordancia = concordanciasErradas(visivel).map((trecho) => `concordância "${trecho}"`)
  const toque = [...visivel.matchAll(TOQUE_EM_BOTAO)].map(
    (m) => `"${m[0].replace(/\s*\*\*$/, '')}" num botão: use "clique em"`,
  )
  const guia = guiasPessoa(visivel).map(
    (trecho) => `"${trecho}": quem recebe o projeto e responde os recados é a equipe`,
  )
  return [...escola, ...concordancia, ...toque, ...guia]
}

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
  for (const [campo, texto] of [
    ['title', c.title],
    ['description', c.description],
  ] as const)
    for (const problema of vocabularioDaAventura(texto ?? '', c.slug === 'pensa'))
      erros.push(`coleção ${c.slug}: ${campo}: ${problema}`)
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
  const noPensa = t.collection === 'pensa'
  const textos: Array<[string, string | undefined]> = [
    ['title', t.draft.title],
    ['summary', t.draft.summary],
    ...t.draft.steps.flatMap(
      (step): Array<[string, string | undefined]> => [
        [`${step.id}.title`, step.title],
        [`${step.id}.body`, step.body],
        [`${step.id}.imageAlt`, step.imageAlt],
      ],
    ),
  ]
  for (const [campo, texto] of textos)
    for (const problema of vocabularioDaAventura(texto ?? '', noPensa))
      erros.push(`${t.slug}: ${campo}: ${problema}`)
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
