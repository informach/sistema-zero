/**
 * Espelho editorial das ofertas da Comunidade: docs/marketing/kids/comunidade-dos-criadores/copy/pagina-*.md
 * a partir da copy tipada (src/funnels/comunidade-dos-criadores/oferta). A copy vive no código; o
 * espelho existe para ler e revisar a página inteira em Markdown. Para mudar uma frase, edite o
 * `.ts` e rode `bun scripts/espelho-copy-comunidade.ts`; `comunidade-offer-copy.test.ts` reprova
 * espelho desatualizado.
 */
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { COMUNIDADE_PAGES } from '../src/funnels/comunidade-dos-criadores/oferta'
import { PAGINA_9A17 } from '../src/funnels/comunidade-dos-criadores/oferta/pagina-9a17'
import { PAGINA_MENOR9 } from '../src/funnels/comunidade-dos-criadores/oferta/pagina-menor9'
import { RELATOS } from '../src/funnels/comunidade-dos-criadores/oferta/relatos'
import { FAQ, FAQ_EXTRA, SHARED_COPY } from '../src/funnels/comunidade-dos-criadores/oferta/shared'
import type {
  ComunidadePage,
  ComunidadePageId,
  ComunidadeSection,
  RelatoId,
} from '../src/funnels/comunidade-dos-criadores/oferta/types'

export const PASTA_ESPELHO = join(
  import.meta.dir,
  '..',
  '..',
  '..',
  'docs',
  'marketing',
  'kids',
  'comunidade-dos-criadores',
  'copy',
)

/** As páginas do motor de seções (hoje só a de continuidade). */
export const ARQUIVOS_ESPELHO: Record<ComunidadePageId, string> = {
  continuar: 'pagina-e-continuidade.md',
}

/**
 * As páginas de corpo próprio (20/10/2026): a copy é um módulo tipado, e o espelho lista os textos
 * na ordem do módulo, que é a ordem da página.
 */
export const MODULOS_ESPELHO: Record<string, { arquivo: string; modulo: object }> = {
  '9a17': { arquivo: 'pagina-9-a-17.md', modulo: PAGINA_9A17 },
  'criar-junto': { arquivo: 'pagina-menor-9.md', modulo: PAGINA_MENOR9 },
}

/** Chaves técnicas do módulo que não são texto da página. */
const CHAVES_TECNICAS = new Set([
  'file',
  'arquivo',
  'capa',
  'width',
  'height',
  'id',
  'href',
  'retina',
  'cor',
  'icone',
])

/**
 * O Markdown de uma página de corpo próprio: cada texto do módulo, na ordem, com o caminho da chave
 * para quem revisa achar onde ele está. Imagens aparecem pelo texto alternativo.
 */
export function espelhoDoModulo(modulo: object): string {
  const b: string[] = []
  const visita = (valor: unknown, caminho: string) => {
    if (typeof valor === 'string') {
      b.push(`**${caminho}**: ${valor}`)
      return
    }
    if (Array.isArray(valor)) {
      valor.forEach((item, i) => {
        visita(item, `${caminho}[${i}]`)
      })
      return
    }
    if (valor && typeof valor === 'object')
      for (const [chave, item] of Object.entries(valor)) {
        if (CHAVES_TECNICAS.has(chave)) continue
        visita(item, caminho ? `${caminho}.${chave}` : chave)
      }
  }
  visita(modulo, '')
  return `${CABECALHO}\n\n${b.join('\n\n')}\n`
}

const CABECALHO =
  '<!-- Espelho gerado da copy tipada em packages/funnel/src/funnels/comunidade-dos-criadores/oferta/. Edite o código e rode `bun scripts/espelho-copy-comunidade.ts` (em packages/funnel). -->'

const relato = (id: RelatoId) => {
  const r = RELATOS[id]
  return `> “${r.fala}” ${r.nome} · ${r.papel} · ${r.contexto}`
}

/** O Markdown da página, bloco a bloco, na ordem em que a oferta renderiza o texto. */
export function espelhoDaPagina(page: ComunidadePage): string {
  const b: string[] = []
  b.push(`_${page.heroChip}_`, `# ${page.hero.title}`, page.hero.description)
  b.push(page.hero.benefits.map((x) => `- ${x}`).join('\n'))
  b.push(page.hero.requirements)
  b.push(`[${page.hero.primary.label}](${page.hero.primary.href})`)
  b.push(`[${page.hero.secondary.label}](${page.hero.secondary.href})`)
  const secao = (s: ComunidadeSection) => {
    b.push(`<a id="${s.id}"></a>`, `_${s.eyebrow}_`, `## ${s.title}`)
    for (const g of s.groups) {
      if (g.title) b.push(`### ${g.title}`)
      b.push(...g.paragraphs)
      if (g.comparison) {
        b.push(
          [
            `| ${g.comparison.headers.join(' | ')} |`,
            `| ${g.comparison.headers.map(() => '---').join(' | ')} |`,
            ...g.comparison.rows.map((r) => `| ${r.join(' | ')} |`),
          ].join('\n'),
        )
      }
    }
    for (const f of s.falas ?? []) b.push(relato(f))
    for (const a of s.actions) b.push(`[${a.label}](${a.href})`)
  }
  for (const s of page.sections) secao(s)
  if (page.showFounder !== false) secao(page.founder ?? SHARED_COPY.founder)
  const offer = page.offer ?? SHARED_COPY.offer
  b.push('<a id="planos"></a>', '_Assinatura_', `## ${offer.title}`, ...offer.paragraphs)
  for (const f of offer.falas ?? []) b.push(relato(f))
  b.push(`### ${offer.monthly.title}`, '**{{preco_mensal}} por mês**', ...offer.monthly.paragraphs)
  b.push(`[${offer.monthly.cta}](#contratacao)`)
  b.push(
    `### ${offer.annual.title}`,
    '**{{preco_anual}} por 12 meses**',
    ...offer.annual.paragraphs,
  )
  b.push(`[${offer.annual.cta}](#contratacao)`)
  if (offer.period) b.push(`### ${offer.period.title}`, ...offer.period.paragraphs)
  b.push('<a id="garantia"></a>', `### ${offer.guarantee.title}`, ...offer.guarantee.paragraphs)
  b.push('<a id="contratacao"></a>', offer.checkout)
  const faq = page.faq ?? { ...FAQ, ...FAQ_EXTRA }
  b.push(`## ${page.faqTitle}`)
  for (const g of page.faqGroups) {
    b.push(`### ${g.title}`)
    for (const q of g.questions) {
      const entrada = faq[q]
      if (!entrada) throw new Error(`Dúvida sem resposta: ${page.id}/${q}`)
      b.push(`<a id="duvida-${q}"></a>`, `#### ${entrada.question}`, ...entrada.paragraphs)
    }
  }
  secao(page.closing)
  return `${CABECALHO}\n\n${b.join('\n\n')}\n`
}

if (import.meta.main) {
  for (const [id, arquivo] of Object.entries(ARQUIVOS_ESPELHO)) {
    writeFileSync(
      join(PASTA_ESPELHO, arquivo),
      espelhoDaPagina(COMUNIDADE_PAGES[id as ComunidadePageId]),
    )
    console.log(arquivo)
  }
  for (const { arquivo, modulo } of Object.values(MODULOS_ESPELHO)) {
    writeFileSync(join(PASTA_ESPELHO, arquivo), espelhoDoModulo(modulo))
    console.log(arquivo)
  }
}
