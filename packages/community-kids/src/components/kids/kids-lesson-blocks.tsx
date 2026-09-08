'use client'

import { CertificateBlockView } from '@sistemazero/member-shell/components/certificate-block'
import { EbookBlockView } from '@sistemazero/member-shell/components/ebook/ebook-block'
import { LessonVideo } from '@sistemazero/member-shell/components/lesson-video'
import { PintaBlockView } from '@sistemazero/member-shell/components/pinta/pinta-block'
import { StudioBlockView } from '@sistemazero/member-shell/components/studio/studio-block'
import type { StudioShareResult } from '@sistemazero/studio'
import {
  Award,
  BookOpenText,
  Clapperboard,
  Code2,
  Gamepad2,
  Hammer,
  Headphones,
  ListChecks,
  type LucideIcon,
  Palette,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { cn } from '@/lib/cn'
import { parseLessonBlock } from '@/lib/lesson-block-content'
import { renderMarkdown } from '@/lib/markdown'
import type {
  AudioBlock,
  ComingSoonBlock,
  EmbedBlock,
  ImageBlock,
  LessonBlockView,
  RichTextBlock,
  StudioBlock,
  VideoBlock,
} from '@/lib/types'
import { KidsQuiz } from './kids-quiz'
import { KidsMascot } from './mascot'
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
  themeClass: 'kids-unit-cyan' | 'kids-unit-lime' | 'kids-unit-grad' | 'kids-unit-muted'
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
  const parsed = parseLessonBlock(block)
  if (!parsed) return null
  const { content } = parsed

  switch (content.kind) {
    case 'rich_text':
      return <RichText content={content} />
    case 'video':
      return <Video content={content} />
    case 'image':
      return <ImageView content={content} />
    case 'audio':
      return <Audio content={content} />
    case 'quiz':
      return (
        <div className="kids-unit-lime flex flex-col gap-3">
          <BlockChip icon={ListChecks} label="Responda" themeClass="kids-unit-lime" />
          <KidsQuiz blockId={block.id} content={content} quizState={block.quizState ?? null} />
        </div>
      )
    case 'embed':
      return <Embed content={content} />
    case 'ebook':
      return (
        <div className="flex flex-col gap-3">
          <BlockChip icon={BookOpenText} label="Leia o livro" themeClass="kids-unit-cyan" />
          <EbookBlockView blockId={block.id} content={content} />
        </div>
      )
    case 'certificate':
      return (
        <div className="kids-unit-lime flex flex-col gap-3">
          <BlockChip icon={Award} label="Conquiste" themeClass="kids-unit-lime" />
          <CertificateBlockView blockId={block.id} content={content} tone="kids" />
        </div>
      )
    case 'studio':
      return <StudioBlockKids block={block} content={content} />
    case 'pinta':
      return (
        <div className="kids-unit-grad flex flex-col gap-3">
          <BlockChip icon={Palette} label="Desenhe" themeClass="kids-unit-grad" />
          <PintaBlockView
            blockId={block.id}
            content={content}
            pintaState={block.pintaState ?? null}
          />
        </div>
      )
    case 'coming_soon':
      return <ComingSoon content={content} />
    default:
      return null
  }
}

/**
 * Bloco "em breve": a aula ainda está sendo montada pela professora. Quando ele
 * existe, é o ÚNICO bloco que chega à criança (o members segura os outros e os
 * anexos) e o "Concluir aula" fica desabilitado. Aqui é só o recado — o portão
 * de verdade é o backend.
 */
function ComingSoon({ content }: { content: ComingSoonBlock }) {
  return (
    <div className="kids-unit-muted flex flex-col gap-3">
      {/* Chip NEUTRO de propósito: `kids-unit-grad` é o gradiente de "Crie"/"Brinque"
          (os blocos mais empolgantes) e é o mesmo da pílula "AULA N DE M" logo acima —
          duas pílulas gêmeas na mesma dobra, com o visual de maior ênfase do sistema
          num estado em que não há nada a fazer. A moldura tracejada já diz "em obras". */}
      <BlockChip icon={Hammer} label="Em breve" themeClass="kids-unit-muted" />
      <div className="flex flex-col items-center gap-3 rounded-3xl border-(--unit) border-4 border-dashed bg-card px-6 py-10 text-center">
        <KidsMascot expression="thinking" className="size-20" />
        {/* O título precisa ser verdade mesmo quando a autora escreve o recado dela
            ("essa aula chega em setembro") — por isso não promete "quase pronta". */}
        <p className="sz-display text-lg">Essa aula ainda está sendo preparada</p>
        {/* Numa aula "em breve" este parágrafo é o CONTEÚDO INTEIRO da aula — não pode
            ficar tipografado como legenda secundária (`text-sm text-muted-foreground`). */}
        <p className="max-w-md text-base text-foreground">
          {content.message?.trim() ||
            'Estou terminando de montar tudo com muito carinho pra você. Volte daqui a pouquinho que ela vai estar te esperando! 🚀'}
        </p>
      </div>
    </div>
  )
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
        studioState={block.studioState ?? null}
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
  return (
    <VideoFrame>
      <LessonVideo content={content} />
    </VideoFrame>
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
        <img
          src={content.url}
          alt={content.alt ?? ''}
          width={4}
          height={3}
          className="size-full object-contain"
        />
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
