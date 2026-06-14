import type { ReactNode } from 'react'

/**
 * Conversor MÍNIMO e CONTROLADO de markdown → React (sem HTML cru — superfície
 * sensível a XSS, por isso puro e testado via bun test). Tokens suportados:
 * headings 1-3, listas `-`/`*` e numeradas `1.`, citação `> `, código
 * inline/fenced, negrito, itálico (`*x*`/`_x_`), links e imagens `![alt](url)`
 * — links e imagens só com esquema http(s) (esquema inválido cai como texto
 * literal). É o ALVO do editor TipTap do admin (saída markdown) — token novo na
 * toolbar de lá exige suporte aqui. Consumido pelo bloco `rich_text`
 * (`lesson-blocks.tsx`) e pelo bloco `quiz` (`quiz-block.tsx`).
 */
export function renderMarkdown(md: string): ReactNode[] {
  const out: ReactNode[] = []
  const lines = md.replace(/\r\n/g, '\n').split('\n')
  let list: string[] = []
  let olist: string[] = []
  let quote: string[] = []
  let code: string[] | null = null
  let key = 0

  const flushList = () => {
    if (list.length === 0) return
    out.push(
      <ul key={`l-${key++}`}>
        {list.map((item, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: lista estática derivada do markdown
          <li key={i}>{renderInline(item)}</li>
        ))}
      </ul>,
    )
    list = []
  }

  const flushOlist = () => {
    if (olist.length === 0) return
    out.push(
      <ol key={`o-${key++}`}>
        {olist.map((item, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: lista estática derivada do markdown
          <li key={i}>{renderInline(item)}</li>
        ))}
      </ol>,
    )
    olist = []
  }

  const flushQuote = () => {
    if (quote.length === 0) return
    out.push(
      <blockquote key={`q-${key++}`}>
        {quote.map((item, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: lista estática derivada do markdown
          <p key={i}>{renderInline(item)}</p>
        ))}
      </blockquote>,
    )
    quote = []
  }

  const flushBlocks = () => {
    flushList()
    flushOlist()
    flushQuote()
  }

  for (const line of lines) {
    if (code !== null) {
      if (line.trimEnd() === '```') {
        out.push(
          <pre key={`c-${key++}`}>
            <code>{code.join('\n')}</code>
          </pre>,
        )
        code = null
      } else {
        code.push(line)
      }
      continue
    }
    if (line.trimStart().startsWith('```')) {
      flushBlocks()
      code = []
      continue
    }
    const heading = line.match(/^(#{1,3})\s+(.*)$/)
    if (heading?.[1] && heading[2] !== undefined) {
      flushBlocks()
      const text = renderInline(heading[2])
      if (heading[1].length === 1) out.push(<h1 key={`h-${key++}`}>{text}</h1>)
      else if (heading[1].length === 2) out.push(<h2 key={`h-${key++}`}>{text}</h2>)
      else out.push(<h3 key={`h-${key++}`}>{text}</h3>)
      continue
    }
    const bullet = line.match(/^\s*[-*]\s+(.*)$/)
    if (bullet?.[1] !== undefined) {
      flushOlist()
      flushQuote()
      list.push(bullet[1])
      continue
    }
    const ordered = line.match(/^\s*\d+[.)]\s+(.*)$/)
    if (ordered?.[1] !== undefined) {
      flushList()
      flushQuote()
      olist.push(ordered[1])
      continue
    }
    const quoted = line.match(/^\s*>\s?(.*)$/)
    if (quoted?.[1] !== undefined) {
      flushList()
      flushOlist()
      if (quoted[1].trim().length > 0) quote.push(quoted[1])
      continue
    }
    flushBlocks()
    if (line.trim().length > 0) out.push(<p key={`p-${key++}`}>{renderInline(line)}</p>)
  }
  flushBlocks()
  if (code !== null)
    out.push(
      <pre key={`c-${key++}`}>
        <code>{code.join('\n')}</code>
      </pre>,
    )
  return out
}

/**
 * Inline: **negrito**, *itálico* ou _itálico_, `código`, imagens `![alt](url)` e
 * [links](url) — imagens e links SÓ com esquema http(s) (a imagem vem ANTES do
 * link na alternância pois o token começa com `!`; esquema inválido — ex.
 * `javascript:` — não casa o token e cai como texto literal).
 *
 * `plainLinks`: renderiza o TEXTO do link (sem `<a>`) — use quando o resultado
 * cai dentro de conteúdo interativo (ex.: `<button>` das opções do quiz kids),
 * onde aninhar `<a>` é HTML inválido / armadilha de a11y.
 */
export function renderInline(text: string, opts: { plainLinks?: boolean } = {}): ReactNode[] {
  const parts: ReactNode[] = []
  const pattern =
    /(\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_|`[^`]+`|!\[[^\]]*\]\(https?:\/\/[^\s)]+\)|\[[^\]]+\]\(https?:\/\/[^\s)]+\))/g
  let last = 0
  let key = 0
  for (const match of text.matchAll(pattern)) {
    const idx = match.index ?? 0
    if (idx > last) parts.push(text.slice(last, idx))
    const token = match[0]
    if (token.startsWith('**')) {
      parts.push(<strong key={`b-${key++}`}>{token.slice(2, -2)}</strong>)
    } else if (token.startsWith('*') || token.startsWith('_')) {
      parts.push(<em key={`e-${key++}`}>{token.slice(1, -1)}</em>)
    } else if (token.startsWith('`')) {
      parts.push(<code key={`i-${key++}`}>{token.slice(1, -1)}</code>)
    } else if (token.startsWith('![')) {
      const img = token.match(/^!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)$/)
      if (img?.[2]) {
        // <img> (não next/image): URLs externas arbitrárias da autoria, sem remotePatterns;
        // a CSP dos apps libera img-src https:. Esquema != http(s) já caiu como texto acima.
        parts.push(<img key={`img-${key++}`} src={img[2]} alt={img[1] ?? ''} loading="lazy" />)
      } else {
        parts.push(token)
      }
    } else {
      const link = token.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/)
      if (link?.[1] && link[2]) {
        // Dentro de conteúdo interativo, só o texto (não aninhar <a> em <button>).
        if (opts.plainLinks) {
          parts.push(link[1])
        } else {
          parts.push(
            <a key={`a-${key++}`} href={link[2]} target="_blank" rel="noopener noreferrer">
              {link[1]}
            </a>,
          )
        }
      } else {
        parts.push(token)
      }
    }
    last = idx + token.length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}
