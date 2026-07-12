'use client'

import { CertificateBlockView } from '@sistemazero/member-shell/components/certificate-block'
import { EbookBlockView } from '@sistemazero/member-shell/components/ebook/ebook-block'
import { useLessonPlayer } from '@sistemazero/member-shell/components/lesson-player-context'
import { StudioBlockView } from '@sistemazero/member-shell/components/studio/studio-block'
import { VimeoPlayer } from '@sistemazero/member-shell/components/vimeo-player'
import { useIsDesktop } from '@sistemazero/member-shell/lib/use-is-desktop'
import type { StudioShareResult } from '@sistemazero/studio'
import { Button } from '@sistemazero/ui/button'
import {
  ArrowLeft,
  Award,
  BookOpenText,
  Clapperboard,
  Code2,
  Gamepad2,
  Headphones,
  ListChecks,
  type LucideIcon,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
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

/**
 * A aula suporta o "modo criação guiada"? (tem um bloco de VÍDEO **e** um de ESTÚDIO).
 * Só então o botão de ativar aparece — o modo é vídeo à esquerda + estúdio à direita.
 */
export function lessonSupportsGuided(blocks: LessonBlockView[]): boolean {
  return blocks.some((b) => b.kind === 'video') && blocks.some((b) => b.kind === 'studio')
}

/**
 * MODO CRIAÇÃO GUIADA: tela limpa em overlay — botão "voltar ao modo normal" + o VÍDEO da
 * aula à esquerda e o ESTÚDIO à direita (lado a lado no desktop), pra a criança assistir e ir
 * fazendo junto. Usa o 1º bloco de vídeo + o 1º de estúdio (o estúdio é o MESMO bloco — mesmo
 * rascunho/entrega/Compartilhar). No mobile empilha (vídeo em cima). Renderizado DENTRO do
 * `LessonPlayerProvider` (precisa do contexto do player: viewerId, posição do vídeo etc.).
 *
 * No desktop o split é ARRASTÁVEL (react-resizable-panels, o mesmo divisor de dentro do
 * Estúdio): a criança aumenta o estúdio e encolhe o vídeo (ou o contrário) puxando o
 * divisor; a posição persiste no localStorage (`autoSaveId`). O estúdio tem piso maior
 * (minSize 35) — Blockly fica inusável estreito demais. Cruzar o limiar desktop↔mobile
 * remonta o StudioBlockKids (re-semeia do rascunho local, sem perda — mesmo custo aceito
 * da alternância guiada↔normal); os DOIS layouts nunca montam juntos (mesma chave de
 * rascunho no IndexedDB, ver comentário do modo).
 */
export function GuidedCreationMode({
  blocks,
  lessonTitle,
  onExit,
}: {
  blocks: LessonBlockView[]
  lessonTitle: string
  onExit: () => void
}) {
  const isDesktop = useIsDesktop()
  const videoBlock = blocks.find((b) => b.kind === 'video')
  const studioBlock = blocks.find((b) => b.kind === 'studio')
  if (!videoBlock || !studioBlock) return null
  const video = <Video content={videoBlock.content as unknown as VideoBlock} />
  const studio = (
    <StudioBlockKids
      block={studioBlock}
      content={studioBlock.content as unknown as StudioBlock}
      fillHeight
    />
  )
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex shrink-0 items-center gap-3 border-border border-b px-3 py-2">
        <Button variant="outline" onClick={onExit} className="rounded-full">
          <ArrowLeft className="size-4" />
          Voltar ao modo normal
        </Button>
        <span className="sz-display truncate text-sm">{lessonTitle}</span>
      </div>
      {isDesktop ? (
        <PanelGroup
          direction="horizontal"
          autoSaveId="kids-guided-creation"
          className="min-h-0 flex-1 overflow-hidden p-3"
        >
          <Panel defaultSize={50} minSize={20}>
            <div className="scrollbar-subtle h-full min-h-0 overflow-y-auto pr-3">{video}</div>
          </Panel>
          <PanelResizeHandle className="sz-resize-handle sz-resize-handle--vertical" />
          <Panel defaultSize={50} minSize={35}>
            <div className="flex h-full min-h-0 flex-col pl-3">{studio}</div>
          </Panel>
        </PanelGroup>
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden p-3">
          <div className="scrollbar-subtle min-h-0 overflow-y-auto">{video}</div>
          <div className="flex min-h-0 flex-col">{studio}</div>
        </div>
      )}
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
            tone="kids"
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
function StudioBlockKids({
  block,
  content,
  fillHeight,
}: {
  block: LessonBlockView
  content: StudioBlock
  /** Modo criação guiada: o editor preenche a coluna ao lado do vídeo. */
  fillHeight?: boolean
}) {
  const router = useRouter()
  const [shared, setShared] = useState<StudioShareResult | null>(null)
  // Ao fechar a celebração do Mural, REVALIDA os dados do servidor: publicar pode ter
  // feito o aluno SUBIR DE NÍVEL (marco course_showcased já gravado no members), e o
  // refresh re-busca a gamificação do layout → o LevelUpWatcher acende a festa do rank
  // logo em seguida (sequência: "no Mural!" → "subiu de nível!").
  function closeShare() {
    setShared(null)
    router.refresh()
  }
  return (
    <div className={cn('kids-unit-grad flex flex-col gap-3', fillHeight && 'min-h-0 flex-1')}>
      <BlockChip icon={Code2} label="Crie" themeClass="kids-unit-grad" />
      <StudioBlockView
        blockId={block.id}
        content={content}
        studioState={(block.studioState as StudioStateView | null | undefined) ?? null}
        enableShare={Boolean(content.showcase?.enabled)}
        onShared={setShared}
        fillHeight={fillHeight}
      />
      {shared ? <MuralCelebration result={shared} onClose={closeShare} /> : null}
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
      watermark={player?.viewerWatermark ?? null}
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
