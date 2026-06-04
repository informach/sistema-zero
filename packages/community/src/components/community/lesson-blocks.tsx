import type {
  AudioBlock,
  EmbedBlock,
  ImageBlock,
  LessonBlockView,
  QuizBlock,
  RichTextBlock,
  VideoBlock,
} from '@/lib/types'
import { QuizBlockView } from './quiz-block'

/**
 * Renderer dos blocos de aula (união discriminada por `kind`). O `content` chega
 * `unknown` da API — cada renderer faz o narrowing e falha graciosamente.
 * SEGURANÇA: nunca interpolamos `src` cru em embed de vídeo — extraímos o ID e
 * montamos a URL canônica (youtube-nocookie/player.vimeo, na allowlist da CSP);
 * HTML arbitrário só roda em iframe `sandbox` SEM allow-same-origin.
 */
export function LessonBlocks({ blocks }: { blocks: LessonBlockView[] }) {
  const ordered = [...blocks].sort((a, b) => a.sortOrder - b.sortOrder)
  return (
    <div className="flex flex-col gap-6">
      {ordered.map((block) => (
        <BlockRenderer key={block.id} block={block} />
      ))}
    </div>
  )
}

function BlockRenderer({ block }: { block: LessonBlockView }) {
  const content = block.content as Record<string, unknown> | null
  if (!content || typeof content !== 'object') return null

  switch (block.kind) {
    case 'rich_text':
      return <RichText content={content as unknown as RichTextBlock} />
    case 'video':
      return <Video content={content as unknown as VideoBlock} />
    case 'image':
      return <ImageView content={content as unknown as ImageBlock} />
    case 'audio':
      return <Audio content={content as unknown as AudioBlock} />
    case 'quiz':
      return <QuizBlockView content={content as unknown as QuizBlock} />
    case 'embed':
      return <Embed content={content as unknown as EmbedBlock} />
    default:
      return null
  }
}

// ── rich_text: markdown SIMPLES renderizado de forma controlada (sem HTML cru) ─
function RichText({ content }: { content: RichTextBlock }) {
  const markdown = content.markdown ?? ''
  if (!markdown) return null
  return <div className="lesson-prose">{renderMarkdown(markdown)}</div>
}

/** Conversor mínimo de markdown → React (headings/listas/código/negrito/links). */
function renderMarkdown(md: string): React.ReactNode[] {
  const out: React.ReactNode[] = []
  const lines = md.replace(/\r\n/g, '\n').split('\n')
  let list: string[] = []
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
      flushList()
      code = []
      continue
    }
    const heading = line.match(/^(#{1,3})\s+(.*)$/)
    if (heading?.[1] && heading[2] !== undefined) {
      flushList()
      const text = renderInline(heading[2])
      if (heading[1].length === 1) out.push(<h1 key={`h-${key++}`}>{text}</h1>)
      else if (heading[1].length === 2) out.push(<h2 key={`h-${key++}`}>{text}</h2>)
      else out.push(<h3 key={`h-${key++}`}>{text}</h3>)
      continue
    }
    const bullet = line.match(/^\s*[-*]\s+(.*)$/)
    if (bullet?.[1] !== undefined) {
      list.push(bullet[1])
      continue
    }
    flushList()
    if (line.trim().length > 0) out.push(<p key={`p-${key++}`}>{renderInline(line)}</p>)
  }
  flushList()
  if (code !== null)
    out.push(
      <pre key={`c-${key++}`}>
        <code>{code.join('\n')}</code>
      </pre>,
    )
  return out
}

/** Inline: **negrito**, `código` e [links](url) — só http(s) nos links. */
function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = []
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\(https?:\/\/[^\s)]+\))/g
  let last = 0
  let key = 0
  for (const match of text.matchAll(pattern)) {
    const idx = match.index ?? 0
    if (idx > last) parts.push(text.slice(last, idx))
    const token = match[0]
    if (token.startsWith('**')) {
      parts.push(<strong key={`b-${key++}`}>{token.slice(2, -2)}</strong>)
    } else if (token.startsWith('`')) {
      parts.push(<code key={`i-${key++}`}>{token.slice(1, -1)}</code>)
    } else {
      const link = token.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/)
      if (link?.[1] && link[2]) {
        parts.push(
          <a key={`a-${key++}`} href={link[2]} target="_blank" rel="noopener noreferrer">
            {link[1]}
          </a>,
        )
      } else {
        parts.push(token)
      }
    }
    last = idx + token.length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

// ── video: URL canônica por provider (nunca interpola o src cru em iframe) ────
function youtubeId(src: string): string | null {
  const m = src.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,20})/,
  )
  return m?.[1] ?? null
}

function vimeoId(src: string): string | null {
  const m = src.match(/vimeo\.com\/(?:video\/)?(\d{6,12})/)
  return m?.[1] ?? null
}

function Video({ content }: { content: VideoBlock }) {
  if (!content.src) return null
  if (content.provider === 'youtube') {
    const id = youtubeId(content.src)
    if (!id) return <UnsupportedBlock label="Vídeo indisponível" />
    return (
      <div className="aspect-video w-full overflow-hidden rounded-lg border border-border bg-black">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}`}
          title="Vídeo da aula"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="h-full w-full"
        />
      </div>
    )
  }
  if (content.provider === 'vimeo') {
    const id = vimeoId(content.src)
    if (!id) return <UnsupportedBlock label="Vídeo indisponível" />
    return (
      <div className="aspect-video w-full overflow-hidden rounded-lg border border-border bg-black">
        <iframe
          src={`https://player.vimeo.com/video/${id}`}
          title="Vídeo da aula"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          className="h-full w-full"
        />
      </div>
    )
  }
  // `file`/`mux` (URL direta de vídeo) → player nativo.
  return (
    <video
      controls
      preload="metadata"
      poster={content.posterUrl}
      className="aspect-video w-full rounded-lg border border-border bg-black"
    >
      <source src={content.src} />
      <track kind="captions" />
    </video>
  )
}

function ImageView({ content }: { content: ImageBlock }) {
  if (!content.url) return null
  return (
    <figure>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={content.url}
        alt={content.alt ?? ''}
        className="w-full rounded-lg border border-border"
      />
      {content.caption ? (
        <figcaption className="mt-2 text-center text-xs text-muted-foreground">
          {content.caption}
        </figcaption>
      ) : null}
    </figure>
  )
}

function Audio({ content }: { content: AudioBlock }) {
  if (!content.url) return null
  return (
    // biome-ignore lint/a11y/useMediaCaption: áudio de aula sem faixa de legenda disponível
    <audio controls preload="metadata" src={content.url} className="w-full" />
  )
}

// ── embed: html roda APENAS em iframe sandbox (sem allow-same-origin) ─────────
function Embed({ content }: { content: EmbedBlock }) {
  const height = content.height && content.height > 0 ? content.height : 480
  if (content.html) {
    return (
      <iframe
        srcDoc={content.html}
        title="Conteúdo interativo"
        sandbox="allow-scripts"
        style={{ height }}
        className="w-full rounded-lg border border-border bg-black"
      />
    )
  }
  // `src` externo: a CSP do app (frame-src) decide o que pode carregar.
  if (content.src && /^https:\/\//.test(content.src)) {
    return (
      <iframe
        src={content.src}
        title="Conteúdo incorporado"
        sandbox={content.sandbox ?? 'allow-scripts'}
        style={{ height }}
        className="w-full rounded-lg border border-border"
      />
    )
  }
  return <UnsupportedBlock label="Conteúdo interativo não suportado" />
}

function UnsupportedBlock({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center rounded-lg border border-dashed border-border py-10 text-sm text-muted-foreground">
      {label}
    </div>
  )
}
