/**
 * Valida `docs/como-fazer-adulto/como-fazer.json` (a biblioteca "Como fazer" da comunidade adulta)
 * com o MESMO validador que o members roda ao publicar (`@sistemazero/core/help`), mais o que só um
 * lote inteiro pode conferir:
 * - o formato que o Importar do admin aceita (`HelpImportBody`, sem campo a mais);
 * - a coleção de cada tutorial existe, as posições não se repetem;
 * - slugs únicos, `related` e links `[..](/como-fazer/<slug>)` do corpo apontam para tutoriais do lote;
 * - exatamente 64 tutoriais em 8 coleções, cada coleção com pelo menos 3 tutoriais;
 * - de 3 a 6 passos por tutorial (régua editorial deste lote);
 * - a linguagem comum (ver `vocabularioAdulto` abaixo).
 *
 * Sai com código 1 se algo reprovar. As sugestões do `helpEditorialWarnings` não bloqueiam.
 *
 *   bun docs/como-fazer-adulto/validar.ts
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
  CONCORDANCIA_ERRADA,
  PALAVRAS_DA_ESCOLA,
} from '../aulas-interativas-tecnico/qa/palavras-da-escola'

/** Tamanho do lote combinado no plano da biblioteca adulta (mude aqui se o lote crescer). */
const TOTAL_DE_TUTORIAIS = 64
const TOTAL_DE_COLECOES = 8
const MINIMO_POR_COLECAO = 3
const PASSOS_MIN = 3
const PASSOS_MAX = 6

/**
 * As chaves que o `HelpImportBody` do members aceita (`additionalProperties: false`): um campo a
 * mais derruba o lote INTEIRO no import. Espelho do `parseImport` do admin
 * (`packages/admin/src/app/admin/como-fazer/como-fazer-client.tsx`).
 */
const CHAVES_COLECAO = new Set(['slug', 'title', 'description', 'icon', 'tone', 'position'])
const CHAVES_TUTORIAL = new Set(['slug', 'collection', 'position', 'draft'])
const CHAVES_DRAFT = new Set([
  'title',
  'summary',
  'keywords',
  'toolRef',
  'video',
  'steps',
  'related',
])
const CHAVES_PASSO = new Set(['id', 'title', 'body', 'imageUrl', 'imageAlt'])

/**
 * O vocabulário da comunidade adulta nos textos que a pessoa LÊ: título e descrição da coleção;
 * título, resumo, título e corpo de cada passo e texto alternativo da imagem. O público é de
 * adultos iniciantes (a régua de leitura é de 50 a 70 anos, sem nunca tratar a pessoa como idosa):
 * - os MESMOS nomes das duas comunidades desde 21/10/2026 (Diretrizes Pedagógicas, seção 6):
 *   curso → módulo → aula → parte, Próxima parte, Concluir aula, Enviar meu projeto. Reprovam os
 *   rótulos antigos de navegação (`PALAVRAS_DA_ESCOLA`) e a concordância que a troca palavra por
 *   palavra deixa ("o parte", "próximo parte", "uma curso": `CONCORDANCIA_ERRADA`);
 * - quem recebe e responde é **a equipe**: "professor(a)" reprova. Quem conduz uma oficina ao vivo
 *   também não tem gênero fixo na tela ("quem conduz", ou o nome);
 * - o recurso tem nome, sem "IA" solta: o Zappy, o Pensa, créditos, assistente virtual;
 * - botão é "clique em": "toque/aperte em **Botão**" reprova;
 * - "Mostra" com maiúscula é o nome antigo do Mural dos Criadores (o verbo "mostra" passa);
 * - nada de tratamento que infantiliza ou envelhece (senhor, senhora, vovó, vovô, idoso);
 * - "criança": a ajuda adulta fala com o dono da conta.
 * Ficam de fora as `keywords` (a busca precisa achar "mostra", "professor", "seção" e "IA", que a
 * pessoa digita por costume ou porque leu numa tela compartilhada) e o endereço dos links (é slug).
 * "Seção" e "missão" não reprovam: o contador da aula ainda diz "Seção 2 de 5" e "Missões" é o
 * nome de uma parte de Seu progresso e das tarefas do Pensa. Cite-as só como a tela as escreve.
 */
/**
 * Palavra inteira com fronteira UNICODE: o `\b` do JavaScript só conhece letras ASCII, e "vovó"
 * (terminada em letra acentuada) passaria sem ser vista.
 */
function palavra(fonte: string, flags = 'giu'): RegExp {
  return new RegExp(`(?<![\\p{L}\\p{N}_])(?:${fonte})(?![\\p{L}\\p{N}_])`, flags)
}

const PALAVRAS_PROIBIDAS: ReadonlyArray<{ padrao: RegExp; motivo: string }> = [
  {
    padrao: new RegExp(PALAVRAS_DA_ESCOLA.source, 'giu'),
    motivo: 'rótulo anterior à linguagem comum',
  },
  // Só com maiúscula: o verbo "mostra" ("a tela mostra") continua valendo.
  {
    padrao: new RegExp(CONCORDANCIA_ERRADA.source, 'giu'),
    motivo: 'concordância errada depois da troca de nomes',
  },
  {
    padrao: palavra('professor(?:a|es|as)?'),
    motivo: 'quem recebe e responde é "a equipe"; na oficina, "quem conduz"',
  },
  {
    padrao: palavra('IA|intelig[êe]ncia artificial', 'gu'),
    motivo: 'o recurso tem nome: o Zappy, o Pensa, créditos ou assistente virtual',
  },
  {
    padrao:
      /(?<![\p{L}\p{N}_])(?:toque|tocar|toca|aperte|apertar|aperta)\s+(?:em|no|na|nos|nas)\s+\*\*/giu,
    motivo: 'botão e controle é "clique em"',
  },
  { padrao: palavra('Mostra', 'gu'), motivo: 'nome antigo: no adulto é "Mural"' },
  { padrao: palavra('senhor(?:a|es|as)?'), motivo: 'tratamento que envelhece: use "você"' },
  { padrao: palavra('vov[óô]s?'), motivo: 'tratamento que infantiliza ou envelhece' },
  { padrao: palavra('idos[oa]s?'), motivo: 'a régua de leitura não é um rótulo para o leitor' },
  { padrao: palavra('crianças?'), motivo: 'a ajuda adulta fala com o dono da conta' },
]
const ENDERECO_DO_LINK = /\]\([^)]*\)/g

function vocabularioAdulto(texto: string): string[] {
  const visivel = texto.replace(ENDERECO_DO_LINK, ']')
  const problemas: string[] = []
  for (const { padrao, motivo } of PALAVRAS_PROIBIDAS) {
    for (const m of visivel.matchAll(padrao)) problemas.push(`"${m[0]}" (${motivo})`)
  }
  // O negrito desta biblioteca é o nome EXATO de um botão ou campo: par aberto vira texto cru.
  if ((visivel.match(/\*\*/g) ?? []).length % 2 !== 0) problemas.push('negrito sem fechar (**)')
  if (/\*\*\s*\*\*/.test(visivel)) problemas.push('negrito vazio')
  return problemas
}

function chavesForaDoLugar(obj: unknown, permitidas: Set<string>): string[] {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return []
  return Object.keys(obj).filter((k) => !permitidas.has(k))
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

if (!Array.isArray(lote.tutorials)) {
  console.error('O arquivo precisa ter a lista "tutorials".')
  process.exit(1)
}

// ── Coleções ────────────────────────────────────────────────────────────────
const colecoes = lote.collections ?? []
if (colecoes.length !== TOTAL_DE_COLECOES)
  erros.push(`são ${colecoes.length} coleções; o lote combinado tem ${TOTAL_DE_COLECOES}`)
const slugsDeColecao = new Set<string>()
const posicoesDeColecao = new Set<number>()
for (const c of colecoes) {
  for (const k of chavesForaDoLugar(c, CHAVES_COLECAO))
    erros.push(`coleção ${c.slug}: campo "${k}" não existe no import`)
  for (const issue of validateHelpCollection(c)) erros.push(`coleção ${c.slug}: ${issue.message}`)
  if (slugsDeColecao.has(c.slug)) erros.push(`coleção repetida: ${c.slug}`)
  slugsDeColecao.add(c.slug)
  if (typeof c.position !== 'number') erros.push(`coleção ${c.slug}: sem "position"`)
  else if (posicoesDeColecao.has(c.position))
    erros.push(`coleção ${c.slug}: posição ${c.position} repetida`)
  else posicoesDeColecao.add(c.position)
  for (const [campo, texto] of [
    ['title', c.title],
    ['description', c.description],
  ] as const)
    for (const problema of vocabularioAdulto(texto ?? ''))
      erros.push(`coleção ${c.slug}: ${campo}: ${problema}`)
}
const posicoesEsperadas = colecoes.map((_, i) => i)
if (!posicoesEsperadas.every((p) => posicoesDeColecao.has(p)))
  erros.push(`as posições das coleções precisam ser 0 a ${colecoes.length - 1}, sem buraco`)

// ── Tutoriais ───────────────────────────────────────────────────────────────
if (lote.tutorials.length !== TOTAL_DE_TUTORIAIS)
  erros.push(`são ${lote.tutorials.length} tutoriais; o lote combinado tem ${TOTAL_DE_TUTORIAIS}`)

const slugs = new Set(lote.tutorials.map((t) => t.slug))
if (slugs.size !== lote.tutorials.length) erros.push('há slug de tutorial repetido')

const posicoesPorColecao = new Map<string, Set<number>>()
const LINK = /\]\(\/como-fazer\/([a-z0-9-]+)\)/g
const SEM_IMAGEM = 'Nenhuma imagem da interface nem vídeo.'
const semImagem: string[] = []

for (const t of lote.tutorials) {
  for (const k of chavesForaDoLugar(t, CHAVES_TUTORIAL))
    erros.push(`${t.slug}: campo "${k}" não existe no import`)
  for (const k of chavesForaDoLugar(t.draft, CHAVES_DRAFT))
    erros.push(`${t.slug}: campo "${k}" não existe no rascunho`)
  if (!isHelpSlug(t.collection) || !slugsDeColecao.has(t.collection)) {
    erros.push(`${t.slug}: coleção "${t.collection}" não está no lote`)
  }
  const posicoes = posicoesPorColecao.get(t.collection) ?? new Set<number>()
  if (typeof t.position === 'number') {
    if (posicoes.has(t.position))
      erros.push(`${t.slug}: posição ${t.position} repetida na coleção ${t.collection}`)
    posicoes.add(t.position)
  }
  posicoesPorColecao.set(t.collection, posicoes)

  for (const issue of validateHelpTutorial(t.draft, { slug: t.slug })) {
    erros.push(
      `${t.slug}: ${issue.field}${issue.stepId ? ` (${issue.stepId})` : ''}: ${issue.message}`,
    )
  }
  for (const w of helpEditorialWarnings(t.draft)) {
    // As capturas das telas adultas entram depois (pelo admin): esse aviso vale para o lote
    // inteiro e vira uma linha só, para os outros avisos não se perderem.
    if (w.startsWith(SEM_IMAGEM)) semImagem.push(t.slug)
    else avisos.push(`${t.slug}: ${w}`)
  }

  const passos = Array.isArray(t.draft.steps) ? t.draft.steps : []
  if (passos.length < PASSOS_MIN || passos.length > PASSOS_MAX)
    erros.push(`${t.slug}: ${passos.length} passos (o lote pede de ${PASSOS_MIN} a ${PASSOS_MAX})`)
  for (const step of passos)
    for (const k of chavesForaDoLugar(step, CHAVES_PASSO))
      erros.push(`${t.slug}/${step.id}: campo "${k}" não existe no passo`)

  for (const r of t.draft.related ?? []) {
    if (!slugs.has(r)) erros.push(`${t.slug}: related "${r}" não existe no lote`)
  }
  for (const step of passos) {
    for (const m of (step.body ?? '').matchAll(LINK)) {
      if (!slugs.has(m[1] as string))
        erros.push(`${t.slug}/${step.id}: link para "${m[1]}" não existe`)
      if (m[1] === t.slug) erros.push(`${t.slug}/${step.id}: link para o próprio tutorial`)
    }
  }

  const textos: Array<[string, string | undefined]> = [
    ['title', t.draft.title],
    ['summary', t.draft.summary],
    ...passos.flatMap(
      (step): Array<[string, string | undefined]> => [
        [`${step.id}.title`, step.title],
        [`${step.id}.body`, step.body],
        [`${step.id}.imageAlt`, step.imageAlt],
      ],
    ),
  ]
  for (const [campo, texto] of textos)
    for (const problema of vocabularioAdulto(texto ?? ''))
      erros.push(`${t.slug}: ${campo}: ${problema}`)
}

const porColecao = new Map<string, number>()
for (const c of colecoes) porColecao.set(c.slug, 0)
for (const t of lote.tutorials)
  porColecao.set(t.collection, (porColecao.get(t.collection) ?? 0) + 1)
for (const [c, n] of porColecao)
  if (n < MINIMO_POR_COLECAO)
    erros.push(
      `coleção ${c}: ${n} tutorial(is); cada coleção precisa de pelo menos ${MINIMO_POR_COLECAO}`,
    )

console.log(`${colecoes.length} coleções, ${lote.tutorials.length} tutoriais`)
for (const c of [...colecoes].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)))
  console.log(`  ${c.position ?? '?'}. ${c.slug} (${c.title}): ${porColecao.get(c.slug) ?? 0}`)
if (semImagem.length || avisos.length) {
  console.log('\nSugestões do helpEditorialWarnings (não bloqueiam):')
  if (semImagem.length)
    console.log(
      `  - ${semImagem.length} tutorial(is) sem imagem nem vídeo: as capturas das telas adultas entram pelo admin antes de publicar.`,
    )
  for (const a of avisos) console.log(`  - ${a}`)
}
if (erros.length) {
  console.error(`\n${erros.length} erro(s):`)
  for (const e of erros) console.error(`  - ${e}`)
  process.exit(1)
}
console.log('\nOK: o lote passa no validador do members e nas regras da biblioteca adulta.')
