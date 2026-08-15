'use client'

import { renderMarkdown } from '../lib/markdown'
import type {
  AudioBlock,
  CertificateBlock,
  ComingSoonBlock,
  EbookBlock,
  EmbedBlock,
  ImageBlock,
  LessonBlockView,
  PintaBlock,
  PintaStateView,
  QuizBlock,
  QuizStateView,
  RichTextBlock,
  StudioBlock,
  StudioStateView,
  VideoBlock,
} from '../lib/types'
import { CertificateBlockView } from './certificate-block'
import { EbookBlockView } from './ebook/ebook-block'
import { useLessonPlayer } from './lesson-player-context'
import { PintaBlockView } from './pinta/pinta-block'
import { QuizBlockView } from './quiz-block'
import { StudioBlockView } from './studio/studio-block'
import { VimeoPlayer } from './vimeo-player'

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
      return (
        <QuizBlockView
          blockId={block.id}
          content={content as unknown as QuizBlock}
          quizState={(block.quizState as QuizStateView | null | undefined) ?? null}
        />
      )
    case 'embed':
      return <Embed content={content as unknown as EmbedBlock} />
    case 'ebook':
      return <EbookBlockView blockId={block.id} content={content as unknown as EbookBlock} />
    case 'certificate':
      return (
        <CertificateBlockView blockId={block.id} content={content as unknown as CertificateBlock} />
      )
    case 'studio':
      return (
        <StudioBlockView
          blockId={block.id}
          content={content as unknown as StudioBlock}
          studioState={(block.studioState as StudioStateView | null | undefined) ?? null}
        />
      )
    case 'pinta':
      return (
        <PintaBlockView
          blockId={block.id}
          content={content as unknown as PintaBlock}
          pintaState={(block.pintaState as PintaStateView | null | undefined) ?? null}
        />
      )
    case 'coming_soon':
      return <ComingSoon content={content as unknown as ComingSoonBlock} />
    default:
      return null
  }
}

/** Recado padrão da aula em produção quando o autor não escreveu o dele. */
export const COMING_SOON_DEFAULT_MESSAGE =
  'Esta aula ainda está sendo preparada. Assim que o conteúdo estiver pronto, ele aparece aqui.'

/**
 * Bloco "em breve": a aula está EM PRODUÇÃO. Quando ele existe, é o ÚNICO bloco que
 * o members serve ao aluno (os demais e os anexos ficam no servidor) e a conclusão é
 * recusada — ver `LESSON_COMING_SOON`. Aqui é só o recado; o portão é o backend.
 */
function ComingSoon({ content }: { content: ComingSoonBlock }) {
  // Sem `role="status"`: é conteúdo ESTÁTICO renderizado com a página, não um aviso
  // que aparece depois — uma região `aria-live` aqui só arriscaria anúncio fora de
  // ordem durante a carga.
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center">
      <p className="font-medium text-foreground">Em breve</p>
      <p className="text-sm text-muted-foreground">
        {content.message?.trim() || COMING_SOON_DEFAULT_MESSAGE}
      </p>
    </div>
  )
}

// ── rich_text: markdown SIMPLES renderizado de forma controlada (sem HTML cru) ─
// O conversor é puro e unit-testado em `@/lib/markdown` (superfície XSS-sensível).
function RichText({ content }: { content: RichTextBlock }) {
  const markdown = content.markdown ?? ''
  if (!markdown) return null
  return <div className="lesson-prose">{renderMarkdown(markdown)}</div>
}

// ── video: URL canônica por provider (nunca interpola o src cru em iframe) ────
function youtubeId(src: string): string | null {
  const m = src.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,20})/,
  )
  return m?.[1] ?? null
}

/**
 * Extrai o ID numérico do Vimeo e, quando presente, o HASH de privacidade (`h`)
 * dos vídeos NÃO LISTADOS — forma de caminho (`vimeo.com/<id>/<hash>`) ou de query
 * (`?h=<hash>`). Sem o hash, o SDK não consegue tocar um vídeo unlisted. Tanto o id
 * (dígitos) quanto o hash (alfanumérico) são validados pela regex — nunca o src cru.
 */
function parseVimeo(src: string): { id: string; hash: string | null } | null {
  const m = src.match(/vimeo\.com\/(?:video\/)?(\d{6,12})(?:\/([A-Za-z0-9]{4,40}))?/)
  const id = m?.[1]
  if (!id) return null
  const queryHash = src.match(/[?&]h=([A-Za-z0-9]{4,40})/)?.[1] ?? null
  return { id, hash: m[2] ?? queryHash }
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
    const parsed = parseVimeo(content.src)
    if (!parsed) return <UnsupportedBlock label="Vídeo indisponível" />
    return <VimeoLessonVideo vimeoId={parsed.id} vimeoHash={parsed.hash} />
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

/**
 * Vimeo com o player rico (SDK): watermark do aluno, fullscreen custom, retomar
 * posição e auto-conclusão por % assistido — tudo vindo do LessonPlayerContext
 * (fora do player degrada para o embed sem callbacks).
 */
function VimeoLessonVideo({ vimeoId, vimeoHash }: { vimeoId: string; vimeoHash: string | null }) {
  const player = useLessonPlayer()
  return (
    <VimeoPlayer
      vimeoId={vimeoId}
      vimeoHash={vimeoHash}
      watermark={player?.viewerWatermark ?? null}
      initialPositionSeconds={player?.initialPositionSeconds ?? null}
      onProgress={player?.onVideoProgress}
      onFlush={player?.onVideoFlush}
      onReachedThreshold={player?.onVideoReachedThreshold}
      onEnded={player?.onVideoEnded}
    />
  )
}

function ImageView({ content }: { content: ImageBlock }) {
  if (!content.url) return null
  return (
    <figure>
      {/* aspect-ratio reserva a altura ANTES do load → sem layout shift (CLS). */}
      <div className="aspect-[4/3] w-full overflow-hidden rounded-lg border border-border">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={content.url} alt={content.alt ?? ''} className="size-full object-contain" />
      </div>
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
// Autoria v3: sempre largura total em 16:9 (sem altura/URL configuráveis).
// Bloco legado só-src (sem html) → "não suportado" (recriar na autoria v3).
// `content.sandbox` (allowlist validada no members) é IGNORADO de propósito:
// o renderer fixa `allow-scripts` — o default mais restrito que ainda roda o
// interativo; honrar tokens por bloco abriria a porta p/ allow-same-origin.
function Embed({ content }: { content: EmbedBlock }) {
  if (!content.html) return <UnsupportedBlock label="Conteúdo interativo não suportado" />
  return (
    <iframe
      srcDoc={content.html}
      title="Conteúdo interativo"
      sandbox="allow-scripts"
      className="aspect-video w-full rounded-lg border border-border bg-black"
    />
  )
}

function UnsupportedBlock({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center rounded-lg border border-dashed border-border py-10 text-sm text-muted-foreground">
      {label}
    </div>
  )
}
