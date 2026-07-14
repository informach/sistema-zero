/**
 * Renderizador de markdown MÍNIMO e seguro para o enunciado da atividade.
 *
 * O admin autora o enunciado em rich text (TipTap → markdown), então o
 * `ActivityPanel` mostrava `**negrito**`/`#`/`- ` crus ao aluno (6º review, F).
 * Este renderer cobre o subconjunto que o editor produz — títulos, listas,
 * negrito/itálico, código inline e links — SEM dependência (o studio é lib
 * embarcada como TS source).
 *
 * Segurança: o texto é HTML-ESCAPADO por inteiro ANTES de qualquer transformação;
 * só então um subconjunto de tags é reintroduzido. Nenhum HTML do autor passa
 * verbatim. Links têm o href SANEADO (só http/https/mailto — `javascript:`/`data:`
 * viram texto puro, não viram âncora). É seguro para `dangerouslySetInnerHTML`.
 */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Só http(s)/mailto viram link; o resto cai como texto (anti `javascript:`/`data:`). */
function isSafeHref(url: string): boolean {
  return /^https?:\/\//i.test(url) || /^mailto:/i.test(url)
}

/** Transforma o markdown INLINE de um texto JÁ ESCAPADO. Código primeiro (protege o conteúdo). */
function renderInline(escaped: string): string {
  let out = escaped
  // Código inline `x` (não reescala o conteúdo — já está escapado).
  out = out.replace(
    /`([^`]+)`/g,
    (_m, code) => `<code class="rounded bg-sz-bg px-1">${code}</code>`,
  )
  // Links [rótulo](url). O `url` já está escapado (aspas viraram &quot;), então
  // não escapa do atributo; ainda assim só vira âncora se o esquema for seguro.
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (whole, label, url) => {
    if (!isSafeHref(url)) return whole
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-sz-accent underline">${label}</a>`
  })
  // Negrito ANTES de itálico (senão `**` cairia no `*`).
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  out = out.replace(/__([^_]+)__/g, '<strong>$1</strong>')
  out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
  out = out.replace(/(^|[^_\w])_([^_\n]+)_/g, '$1<em>$2</em>')
  return out
}

const HEADING_TAG: Record<number, string> = { 1: 'h3', 2: 'h4', 3: 'h5' }

/** Renderiza o markdown do enunciado num HTML seguro (subconjunto). */
export function renderLessonMarkdown(src: string): string {
  if (!src.trim()) return ''
  // Blocos separados por linha em branco (saída típica do tiptap-markdown).
  const blocks = escapeHtml(src.replace(/\r\n/g, '\n').trim()).split(/\n{2,}/)
  const html: string[] = []
  for (const block of blocks) {
    const lines = block.split('\n')
    // Lista não-ordenada: TODAS as linhas começam com "- " ou "* ".
    if (lines.every((l) => /^[-*]\s+/.test(l))) {
      const items = lines.map((l) => `<li>${renderInline(l.replace(/^[-*]\s+/, ''))}</li>`).join('')
      html.push(`<ul class="list-disc pl-5">${items}</ul>`)
      continue
    }
    // Citação/aviso: TODAS as linhas começam com "> " (após o escape, "&gt; ").
    if (lines.every((l) => /^&gt;\s+/.test(l))) {
      const inner = lines.map((l) => renderInline(l.replace(/^&gt;\s+/, ''))).join('<br>')
      html.push(`<blockquote class="border-l-2 border-sz-accent pl-3 italic">${inner}</blockquote>`)
      continue
    }
    // Título: bloco de UMA linha começando com #, ##, ### (escapado vira &#35;? não:
    // `#` não é caractere especial de HTML, então sobrevive ao escape).
    const heading = lines.length === 1 ? (lines[0] ?? '').match(/^(#{1,3})\s+(.*)$/) : null
    if (heading) {
      const tag = HEADING_TAG[(heading[1] ?? '').length]
      html.push(
        `<${tag} class="font-semibold text-sz-fg">${renderInline(heading[2] ?? '')}</${tag}>`,
      )
      continue
    }
    // Parágrafo: quebras simples viram <br>.
    html.push(`<p>${lines.map(renderInline).join('<br>')}</p>`)
  }
  return html.join('')
}
