'use client'

import { CertificateBlockView } from '@sistemazero/member-shell/components/certificate-block'
import { EbookBlockView } from '@sistemazero/member-shell/components/ebook/ebook-block'
import { useLessonPlayer } from '@sistemazero/member-shell/components/lesson-player-context'
import { StudioBlockView } from '@sistemazero/member-shell/components/studio/studio-block'
import { VimeoPlayer } from '@sistemazero/member-shell/components/vimeo-player'
import type { StudioShareResult } from '@sistemazero/studio'
import {
  Award,
  BookOpenText,
  Clapperboard,
  Code2,
  Gamepad2,
  Headphones,
  ListChecks,
  type LucideIcon,
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/cn'
import { renderMarkdown } from '@/lib/markdown'
import type {
  AudioBlock,
  CertificateBlock,
  EbookBlock,
  EmbedBlock,
  ImageBlock,
  LessonBlockView,
  QuizBlock,
  QuizStateView,
  RichTextBlock,
  StudioBlock,
  StudioStateView,
  VideoBlock,
} from '@/lib/types'
import { KidsQuiz } from './kids-quiz'
import { MuralCelebration } from './mural-celebration'

/**
 * Renderer KIDS dos blocos de aula — fork de APRESENTAÇÃO do
 * member-shell/lesson-blocks (o community segue com o renderer de lá; mexeu
 * na SEGURANÇA de um bloco, replique nos dois). Cada atividade ganha um chip
 * colorido + moldura lúdica, estilo Duolingo. Invariantes PRESERVADOS:
 * nunca interpolamos `src` cru em embed de vídeo — extraímos o ID e montamos
 * a URL canônica (youtube-nocookie/player.vimeo, na allowlist da CSP); HTML
 * arbitrário só roda em iframe `sandbox` SEM allow-same-origin; rich_text é
 * markdown renderizado de forma controlada (conversor puro/testado).
 */
export function KidsLessonBlocks({ blocks }: { blocks: LessonBlockView[] }) {
  const ordered = [...blocks].sort((a, b) => a.sortOrder - b.sortOrder)
  return (
    <div className="flex flex-col gap-8">
      {ordered.map((block) => (
        <BlockRenderer key={block.id} block={block} />
      ))}
    </div>
  )
}

/** Chip de atividade (cores da marca via temas de unidade — mapa literal). */
function BlockChip({
  icon: Icon,
  label,
  themeClass,
}: {
  icon: LucideIcon
  label: string
  themeClass: 'kids-unit-cyan' | 'kids-unit-lime' | 'kids-unit-grad'
}) {
  return (
    <span
      className={cn(
        themeClass,
        'inline-flex items-center gap-1.5 self-start rounded-full px-3 py-1 font-bold text-xs uppercase tracking-wide',
        '[font-family:var(--font-display)] [background-color:var(--unit-bg)] [background-image:var(--unit-bg-image)] text-(--unit-fg)',
      )}
    >
      <Icon className="size-3.5" />
      {label}
    </span>
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
        <div className="kids-unit-lime flex flex-col gap-3">
          <BlockChip icon={ListChecks} label="Responda" themeClass="kids-unit-lime" />
          <KidsQuiz
            blockId={block.id}
            content={content as unknown as QuizBlock}
            quizState={(block.quizState as QuizStateView | null | undefined) ?? null}
          />
        </div>
      )
    case 'embed':
      return <Embed content={content as unknown as EmbedBlock} />
    case 'ebook':
      return (
        <div className="flex flex-col gap-3">
          <BlockChip icon={BookOpenText} label="Leia o livro" themeClass="kids-unit-cyan" />
          <EbookBlockView blockId={block.id} content={content as unknown as EbookBlock} />
        </div>
      )
    case 'certificate':
      return (
        <div className="kids-unit-lime flex flex-col gap-3">
          <BlockChip icon={Award} label="Conquiste" themeClass="kids-unit-lime" />
          <CertificateBlockView
            blockId={block.id}
            content={content as unknown as CertificateBlock}
          />
        </div>
      )
    case 'studio':
      return <StudioBlockKids block={block} content={content as unknown as StudioBlock} />
    default:
      return null
  }
}

/**
 * Bloco Estúdio na aula kids: o editor embarcado + a CELEBRAÇÃO ao publicar no Mural. O botão
 * "Compartilhar" aparece SÓ na ÚLTIMA aula do projeto (`showcase.enabled` — vitrine marcada pelo
 * admin); nas intermediárias a criança desenvolve sem publicar. Ao publicar, `onShared` traz os
 * links e abre o overlay do Zappy (no lugar da tela de sucesso sóbria do editor).
 */
function StudioBlockKids({ block, content }: { block: LessonBlockView; content: StudioBlock }) {
  const [shared, setShared] = useState<StudioShareResult | null>(null)
  return (
    <div className="kids-unit-grad flex flex-col gap-3">
      <BlockChip icon={Code2} label="Crie" themeClass="kids-unit-grad" />
      <StudioBlockView
        blockId={block.id}
        content={content}
        studioState={(block.studioState as StudioStateView | null | undefined) ?? null}
        enableShare={Boolean(content.showcase?.enabled)}
        onShared={setShared}
      />
      {shared ? <MuralCelebration result={shared} onClose={() => setShared(null)} /> : null}
    </div>
  )
}

// ── rich_text: markdown SIMPLES renderizado de forma controlada (sem HTML cru) ─
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

function vimeoId(src: string): string | null {
  const m = src.match(/vimeo\.com\/(?:video\/)?(\d{6,12})/)
  return m?.[1] ?? null
}

/** Moldura kids dos players (borda grossa colorida + cantos bem redondos). */
function VideoFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="kids-unit-cyan flex flex-col gap-3">
      <BlockChip icon={Clapperboard} label="Assista" themeClass="kids-unit-cyan" />
      <div className="overflow-hidden rounded-3xl border-(--unit) border-4 shadow-[0_5px_0_color-mix(in_oklch,var(--unit)_45%,transparent)]">
        {children}
      </div>
    </div>
  )
}

function Video({ content }: { content: VideoBlock }) {
  if (!content.src) return null
  if (content.provider === 'youtube') {
    const id = youtubeId(content.src)
    if (!id) return <UnsupportedBlock label="Vídeo indisponível" />
    return (
      <VideoFrame>
        <div className="aspect-video w-full bg-black">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${id}`}
            title="Vídeo da aula"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full"
          />
        </div>
      </VideoFrame>
    )
  }
  if (content.provider === 'vimeo') {
    const id = vimeoId(content.src)
    if (!id) return <UnsupportedBlock label="Vídeo indisponível" />
    return (
      <VideoFrame>
        <VimeoLessonVideo vimeoId={id} />
      </VideoFrame>
    )
  }
  // `file`/`mux` (URL direta de vídeo) → player nativo.
  return (
    <VideoFrame>
      <video
        controls
        preload="metadata"
        poster={content.posterUrl}
        className="aspect-video w-full bg-black"
      >
        <source src={content.src} />
        <track kind="captions" />
      </video>
    </VideoFrame>
  )
}

/**
 * Vimeo com o player rico (SDK): watermark do aluno, fullscreen custom, retomar
 * posição e auto-conclusão por % assistido — tudo vindo do LessonPlayerContext.
 */
function VimeoLessonVideo({ vimeoId }: { vimeoId: string }) {
  const player = useLessonPlayer()
  return (
    <VimeoPlayer
      vimeoId={vimeoId}
      watermark={player?.viewerEmail ?? null}
      initialPositionSeconds={player?.initialPositionSeconds ?? null}
      onProgress={player?.onVideoProgress}
      onFlush={player?.onVideoFlush}
      onReachedThreshold={player?.onVideoReachedThreshold}
    />
  )
}

function ImageView({ content }: { content: ImageBlock }) {
  if (!content.url) return null
  return (
    <figure className="kids-unit-lime">
      {/* aspect-ratio reserva a altura ANTES do load → sem layout shift (CLS) empurrando
          o texto/botão "Concluir aula" enquanto a imagem baixa no tablet da criança. */}
      <div className="aspect-[4/3] w-full overflow-hidden rounded-3xl border-(--unit) border-4 shadow-[0_5px_0_color-mix(in_oklch,var(--unit)_45%,transparent)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={content.url} alt={content.alt ?? ''} className="size-full object-contain" />
      </div>
      {content.caption ? (
        <figcaption className="mt-3 text-center font-semibold text-muted-foreground text-sm [font-family:var(--font-display)]">
          {content.caption}
        </figcaption>
      ) : null}
    </figure>
  )
}

function Audio({ content }: { content: AudioBlock }) {
  if (!content.url) return null
  return (
    <div className="kids-unit-lime flex flex-col gap-3 rounded-3xl border-2 border-border bg-card p-4 shadow-[0_4px_0_var(--border)]">
      <BlockChip icon={Headphones} label="Escute" themeClass="kids-unit-lime" />
      {/* biome-ignore lint/a11y/useMediaCaption: áudio de aula sem faixa de legenda disponível */}
      <audio controls preload="metadata" src={content.url} className="w-full" />
    </div>
  )
}

// ── embed: html roda APENAS em iframe sandbox (sem allow-same-origin) ─────────
// Autoria v3: sempre largura total em 16:9. `content.sandbox` é IGNORADO de
// propósito: o renderer fixa `allow-scripts` — honrar tokens por bloco abriria
// a porta p/ allow-same-origin.
function Embed({ content }: { content: EmbedBlock }) {
  if (!content.html) return <UnsupportedBlock label="Conteúdo interativo não suportado" />
  return (
    <div className="kids-unit-grad flex flex-col gap-3">
      <BlockChip icon={Gamepad2} label="Brinque" themeClass="kids-unit-grad" />
      <div className="overflow-hidden rounded-3xl border-(--unit) border-4 shadow-[0_5px_0_color-mix(in_oklch,var(--unit)_45%,transparent)]">
        <iframe
          srcDoc={content.html}
          title="Conteúdo interativo"
          sandbox="allow-scripts"
          className="aspect-video w-full bg-black"
        />
      </div>
    </div>
  )
}

function UnsupportedBlock({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center rounded-3xl border-2 border-border border-dashed py-10 text-muted-foreground text-sm">
      {label}
    </div>
  )
}
