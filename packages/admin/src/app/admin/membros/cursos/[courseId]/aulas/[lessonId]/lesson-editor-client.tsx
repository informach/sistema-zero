'use client'

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import {
  type InteractiveBlock,
  isInteractiveBlock,
  type LessonDraftIssue,
} from '@sistemazero/core/learning'
import {
  createLessonAsset,
  PINTA_LESSON_ASSET_OPTIONS,
  PINTA_TOOL_PRESETS,
  type PintaAsset,
  type PintaLessonAssetKind,
  pintaAssetToWire,
  sanitizePintaAsset,
} from '@sistemazero/pinta/assets'
import type { PintaHandle } from '@sistemazero/pinta/lesson'
import {
  BLOCK_LEVEL_OPTIONS,
  type BlockLevel,
  CORE_CATEGORY_OPTIONS,
  type IDEMode,
  type LessonActivity,
  normalizeBlockLevel,
  type Project,
  type StudioHandle,
} from '@sistemazero/studio'
import { Button } from '@sistemazero/ui/button'
import { Card } from '@sistemazero/ui/card'
import { Dialog } from '@sistemazero/ui/dialog'
import { Input } from '@sistemazero/ui/input'
import { Field } from '@sistemazero/ui/label'
import { Select } from '@sistemazero/ui/select'
import { Spinner } from '@sistemazero/ui/spinner'
import { Textarea } from '@sistemazero/ui/textarea'
import { ArrowLeft, ChevronDown, ExternalLink, GripVertical, Pencil, Plus } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { AdminHeader } from '@/components/admin/admin-header'
import { useConfirm } from '@/components/admin/use-confirm'
import { useSortableItem } from '@/components/dnd/use-sortable-item'
import { HtmlCodeEditor } from '@/components/editor/html-code-editor'
import { EMPTY_LEARNING, LearningBuilder } from '@/components/editor/learning-builder'
import { LessonManifestImport } from '@/components/editor/lesson-manifest-import'
import { LessonStructureEditor } from '@/components/editor/lesson-structure-editor'
import { RichTextEditor } from '@/components/editor/rich-text-editor'
import { useLessonDraft } from '@/components/editor/use-lesson-draft'
import { AudioUploader } from '@/components/media/audio-uploader'
import { FileUploader, type UploadedFile } from '@/components/media/file-uploader'
import { ImageUploader } from '@/components/media/image-uploader'
import { VideoThumbnailUploader } from '@/components/media/video-thumbnail-uploader'
import { VideoUploader } from '@/components/media/video-uploader'
import { PintaEmbed } from '@/components/pinta/pinta-embed'
import { StudioBlocksPicker } from '@/components/studio/studio-blocks-picker'
import { StudioConfigClipboard } from '@/components/studio/studio-config-clipboard'
import { StudioEmbed } from '@/components/studio/studio-embed'
import { type ApiError, apiGet, apiSend } from '@/lib/api'
import {
  type AttachmentView,
  type BlockView,
  type CourseTreeView,
  LESSON_BLOCK_KINDS,
  type LessonBlockContent,
  type LessonBlockKind,
  type LessonContentView,
} from '@/lib/types'
import { ActivityBuilder, EMPTY_ACTIVITY, validateStudioActivity } from './activity-builder'
import { QuizBuilder, type QuizValue, validateQuiz } from './quiz-builder'

// `Record<LessonBlockKind, …>` (não `Record<string, …>`): assim o COMPILADOR cobra o
// rótulo de todo tipo novo. Sem isso o `<select>` mostraria o slug cru — e o editor é
// cheio de `default` silencioso (o `buildContent` grava QUIZ para kind sem case), então
// vale prender o que dá para prender em tempo de compilação.
const KIND_LABELS: Record<LessonBlockKind, string> = {
  interactive: 'Descoberta interativa',
  rich_text: 'Texto',
  video: 'Vídeo',
  image: 'Imagem',
  audio: 'Áudio',
  quiz: 'Quiz',
  embed: 'HTML livre (sem progresso)',
  ebook: 'E-book (livro 3D)',
  studio: 'Estúdio',
  pinta: 'Pinta (desenho)',
  certificate: 'Certificado',
  coming_soon: 'Em breve (aula em produção)',
}

/** `BlockView.kind` vem como `string` da API — bloco de um deploy mais novo cai no slug. */
const _kindLabel = (kind: string): string => (KIND_LABELS as Record<string, string>)[kind] ?? kind

// Largura do modal de bloco por tipo: só os que embutem editor PESADO fogem do `max-w-lg` padrão
// (o Estúdio = IDE blocos/código/preview; o quiz = editores de texto rico por pergunta/opção).
const BLOCK_DIALOG_WIDTH: Record<string, string> = {
  interactive: 'max-w-4xl',
  studio: 'max-w-7xl',
  pinta: 'max-w-7xl',
  quiz: 'max-w-4xl',
}

// Os 6 degraus (dificuldade × eixo 2D/3D) vêm do PACOTE (`BLOCK_LEVEL_OPTIONS`,
// fonte única com labels) — não há lista hardcoded p/ desatualizar. Valores
// LEGADOS de aulas antigas são normalizados no load (`normalizeBlockLevel`).
const STUDIO_LEVELS = BLOCK_LEVEL_OPTIONS
// Categorias "sempre visíveis" do Estúdio: vêm do PACOTE (`CORE_CATEGORY_OPTIONS`),
// derivadas das categorias reais do toolbox — não há mais lista hardcoded p/ desatualizar.
const STUDIO_MODES: { value: IDEMode; label: string }[] = [
  { value: 'blocks', label: 'Blocos' },
  { value: 'bridge', label: 'Ponte' },
  { value: 'code', label: 'Código' },
]

interface BlockForm {
  interactive: InteractiveBlock
  toolPurpose: 'experiment' | 'submission'
  kind: LessonBlockKind
  markdown: string
  html: string
  /** Embed URL do vídeo (preenchida pelo uploader Vimeo — sem campo manual). */
  src: string
  /** URL da imagem/áudio (preenchida pelos uploaders — sem campo manual). */
  url: string
  /**
   * Provider do vídeo — SEM UI (autoria v3 = Vimeo). Preservado na edição p/
   * não corromper blocos legados (youtube/file) ao salvar sem trocar o vídeo.
   */
  provider: string
  /** Duração (s) AUTO-detectada (Vimeo no vídeo; loadedmetadata no áudio). */
  durationSeconds: string
  alt: string
  caption: string
  quiz: QuizValue
  /** Legendas/transcrição do vídeo (preenchidas pelo uploader Vimeo). */
  captions: { lang: string; url: string }[]
  /** E-book: referência `r2priv:<key>` do PDF + título opcional. */
  pdfUrl: string
  title: string
  zappyStudentNotebook: boolean
  /** Estúdio: nível fixado (paleta por dificuldade). */
  studioLevel: BlockLevel
  /** Estúdio: categorias de blocos sempre visíveis. */
  studioCategories: string[]
  /** Estúdio: modos liberados ao aluno (vazio = todos os do tipo de projeto). */
  studioModes: IDEMode[]
  /** Estúdio: aluno pode revelar blocos avançados. */
  studioAllowReveal: boolean
  /**
   * Estúdio: allowlist de blocos por id — preenchida = o aluno vê SÓ estes (+ as Áreas do
   * projeto). UI no StudioBlocksPicker; reaproveitável pela área de transferência da config.
   */
  studioAllowBlocks: string[]
  /** Estúdio: atividade com auto-correção (fase 2). Vazia = bloco só de entrega. */
  studioActivity: LessonActivity
  /** Estúdio: nome do projeto contínuo (cadeia). Vazio = aula independente. */
  studioChain: string
  /** Estúdio: vitrine (Mural) — auto-publicar o projeto ao concluir esta aula. */
  studioShowcaseEnabled: boolean
  studioShowcaseTitle: string
  studioShowcaseSummary: string
  studioShowcaseCover: string
  /** Certificado: imagem base (por curso) + conteúdo desenhado por cima do PDF. */
  certBaseImageUrl: string
  certIntroLine: string
  certCoursePhrase: string
  certBodyText: string
  certSig1Url: string
  certSig1Name: string
  certSig2Url: string
  certSig2Name: string
  /** Em breve: recado que substitui o padrão do app. Vazio = usa o padrão. */
  comingSoonMessage: string
  /**
   * Pinta: tipo + tamanho do desenho INICIAL. Só valem na CRIAÇÃO do bloco — depois quem manda no
   * tamanho é o próprio editor embutido (a autora usa o botão "Tamanho" lá dentro), senão trocar o
   * select apagaria o desenho que ela acabou de fazer.
   */
  pintaAssetKind: PintaLessonAssetKind
  pintaSize: number
  /** Pinta: preset de ferramentas liberadas. `tudo` = a caixa inteira (nenhuma curadoria). */
  pintaToolPreset: 'essencial' | 'livre' | 'tudo'
  /** Pinta: nome do desenho contínuo (cadeia). Vazio = aula independente. */
  pintaChain: string
}

const EMPTY_BLOCK: BlockForm = {
  interactive: EMPTY_LEARNING,
  toolPurpose: 'submission',
  kind: 'rich_text',
  markdown: '',
  html: '',
  src: '',
  url: '',
  provider: 'vimeo',
  durationSeconds: '',
  alt: '',
  caption: '',
  quiz: { questions: [], passingScore: 70 },
  captions: [],
  pdfUrl: '',
  title: '',
  zappyStudentNotebook: false,
  studioLevel: 'iniciante-2d',
  studioCategories: [],
  // Default NOVO (24/07): o aluno vê SÓ Blocos; Ponte é opt-in do autor; Código é
  // automático do Pro (não é mais checkbox — bloco legado com 'code' preserva).
  studioModes: ['blocks'],
  // Default NOVO (08/08): DESMARCADO. A curadoria por nível é a promessa da aula
  // — se o autor escolheu "iniciante", deixar o aluno destravar tudo por um
  // botão esvazia a escolha sem que ninguém perceba. Quem quiser a escapatória
  // marca de propósito. ⚠️ Bloco JÁ SALVO sem o campo preserva o `true` de antes
  // (ver o `?? true` na hidratação): aula publicada não muda sozinha.
  studioAllowReveal: false,
  studioAllowBlocks: [],
  studioActivity: EMPTY_ACTIVITY,
  studioChain: '',
  studioShowcaseEnabled: false,
  studioShowcaseTitle: '',
  studioShowcaseSummary: '',
  studioShowcaseCover: '',
  certBaseImageUrl: '',
  certIntroLine: '',
  certCoursePhrase: '',
  certBodyText: '',
  certSig1Url: '',
  certSig1Name: '',
  certSig2Url: '',
  certSig2Name: '',
  comingSoonMessage: '',
  pintaAssetKind: 'pixel-sprite',
  pintaSize: 32,
  // Default "essencial": a tela da criança não pode nascer cheia (foi o pedido que originou a
  // curadoria). Quem quiser a caixa inteira escolhe "Tudo" de propósito.
  pintaToolPreset: 'essencial',
  pintaChain: '',
}

/**
 * Qual preset gerou esta lista? Compara por CONJUNTO (a ordem do preset não é contrato).
 * Lista que não bate com nenhum é tratada como "tudo" — o único caso hoje é um bloco salvo por
 * um deploy mais novo, e mostrar um preset errado seria pior do que mostrar o mais permissivo.
 */
function presetOfAllowTools(allow?: string[]): 'essencial' | 'livre' | 'tudo' {
  if (!allow || allow.length === 0) return 'tudo'
  // ⚠️ Compara CONJUNTOS (a ordem do preset não é contrato) e deduplica os dois lados: uma lista
  // com repetição vinda de jsonb editado à mão passaria por igual só pelo tamanho.
  const atual = new Set(allow)
  const same = (a: readonly string[]) => {
    const preset = new Set(a)
    return preset.size === atual.size && [...preset].every((id) => atual.has(id))
  }
  if (same(PINTA_TOOL_PRESETS.essencial)) return 'essencial'
  if (same(PINTA_TOOL_PRESETS.livre)) return 'livre'
  return 'tudo'
}

const num = (s: string): number | undefined => (s.trim() ? Number(s) : undefined)
const opt = (s: string): string | undefined => (s.trim() ? s.trim() : undefined)

/** Monta o conteúdo do bloco a partir do form. `studioProject` = snapshot do editor embutido. */
function buildContent(
  f: BlockForm,
  studioProject?: Project,
  previousContent?: LessonBlockContent,
  pintaAsset?: unknown,
): LessonBlockContent {
  const dur = num(f.durationSeconds)
  switch (f.kind) {
    case 'interactive':
      return f.interactive
    case 'studio': {
      // `studioProject` é garantido não-nulo no saveBlock (validação antes de chamar).
      // Atividade só entra se tiver checagens OU enunciado (atividade vazia = omitida).
      const hasActivity =
        f.studioActivity.checks.length > 0 || f.studioActivity.instructions.trim() !== ''
      // Projeto PRO: o modo Código é automático do kind — `allowedModes` é omitido
      // (redesenho 24/07; a curadoria de modos só vale no projeto de blocos).
      const isPro = (studioProject as Project & { kind?: string }).kind === 'pro'
      return {
        kind: 'studio',
        purpose: f.toolPurpose,
        initialProject: studioProject as Project,
        level: f.studioLevel,
        ...(f.studioCategories.length > 0 ? { allowCategories: f.studioCategories } : {}),
        ...(f.studioAllowBlocks.length > 0 ? { allowBlocks: f.studioAllowBlocks } : {}),
        ...(!isPro && f.studioModes.length > 0 && f.studioModes.length < STUDIO_MODES.length
          ? { allowedModes: f.studioModes }
          : {}),
        allowLevelReveal: f.studioAllowReveal,
        ...(hasActivity ? { activity: f.studioActivity } : {}),
        ...(f.studioChain.trim() ? { chain: f.studioChain.trim() } : {}),
        ...(f.studioShowcaseEnabled
          ? {
              showcase: {
                enabled: true,
                ...(f.studioShowcaseTitle.trim() ? { title: f.studioShowcaseTitle.trim() } : {}),
                ...(f.studioShowcaseSummary.trim()
                  ? { summary: f.studioShowcaseSummary.trim() }
                  : {}),
                ...(f.studioShowcaseCover.trim()
                  ? { defaultCoverUrl: f.studioShowcaseCover.trim() }
                  : {}),
              },
            }
          : {}),
      }
    }
    // ⚠️ O `default` deste switch cai em QUIZ — um kind sem `case` vira quiz em
    // silêncio (o TS não avisa). Todo tipo novo precisa do seu case aqui.
    case 'coming_soon':
      return {
        kind: 'coming_soon',
        ...(opt(f.comingSoonMessage) ? { message: f.comingSoonMessage.trim() } : {}),
      }
    case 'rich_text':
      return {
        kind: 'rich_text',
        ...(opt(f.markdown) ? { markdown: f.markdown } : {}),
        ...(opt(f.html) ? { html: f.html } : {}),
      }
    case 'video':
      return {
        kind: 'video',
        provider: f.provider as 'mux' | 'youtube' | 'vimeo' | 'file',
        src: f.src.trim(),
        ...(dur != null ? { durationSeconds: dur } : {}),
        ...(f.captions.length > 0 ? { captions: f.captions } : {}),
      }
    case 'image':
      return {
        kind: 'image',
        url: f.url.trim(),
        ...(opt(f.alt) ? { alt: f.alt } : {}),
        ...(opt(f.caption) ? { caption: f.caption } : {}),
      }
    case 'audio':
      return { kind: 'audio', url: f.url.trim(), ...(dur != null ? { durationSeconds: dur } : {}) }
    case 'embed':
      // Autoria v3: interativo = só HTML (sempre iframe sandbox 16:9 no aluno).
      return { kind: 'embed', html: f.html }
    case 'ebook':
      return {
        kind: 'ebook',
        url: f.pdfUrl.trim(),
        ...(opt(f.title) ? { title: f.title.trim() } : {}),
        ...(f.zappyStudentNotebook ? { zappyStudentNotebook: true } : {}),
      }
    case 'certificate': {
      const previousCertificate =
        previousContent?.kind === 'certificate' ? previousContent : undefined
      // Cada slot vira uma assinatura; slot totalmente vazio é descartado.
      const signatures = [
        { url: f.certSig1Url, name: f.certSig1Name },
        { url: f.certSig2Url, name: f.certSig2Name },
      ]
        .map((s) => ({
          ...(opt(s.url) ? { imageUrl: s.url.trim() } : {}),
          ...(opt(s.name) ? { name: s.name.trim() } : {}),
        }))
        .filter((s) => Object.keys(s).length > 0)
      return {
        kind: 'certificate',
        ...(opt(previousCertificate?.title ?? '') ? { title: previousCertificate?.title } : {}),
        ...(opt(previousCertificate?.issuerName ?? '')
          ? { issuerName: previousCertificate?.issuerName }
          : {}),
        ...(opt(previousCertificate?.signatureImageUrl ?? '')
          ? { signatureImageUrl: previousCertificate?.signatureImageUrl }
          : {}),
        ...(opt(previousCertificate?.logoUrl ?? '')
          ? { logoUrl: previousCertificate?.logoUrl }
          : {}),
        ...(opt(previousCertificate?.message ?? '')
          ? { message: previousCertificate?.message }
          : {}),
        ...(opt(f.certBaseImageUrl) ? { baseImageUrl: f.certBaseImageUrl.trim() } : {}),
        ...(opt(f.certIntroLine) ? { introLine: f.certIntroLine.trim() } : {}),
        ...(opt(f.certCoursePhrase) ? { coursePhrase: f.certCoursePhrase.trim() } : {}),
        ...(opt(f.certBodyText) ? { bodyText: f.certBodyText.trim() } : {}),
        ...(signatures.length > 0 ? { signatures } : {}),
      }
    }
    case 'pinta':
      return {
        kind: 'pinta',
        purpose: f.toolPurpose,
        // O desenho vem do editor embutido (o `saveBlock` já barrou o caso sem handle).
        initialAsset: pintaAsset,
        // "tudo" = SEM curadoria; o campo some do payload em vez de virar lista vazia (o
        // members trata ausente e vazia igual, mas gravar `[]` sugeriria uma escolha que
        // não foi feita).
        ...(f.pintaToolPreset === 'tudo'
          ? {}
          : { allowTools: [...PINTA_TOOL_PRESETS[f.pintaToolPreset]] }),
        ...(opt(f.pintaChain) ? { chain: f.pintaChain.trim() } : {}),
      }
    default:
      return {
        kind: 'quiz',
        questions: f.quiz.questions,
        ...(f.quiz.passingScore != null ? { passingScore: f.quiz.passingScore } : {}),
      }
  }
}

/** Campo obrigatório faltando → mensagem amigável (null = válido). */
function validateBlock(f: BlockForm): string | null {
  switch (f.kind) {
    case 'video':
      return f.src.trim() ? null : 'Envie o vídeo antes de publicar.'
    case 'image':
      return f.url.trim() ? null : 'Envie a imagem antes de publicar.'
    case 'audio':
      return f.url.trim() ? null : 'Envie o áudio antes de publicar.'
    case 'embed':
      return f.html.trim() ? null : 'Escreva o HTML do conteúdo interativo.'
    case 'ebook':
      return f.pdfUrl.trim() ? null : 'Envie o PDF do e-book antes de publicar.'
    case 'studio': {
      // O projeto inicial vem do editor embutido (validado no saveBlock). Aqui só
      // barramos "zero modos" — que, omitido no payload, viraria "todos liberados"
      // (o OPOSTO da intenção do autor; achado do review).
      if (f.studioModes.length === 0) return 'Selecione ao menos um modo do Estúdio.'
      // Atividade (auto-correção): coerência espelhando o members.
      return validateStudioActivity(f.studioActivity)
    }
    case 'certificate': {
      // A mensagem abaixo do nome (frase e/ou parágrafo) é OBRIGATÓRIA — é o que descreve a
      // conquista no certificado (decisão da usuária 26/06).
      if (!f.certCoursePhrase.trim() && !f.certBodyText.trim())
        return 'Escreva a mensagem que aparece abaixo do nome do aluno (frase e/ou parágrafo).'
      // URLs http(s) (a imagem base do admin é WebP no R2; assinaturas idem).
      for (const url of [f.certBaseImageUrl, f.certSig1Url, f.certSig2Url]) {
        if (url.trim() && !/^https?:\/\//i.test(url.trim()))
          return 'A imagem base e as assinaturas precisam ser URLs http(s).'
      }
      return null
    }
    default:
      return null
  }
}

export function LessonEditorClient({
  courseId,
  lessonId,
  currentRole,
  authorId,
  studentAppUrls,
}: {
  courseId: string
  lessonId: string
  currentRole: string
  authorId: string
  /** URLs públicas dos apps de aluno ("Ver como aluno") — ausentes → botão oculto. */
  studentAppUrls?: { adult?: string; kids?: string }
}) {
  const canWrite = currentRole === 'superadmin' || currentRole === 'admin'
  const draftState = useLessonDraft(lessonId, authorId)
  const { session, draft } = draftState
  const loading = draftState.status === 'loading'
  const [preview, setPreview] = useState(false)
  const [issues, setIssues] = useState<LessonDraftIssue[]>([])
  const [blockId, setBlockId] = useState('')
  const [blockSectionId, setBlockSectionId] = useState<string | null>(null)
  const [attachmentId, setAttachmentId] = useState('')
  const [editorVersion, setEditorVersion] = useState(0)
  const lesson = useMemo<LessonContentView | null>(
    () =>
      draft
        ? {
            id: lessonId,
            courseId,
            moduleId: '',
            sortOrder: 0,
            isPublished: draft.isPublished,
            title: draft.document.title,
            slug: draft.document.slug,
            estimatedMinutes: draft.document.estimatedMinutes,
            blocks: draft.document.blocks.map((b, sortOrder) => ({
              ...b,
              kind: b.content.kind,
              lessonId,
              sortOrder,
              blockRevision: b.id.replaceAll('-', ''),
            })),
            attachments: draft.document.attachments.map((a, sortOrder) => ({
              ...a,
              lessonId,
              sortOrder,
            })),
          }
        : null,
    [draft, lessonId, courseId],
  )
  /** Slug/audience/status do curso + publicação DESTA aula (p/ o "Ver como aluno"). */
  const [courseInfo, setCourseInfo] = useState<{
    slug: string
    audience: 'adult' | 'kids'
    status: string
    lessonPublished: boolean
  } | null>(null)
  const [busy, setBusy] = useState(false)
  const { confirm, confirmDialog } = useConfirm()

  const [blockOpen, setBlockOpen] = useState(false)
  const [editingBlock, setEditingBlock] = useState<BlockView | null>(null)
  const [blockForm, setBlockForm] = useState<BlockForm>(EMPTY_BLOCK)
  // Tipo de atividade do bloco Estúdio (redesenho 24/07): controla o segmented do
  // TOPO do form e o que aparece (Pro esconde a curadoria de blocos). NÃO entra no
  // payload — o kind REAL vive no projeto (o embed sincroniza via onKindResolved).
  const [studioKind, setStudioKind] = useState<'blocks' | 'pro'>('blocks')
  // "Configurações avançadas" colapsada (abre sozinha na edição fora do default).
  const [advancedOpen, setAdvancedOpen] = useState(false)
  // Handle do Estúdio embutido na autoria — lido no saveBlock (snapshot do projeto inicial).
  const studioHandleRef = useRef<StudioHandle | null>(null)
  // Handle do Pinta embutido — lido no saveBlock (snapshot do desenho inicial).
  const pintaHandleRef = useRef<PintaHandle | null>(null)
  /**
   * O desenho que o embed do Pinta abre. Fixado por `useMemo` na CRIAÇÃO (tipo+tamanho) e vindo do
   * bloco na edição. ⚠️ Trocar o tipo/tamanho recria o desenho — por isso os selects só aparecem
   * em bloco NOVO, antes de haver traço para perder.
   */
  const pintaSeed = useMemo<PintaAsset | null>(() => {
    if (editingBlock?.content.kind === 'pinta') {
      // Vem do jsonb: sanea na borda. Malformado → o embed não monta e o save avisa, em vez de
      // abrir um editor com um desenho que sumiria no próximo load.
      return sanitizePintaAsset(editingBlock.content.initialAsset)
    }
    return createLessonAsset(blockForm.pintaAssetKind, blockForm.pintaSize)
  }, [editingBlock, blockForm.pintaAssetKind, blockForm.pintaSize])
  // Bloco cujas ENTREGAS o professor está acompanhando (dialog separado).

  const [attOpen, setAttOpen] = useState(false)
  const [editingAtt, setEditingAtt] = useState<AttachmentView | null>(null)
  const [attForm, setAttForm] = useState({ label: '', url: '', fileType: '', sizeBytes: '' })

  // Arrastar só após 5px (deixa o clique nos botões do card livre).
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const load = useCallback(async () => {
    await session.load()
    // "Ver como aluno": a árvore traz slug/audience/status + a publicação da aula
    // (o LessonContentView não os carrega). Best-effort — sem ela o botão só some.
    try {
      const tree = await apiGet<CourseTreeView>(`/api/members/courses/${courseId}`)
      const treeLesson = tree.modules.flatMap((m) => m.lessons).find((l) => l.id === lessonId)
      setCourseInfo({
        slug: tree.slug,
        audience: (tree.audience ?? 'adult') as 'adult' | 'kids',
        status: tree.status,
        lessonPublished: treeLesson?.isPublished ?? false,
      })
    } catch {
      setCourseInfo(null)
    }
  }, [lessonId, courseId, session])

  useEffect(() => {
    let active = true
    void apiGet<CourseTreeView>(`/api/members/courses/${courseId}`)
      .then((tree) => {
        if (!active) return
        const treeLesson = tree.modules.flatMap((m) => m.lessons).find((l) => l.id === lessonId)
        setCourseInfo({
          slug: tree.slug,
          audience: tree.audience === 'kids' ? 'kids' : 'adult',
          status: tree.status,
          lessonPublished: treeLesson?.isPublished ?? false,
        })
      })
      .catch((error) => {
        if (active) toast.error(error.message ?? 'Não foi possível carregar o curso.')
      })
    return () => {
      active = false
    }
  }, [lessonId, courseId])

  // ── Blocos ──
  function openCreateBlock(sectionId: string | null) {
    setBlockId(crypto.randomUUID())
    setBlockSectionId(sectionId)
    setEditingBlock(null)
    setBlockForm(EMPTY_BLOCK)
    setStudioKind('blocks')
    setAdvancedOpen(false)
    setBlockOpen(true)
  }
  function openEditBlock(b: BlockView) {
    setBlockId(b.id)
    setBlockSectionId(draft?.document.sections.find((s) => s.blockIds.includes(b.id))?.id ?? null)
    setEditingBlock(b)
    const c = b.content
    setBlockForm({
      ...EMPTY_BLOCK,
      kind: c.kind,
      interactive: c.kind === 'interactive' ? c : EMPTY_LEARNING,
      toolPurpose:
        c.kind === 'studio' || c.kind === 'pinta' ? (c.purpose ?? 'submission') : 'submission',
      markdown: c.kind === 'rich_text' ? (c.markdown ?? '') : '',
      html: c.kind === 'rich_text' ? (c.html ?? '') : c.kind === 'embed' ? (c.html ?? '') : '',
      src: c.kind === 'video' ? c.src : '',
      url: c.kind === 'image' || c.kind === 'audio' ? c.url : '',
      // Preserva o provider legado (youtube/file) — salvar sem trocar o vídeo não corrompe.
      provider: c.kind === 'video' ? c.provider : 'vimeo',
      durationSeconds:
        (c.kind === 'video' || c.kind === 'audio') && c.durationSeconds != null
          ? String(c.durationSeconds)
          : '',
      alt: c.kind === 'image' ? (c.alt ?? '') : '',
      caption: c.kind === 'image' ? (c.caption ?? '') : '',
      quiz:
        c.kind === 'quiz'
          ? { questions: c.questions, passingScore: c.passingScore }
          : EMPTY_BLOCK.quiz,
      captions: c.kind === 'video' ? (c.captions ?? []) : [],
      pdfUrl: c.kind === 'ebook' ? c.url : '',
      title: c.kind === 'ebook' ? (c.title ?? '') : '',
      zappyStudentNotebook: c.kind === 'ebook' ? (c.zappyStudentNotebook ?? false) : false,
      // Aula salva antes da reforma 2D/3D guarda o valor LEGADO → normaliza.
      studioLevel:
        c.kind === 'studio' ? (normalizeBlockLevel(c.level) ?? 'iniciante-2d') : 'iniciante-2d',
      studioCategories: c.kind === 'studio' ? (c.allowCategories ?? []) : [],
      // Legado SEM allowedModes = os 3 modos liberados (preserva na edição — só o
      // bloco NOVO nasce com o default enxuto ['blocks']).
      studioModes:
        c.kind === 'studio' ? (c.allowedModes ?? ['blocks', 'bridge', 'code']) : ['blocks'],
      studioAllowReveal: c.kind === 'studio' ? (c.allowLevelReveal ?? true) : true,
      studioAllowBlocks: c.kind === 'studio' ? (c.allowBlocks ?? []) : [],
      studioActivity: c.kind === 'studio' ? (c.activity ?? EMPTY_ACTIVITY) : EMPTY_ACTIVITY,
      studioChain: c.kind === 'studio' ? (c.chain ?? '') : '',
      studioShowcaseEnabled: c.kind === 'studio' ? (c.showcase?.enabled ?? false) : false,
      studioShowcaseTitle: c.kind === 'studio' ? (c.showcase?.title ?? '') : '',
      studioShowcaseSummary: c.kind === 'studio' ? (c.showcase?.summary ?? '') : '',
      studioShowcaseCover: c.kind === 'studio' ? (c.showcase?.defaultCoverUrl ?? '') : '',
      certBaseImageUrl: c.kind === 'certificate' ? (c.baseImageUrl ?? '') : '',
      certIntroLine: c.kind === 'certificate' ? (c.introLine ?? '') : '',
      certCoursePhrase: c.kind === 'certificate' ? (c.coursePhrase ?? '') : '',
      certBodyText: c.kind === 'certificate' ? (c.bodyText ?? '') : '',
      certSig1Url: c.kind === 'certificate' ? (c.signatures?.[0]?.imageUrl ?? '') : '',
      certSig1Name: c.kind === 'certificate' ? (c.signatures?.[0]?.name ?? '') : '',
      certSig2Url: c.kind === 'certificate' ? (c.signatures?.[1]?.imageUrl ?? '') : '',
      certSig2Name: c.kind === 'certificate' ? (c.signatures?.[1]?.name ?? '') : '',
      comingSoonMessage: c.kind === 'coming_soon' ? (c.message ?? '') : '',
      // Tipo/tamanho não são re-hidratados: na EDIÇÃO quem manda é o desenho salvo (o editor
      // abre com ele e o botão "Tamanho" dele resolve o resto). Os selects ficam escondidos.
      pintaAssetKind: EMPTY_BLOCK.pintaAssetKind,
      pintaSize: EMPTY_BLOCK.pintaSize,
      pintaToolPreset: c.kind === 'pinta' ? presetOfAllowTools(c.allowTools) : 'essencial',
      pintaChain: c.kind === 'pinta' ? (c.chain ?? '') : '',
    })
    if (c.kind === 'studio') {
      const projectKind = (c.initialProject as { kind?: string } | undefined)?.kind
      setStudioKind(projectKind === 'pro' ? 'pro' : 'blocks')
      // "Configurações avançadas" abre sozinha quando algum campo está fora do
      // default — senão o autor editaria sem ver a curadoria custom que existe.
      const modes = c.allowedModes ?? ['blocks', 'bridge', 'code']
      const modesDefault = modes.length === 1 && modes[0] === 'blocks'
      const activity = c.activity ?? EMPTY_ACTIVITY
      setAdvancedOpen(
        (normalizeBlockLevel(c.level) ?? 'iniciante-2d') !== 'iniciante-2d' ||
          !modesDefault ||
          (c.allowCategories ?? []).length > 0 ||
          // ⚠️ Desde 08/08 o default é NÃO revelar, então quem foge do padrão é
          // quem PERMITE. Bloco legado sem o campo valia `true` e também foge —
          // deixar a condição antiga aqui abriria a seção em todo bloco novo e a
          // esconderia justamente nas aulas que liberam o destravamento.
          (c.allowLevelReveal ?? true) === true ||
          activity.checks.length > 0 ||
          activity.instructions.trim() !== '' ||
          Boolean(c.showcase?.title || c.showcase?.summary || c.showcase?.defaultCoverUrl),
      )
    } else {
      setStudioKind('blocks')
      setAdvancedOpen(false)
    }
    setBlockOpen(true)
  }
  const captureBlock = useCallback(
    (immediate = false) => {
      if (!blockId || !blockOpen) return
      const project = studioHandleRef.current?.getProject() ?? undefined
      if (blockForm.kind === 'studio' && !project) return
      const asset =
        blockForm.kind === 'pinta' ? (pintaHandleRef.current?.getAsset() ?? pintaSeed) : null
      const content = buildContent(
        blockForm,
        project,
        editingBlock?.content,
        asset ? pintaAssetToWire(asset) : undefined,
      )
      session.enqueue(
        { type: 'block', block: { id: blockId, content }, sectionId: blockSectionId },
        immediate,
      )
      if (content.kind === 'video' && content.provider === 'vimeo') {
        const current = session.getSnapshot().draft
        const plan = current?.document.plannedVideos.find((v) => v.blockId === blockId)
        const videoId = content.src.match(/vimeo\.com\/(?:video\/)?(\d{6,12})/)?.[1] ?? null
        if (current && (!plan || plan.videoId !== videoId))
          session.enqueue(
            {
              type: 'planned-videos',
              plannedVideos: plan
                ? current.document.plannedVideos.map((v) =>
                    v.blockId === blockId ? { ...v, videoId } : v,
                  )
                : [
                    ...current.document.plannedVideos,
                    { blockId, instructions: 'Vídeo desta seção', videoId },
                  ],
            },
            immediate,
          )
      }
    },
    [blockId, blockOpen, blockForm, editingBlock, pintaSeed, session, blockSectionId],
  )
  useEffect(() => {
    void editorVersion
    captureBlock()
  }, [captureBlock, editorVersion])

  async function captureEditors() {
    if (blockOpen && blockForm.kind === 'studio') await studioHandleRef.current?.save()
    if (
      blockOpen &&
      blockForm.kind === 'pinta' &&
      pintaHandleRef.current &&
      !(await pintaHandleRef.current.save())
    )
      throw new Error('Não foi possível capturar os últimos traços do Pinta.')
    captureBlock(true)
  }
  async function closeBlock() {
    try {
      await captureEditors()
      setBlockOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível capturar o projeto.')
    }
  }
  async function beforePublish() {
    await captureEditors()
    await session.flush()
  }
  const publication = useRef<{ expectedRevision: string; operationId: string } | null>(null)
  async function publish() {
    setBusy(true)
    setIssues([])
    try {
      await beforePublish()
      const current = session.getSnapshot().draft
      if (!current) return
      const retry = publication.current?.expectedRevision === current.revision
      const command =
        retry && publication.current
          ? publication.current
          : { expectedRevision: current.revision, operationId: crypto.randomUUID() }
      const found = retry
        ? []
        : await apiSend<LessonDraftIssue[]>(
            `/api/members/lessons/${lessonId}/draft/validate`,
            'POST',
            command,
          )
      setIssues(found)
      if (found.length) {
        toast.error('Confira as pendências indicadas nos blocos antes de publicar.')
        return
      }
      publication.current = command
      await apiSend(`/api/members/lessons/${lessonId}/draft/publish`, 'POST', command)
      publication.current = null
      await load()
      toast.success('Aula publicada. A base do Zappy será atualizada com esta versão.')
    } catch (error) {
      toast.error((error as ApiError).message ?? 'Não foi possível publicar.')
    } finally {
      setBusy(false)
    }
  }
  function deleteBlock(b: BlockView) {
    confirm({
      title: 'Retirar bloco do percurso',
      message:
        'O bloco será retirado ao publicar. Os envios e o histórico dos alunos serão preservados.',
      confirmText: 'Retirar bloco',
      confirmVariant: 'destructive',
      onConfirm: async () => {
        session.enqueue({ type: 'remove-block', blockId: b.id }, true)
      },
    })
  }
  function handleAttachmentDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!lesson || !over || active.id === over.id) return
    const from = lesson.attachments.findIndex((a) => a.id === active.id)
    const to = lesson.attachments.findIndex((a) => a.id === over.id)
    if (from < 0 || to < 0) return
    session.enqueue(
      { type: 'attachments', attachments: arrayMove(lesson.attachments, from, to) },
      true,
    )
  }

  // ── Anexos ──
  function openCreateAtt() {
    setAttachmentId(crypto.randomUUID())
    setEditingAtt(null)
    setAttForm({ label: '', url: '', fileType: '', sizeBytes: '' })
    setAttOpen(true)
  }
  function openEditAtt(a: AttachmentView) {
    setAttachmentId(a.id)
    setEditingAtt(a)
    setAttForm({
      label: a.label,
      url: a.url,
      fileType: a.fileType ?? '',
      sizeBytes: a.sizeBytes == null ? '' : String(a.sizeBytes),
    })
    setAttOpen(true)
  }
  useEffect(() => {
    if (!attOpen || !attachmentId) return
    const current = session.getSnapshot().draft
    if (!current) return
    const attachment = {
      id: attachmentId,
      label: attForm.label,
      url: attForm.url,
      fileType: attForm.fileType || null,
      sizeBytes: attForm.sizeBytes ? Number(attForm.sizeBytes) : null,
    }
    const attachments = current.document.attachments.some((a) => a.id === attachmentId)
      ? current.document.attachments.map((a) => (a.id === attachmentId ? attachment : a))
      : [...current.document.attachments, attachment]
    session.enqueue({ type: 'attachments', attachments })
  }, [attForm, attachmentId, attOpen, session])
  function deleteAtt(a: AttachmentView) {
    const current = session.getSnapshot().draft
    if (current)
      session.enqueue(
        {
          type: 'attachments',
          attachments: current.document.attachments.filter((item) => item.id !== a.id),
        },
        true,
      )
  }

  /**
   * E-book: além do bloco (livro 3D), o PDF entra nos materiais da aula p/ download.
   * Trocar o PDF ATUALIZA o anexo do PDF anterior in-place (`previousUrl` — preserva a
   * posição na lista e não deixa material órfão). Edge-cases aceitos: casar por URL
   * pode sobrescrever um rótulo editado à mão (é o anexo daquele PDF); o OBJETO antigo
   * no R2 fica (lixo de storage é dívida documentada da fatia de mídia).
   */
  async function addEbookAttachment(file: UploadedFile, previousUrl?: string) {
    if (lesson?.attachments.some((a) => a.url === file.url)) return
    const payload = {
      label: file.filename.replace(/\.pdf$/i, ''),
      url: file.url,
      fileType: file.fileType || 'pdf',
      sizeBytes: file.sizeBytes ?? null,
    }
    const previous =
      previousUrl && previousUrl !== file.url
        ? lesson?.attachments.find((a) => a.url === previousUrl)
        : undefined
    const current = session.getSnapshot().draft
    if (!current) return
    const attachment = { id: previous?.id ?? crypto.randomUUID(), ...payload }
    session.enqueue(
      {
        type: 'attachments',
        attachments: previous
          ? current.document.attachments.map((a) => (a.id === previous.id ? attachment : a))
          : [...current.document.attachments, attachment],
      },
      true,
    )
  }

  return (
    <div className="space-y-6">
      {confirmDialog}
      <Link
        href={`/admin/membros/cursos/${courseId}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Conteúdo do curso
      </Link>

      <AdminHeader
        title={lesson?.title ?? 'Aula'}
        description={lesson ? lesson.slug : lessonId}
        action={
          <div className="flex flex-wrap gap-2">
            {(() => {
              // "Ver como aluno": abre a aula no app do aluno (pela audience) com a
              // PRÓPRIA conta de equipe (passe livre). Rascunho → 404 na visão do
              // aluno (o filtro roda antes do bypass), por isso só habilita publicado.
              if (!courseInfo) return null
              const base =
                courseInfo.audience === 'kids' ? studentAppUrls?.kids : studentAppUrls?.adult
              if (!base) return null
              const publishedBoth = courseInfo.status === 'published' && courseInfo.lessonPublished
              const url = `${base.replace(/\/+$/, '')}/cursos/${encodeURIComponent(courseInfo.slug)}/aulas/${encodeURIComponent(lessonId)}`
              return (
                <Button
                  variant="outline"
                  disabled={!publishedBoth}
                  title={
                    publishedBoth
                      ? 'Você verá com o passe da equipe — travas e gamificação de um aluno real não são simuladas.'
                      : 'Publique a aula (e o curso) para vê-la como aluno — rascunho dá 404 na visão do aluno.'
                  }
                  onClick={() => window.open(url, '_blank', 'noopener')}
                >
                  <ExternalLink className="size-4" /> Ver aula publicada
                </Button>
              )
            })()}
            {canWrite && draft?.isPublished && (
              <Button
                variant="outline"
                disabled={busy}
                onClick={() =>
                  confirm({
                    title: 'Despublicar aula',
                    message:
                      'A aula deixará de aparecer para os alunos. O conteúdo e o histórico serão preservados.',
                    confirmText: 'Despublicar',
                    onConfirm: async () => {
                      await beforePublish()
                      const current = session.getSnapshot().draft
                      if (!current) return
                      await apiSend(`/api/members/lessons/${lessonId}/draft/unpublish`, 'POST', {
                        expectedRevision: current.revision,
                        operationId: crypto.randomUUID(),
                        readyVideoIds: [],
                      })
                      await load()
                    },
                  })
                }
              >
                Despublicar aula
              </Button>
            )}
            {canWrite ? (
              <Button
                onClick={() => void publish()}
                disabled={busy || loading || draftState.status === 'conflict'}
              >
                {busy ? <Spinner /> : null}Publicar aula
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
        <p role="status" className="text-sm">
          {draftState.status === 'saved'
            ? 'Rascunho salvo'
            : draftState.status === 'saving'
              ? 'Salvando…'
              : draftState.status === 'loading'
                ? 'Carregando rascunho…'
                : draftState.error}
        </p>
        {draftState.status === 'error' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void (draft ? session.flush() : session.load()).catch((error) =>
                toast.error(error.message),
              )
            }}
          >
            Tentar novamente
          </Button>
        )}
      </div>
      {draftState.status === 'conflict' && (
        <div
          role="alert"
          className="space-y-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4"
        >
          <p>Há uma versão diferente no servidor. Sua edição local foi preservada.</p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => {
                const blob = new Blob([JSON.stringify(draftState.recovery, null, 2)], {
                  type: 'application/json',
                })
                const url = URL.createObjectURL(blob)
                const link = window.document.createElement('a')
                link.href = url
                link.download = `aula-${lessonId}-copia-local.json`
                link.click()
                URL.revokeObjectURL(url)
              }}
            >
              Baixar minha cópia local
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                void session.restoreServerVersion().catch((error) => toast.error(error.message))
              }}
            >
              Abrir versão do servidor e arquivar cópia local
            </Button>
          </div>
          <details>
            <summary className="cursor-pointer text-sm">Comparar minha cópia local</summary>
            <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap text-xs">
              {JSON.stringify(draftState.recovery?.document, null, 2)}
            </pre>
          </details>
        </div>
      )}
      {draft && (
        <details className="rounded-xl border border-border bg-card p-4">
          <summary className="cursor-pointer font-medium">Dados da aula</summary>
          <fieldset
            disabled={!canWrite || busy || draftState.status === 'conflict'}
            className="mt-4 grid gap-4 sm:grid-cols-2"
          >
            <Field label="Título">
              <Input
                value={draft.document.title}
                maxLength={200}
                onChange={(e) =>
                  session.enqueue({
                    type: 'metadata',
                    title: e.target.value,
                    slug: draft.document.slug,
                    estimatedMinutes: draft.document.estimatedMinutes,
                  })
                }
              />
            </Field>
            <Field label="Slug">
              <Input
                value={draft.document.slug}
                maxLength={200}
                onChange={(e) =>
                  session.enqueue({
                    type: 'metadata',
                    title: draft.document.title,
                    slug: e.target.value,
                    estimatedMinutes: draft.document.estimatedMinutes,
                  })
                }
              />
            </Field>
            <Field label="Duração estimada (minutos)">
              <Input
                type="number"
                min={0}
                max={10000}
                value={draft.document.estimatedMinutes ?? ''}
                onChange={(e) =>
                  session.enqueue({
                    type: 'metadata',
                    title: draft.document.title,
                    slug: draft.document.slug,
                    estimatedMinutes: e.target.value ? Number(e.target.value) : null,
                  })
                }
              />
            </Field>
          </fieldset>
        </details>
      )}
      {issues
        .filter((issue) => !issue.blockId)
        .map((issue) => (
          <p key={issue.message} role="alert" className="text-sm text-destructive">
            {issue.message}
          </p>
        ))}
      {loading ? (
        <Card className="py-10 text-center text-muted-foreground">
          <Spinner className="mx-auto" />
        </Card>
      ) : !lesson ? (
        <Card className="py-10 text-center text-muted-foreground">Aula não encontrada.</Card>
      ) : (
        <>
          {canWrite && courseInfo && (
            <LessonManifestImport
              lessonId={lessonId}
              lessonSlug={lesson.slug}
              courseSlug={courseInfo.slug}
              disabled={busy || draftState.status === 'conflict'}
              beforeImport={beforePublish}
              onImported={load}
            />
          )}
          {draft && (
            <LessonStructureEditor
              editingBlockId={blockOpen ? blockId : undefined}
              lesson={lesson}
              document={draft.document}
              canWrite={canWrite && !busy && draftState.status !== 'conflict'}
              onChange={(change, immediate) => session.enqueue(change, immediate)}
              onAddBlock={openCreateBlock}
              onEditBlock={openEditBlock}
              onRemoveBlock={deleteBlock}
              issues={issues}
              preview={preview}
              onPreviewChange={(value) => {
                void captureEditors()
                  .then(() => setPreview(value))
                  .catch((error) => toast.error(error.message))
              }}
            />
          )}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground">Anexos</h3>
              {canWrite ? (
                <Button variant="outline" size="sm" onClick={openCreateAtt}>
                  <Plus className="size-4" /> Adicionar anexo
                </Button>
              ) : null}
            </div>
            {lesson.attachments.length === 0 ? (
              <Card className="py-6 text-center text-sm text-muted-foreground">Nenhum anexo.</Card>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleAttachmentDragEnd}
              >
                <SortableContext
                  items={lesson.attachments.map((a) => a.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {lesson.attachments.map((a) => (
                    <SortableAttachmentItem
                      key={a.id}
                      attachment={a}
                      canWrite={canWrite}
                      onEdit={() => openEditAtt(a)}
                      onDelete={() => deleteAtt(a)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            )}
          </div>
        </>
      )}

      <Dialog
        open={blockOpen}
        onClose={() => void closeBlock()}
        title={editingBlock ? 'Editar bloco' : 'Adicionar bloco'}
        // Estúdio (IDE) e quiz (editores de texto rico) precisam de mais largura que os blocos
        // simples (texto/imagem/etc.), que seguem no `max-w-lg` padrão do Dialog.
        className={BLOCK_DIALOG_WIDTH[blockForm.kind]}
        footer={
          <Button variant="outline" onClick={() => void closeBlock()}>
            Fechar
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          {(validateBlock(blockForm) ||
            (blockForm.kind === 'interactive' && !isInteractiveBlock(blockForm.interactive)) ||
            (blockForm.kind === 'quiz' && validateQuiz(blockForm.quiz))) && (
            <p className="text-sm text-muted-foreground">
              {validateBlock(blockForm) ??
                (blockForm.kind === 'quiz'
                  ? validateQuiz(blockForm.quiz)
                  : 'Complete os campos da descoberta antes de publicar.')}
            </p>
          )}
          <Field label="Tipo" htmlFor="bkind">
            <Select
              id="bkind"
              value={blockForm.kind}
              disabled={!!editingBlock}
              onChange={(e) =>
                setBlockForm((f) => ({ ...f, kind: e.target.value as LessonBlockKind }))
              }
            >
              {LESSON_BLOCK_KINDS.map((k) => (
                <option key={k} value={k}>
                  {KIND_LABELS[k]}
                </option>
              ))}
            </Select>
          </Field>

          {blockForm.kind === 'interactive' && (
            <LearningBuilder
              value={blockForm.interactive}
              onChange={(interactive) => setBlockForm((form) => ({ ...form, interactive }))}
            />
          )}
          {(blockForm.kind === 'studio' || blockForm.kind === 'pinta') && (
            <Field label="Papel desta ferramenta" htmlFor="tool-purpose">
              <Select
                id="tool-purpose"
                value={blockForm.toolPurpose}
                onChange={(e) =>
                  setBlockForm((form) => ({
                    ...form,
                    toolPurpose: e.target.value === 'experiment' ? 'experiment' : 'submission',
                  }))
                }
              >
                <option value="submission">Criação com entrega ao professor</option>
                <option value="experiment">Experimento independente, sem entrega</option>
              </Select>
            </Field>
          )}
          {blockForm.kind === 'rich_text' ? (
            <Field label="Conteúdo" hint="Salvo como markdown — renderiza igual na área do aluno.">
              <RichTextEditor
                content={blockForm.markdown}
                onChange={(markdown) => setBlockForm((f) => ({ ...f, markdown }))}
              />
            </Field>
          ) : null}

          {blockForm.kind === 'coming_soon' ? (
            <>
              <p className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
                Enquanto este bloco estiver aqui, o aluno vê <strong>só este recado</strong>. Os
                outros blocos e os anexos da aula ficam escondidos e ele não consegue concluí-la.
                Com a trava sequencial ligada,{' '}
                <strong>as aulas seguintes também ficam bloqueadas</strong> até você tirar o bloco.
                Você continua vendo a aula inteira, inclusive no “Ver como aluno”. Terminou de
                montar? Apague o bloco e a aula volta ao normal.
              </p>
              <Field
                label="Recado (opcional)"
                hint="Em branco usa o recado padrão de cada plataforma (o do kids é escrito para crianças)."
              >
                <Textarea
                  value={blockForm.comingSoonMessage}
                  maxLength={500}
                  placeholder="Ex.: esta aula chega na semana que vem."
                  onChange={(e) =>
                    setBlockForm((f) => ({ ...f, comingSoonMessage: e.target.value }))
                  }
                />
              </Field>
            </>
          ) : null}

          {blockForm.kind === 'video' ? (
            <>
              <Field
                label="Vídeo (Vimeo)"
                hint="Sobe direto pro Vimeo (resumável); duração e transcrição entram sozinhas."
              >
                <VideoUploader
                  currentSrc={blockForm.src || undefined}
                  onReady={(v) =>
                    setBlockForm((f) => ({
                      ...f,
                      provider: 'vimeo',
                      src: v.embedUrl,
                      durationSeconds:
                        v.durationSeconds != null ? String(v.durationSeconds) : f.durationSeconds,
                      captions: v.captions.length > 0 ? v.captions : f.captions,
                    }))
                  }
                />
              </Field>
              {/vimeo\.com\/(?:video\/)?\d{6,12}/.test(blockForm.src) ? (
                <Field
                  label="Capa do vídeo"
                  hint="Envia direto pro Vimeo (o player usa essa capa)."
                >
                  <VideoThumbnailUploader
                    videoId={
                      blockForm.src.match(/vimeo\.com\/(?:video\/)?(\d{6,12})/)?.[1] as string
                    }
                  />
                </Field>
              ) : null}
              {blockForm.durationSeconds || blockForm.captions.length > 0 ? (
                <p className="text-xs text-muted-foreground">
                  {blockForm.durationSeconds
                    ? `Duração: ${blockForm.durationSeconds}s (automática do Vimeo)`
                    : null}
                  {blockForm.durationSeconds && blockForm.captions.length > 0 ? ' · ' : null}
                  {blockForm.captions.length > 0
                    ? `Transcrição: ${blockForm.captions.map((c) => c.lang).join(', ')}`
                    : null}
                </p>
              ) : null}
            </>
          ) : null}

          {blockForm.kind === 'image' ? (
            <>
              <Field label="Imagem" hint="Otimizada (WebP) e hospedada no R2 automaticamente.">
                <ImageUploader
                  scope="block"
                  allowManualUrl={false}
                  value={blockForm.url}
                  onChange={(url) => setBlockForm((f) => ({ ...f, url }))}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Texto alternativo" htmlFor="balt" hint="Opcional.">
                  <Input
                    id="balt"
                    value={blockForm.alt}
                    onChange={(e) => setBlockForm((f) => ({ ...f, alt: e.target.value }))}
                  />
                </Field>
                <Field label="Legenda" htmlFor="bcap" hint="Opcional.">
                  <Input
                    id="bcap"
                    value={blockForm.caption}
                    onChange={(e) => setBlockForm((f) => ({ ...f, caption: e.target.value }))}
                  />
                </Field>
              </div>
            </>
          ) : null}

          {blockForm.kind === 'audio' ? (
            <>
              <Field label="Áudio" hint="Hospedado no R2; a duração é detectada do arquivo.">
                <AudioUploader
                  value={blockForm.url || undefined}
                  onUploaded={({ url, durationSeconds }) =>
                    setBlockForm((f) => ({
                      ...f,
                      url,
                      durationSeconds:
                        durationSeconds != null ? String(durationSeconds) : f.durationSeconds,
                    }))
                  }
                />
              </Field>
              {blockForm.durationSeconds ? (
                <p className="text-xs text-muted-foreground">
                  Duração: {blockForm.durationSeconds}s (automática do arquivo)
                </p>
              ) : null}
            </>
          ) : null}

          {blockForm.kind === 'embed' ? (
            <Field
              label="HTML"
              hint="Roda em iframe sandbox na área do aluno — largura total, proporção 16:9."
            >
              <HtmlCodeEditor
                value={blockForm.html}
                onChange={(html) => setBlockForm((f) => ({ ...f, html }))}
              />
            </Field>
          ) : null}

          {blockForm.kind === 'ebook' ? (
            <>
              <Field
                label="E-book (PDF)"
                hint="Bucket privado; o aluno vê como livro 3D interativo com marca d'água. O PDF também entra automaticamente nos materiais da aula para download."
              >
                <FileUploader
                  accept="application/pdf,.pdf"
                  label="Clique para enviar o PDF do e-book (até 200 MB)"
                  onUploaded={(file) => {
                    // Captura o PDF ANTERIOR antes de sobrescrever — o anexo dele é
                    // atualizado in-place (sem material órfão na aula).
                    const previousUrl = blockForm.pdfUrl.trim() || undefined
                    setBlockForm((f) => ({
                      ...f,
                      pdfUrl: file.url,
                      title: f.title.trim() ? f.title : file.filename.replace(/\.pdf$/i, ''),
                    }))
                    void addEbookAttachment(file, previousUrl)
                  }}
                />
              </Field>
              {blockForm.pdfUrl ? (
                <p className="truncate text-xs text-muted-foreground">
                  PDF enviado: {blockForm.pdfUrl}
                </p>
              ) : null}
              <Field label="Título" htmlFor="btitle" hint="Opcional — aparece junto ao livro.">
                <Input
                  id="btitle"
                  value={blockForm.title}
                  onChange={(e) => setBlockForm((f) => ({ ...f, title: e.target.value }))}
                />
              </Field>
              <label className="flex items-start gap-3 rounded-lg border border-border p-3 text-sm">
                <input
                  type="checkbox"
                  checked={blockForm.zappyStudentNotebook}
                  onChange={(event) =>
                    setBlockForm((form) => ({
                      ...form,
                      zappyStudentNotebook: event.target.checked,
                    }))
                  }
                  className="mt-0.5 size-4 accent-primary"
                />
                <span>
                  <strong className="block">Caderno do aluno</strong>
                  <span className="text-muted-foreground">
                    Autoriza extrair o texto deste PDF para as respostas do Zappy.
                  </span>
                </span>
              </label>
            </>
          ) : null}

          {blockForm.kind === 'quiz' ? (
            <QuizBuilder
              value={blockForm.quiz}
              onChange={(quiz) => setBlockForm((f) => ({ ...f, quiz }))}
            />
          ) : null}

          {blockForm.kind === 'pinta' ? (
            <div className="flex flex-col gap-4">
              {/* Tipo e tamanho só na CRIAÇÃO: trocá-los recria o desenho, e na edição isso
                  apagaria o que a professora já fez. Depois de criado, o botão "Tamanho" DENTRO
                  do editor é quem muda a tela (sem perder o traço). */}
              {editingBlock ? null : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="O que a criança vai desenhar">
                    <Select
                      value={blockForm.pintaAssetKind}
                      onChange={(e) => {
                        const kind = e.target.value as PintaLessonAssetKind
                        const sizes: readonly number[] =
                          PINTA_LESSON_ASSET_OPTIONS.find((o) => o.kind === kind)?.sizes ?? []
                        setBlockForm((f) => ({
                          ...f,
                          pintaAssetKind: kind,
                          // O tamanho atual pode não existir no tipo novo → cai no 1º dele.
                          pintaSize: sizes.includes(f.pintaSize) ? f.pintaSize : (sizes[0] ?? 32),
                        }))
                      }}
                    >
                      {PINTA_LESSON_ASSET_OPTIONS.map((o) => (
                        <option key={o.kind} value={o.kind}>
                          {o.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field
                    label="Tamanho da tela"
                    hint="Telas maiores viram desenhos mais pesados de enviar — por isso a lista para em 256."
                  >
                    <Select
                      value={String(blockForm.pintaSize)}
                      onChange={(e) =>
                        setBlockForm((f) => ({ ...f, pintaSize: Number(e.target.value) }))
                      }
                    >
                      {(
                        PINTA_LESSON_ASSET_OPTIONS.find((o) => o.kind === blockForm.pintaAssetKind)
                          ?.sizes ?? []
                      ).map((s) => (
                        <option key={s} value={s}>
                          {s} x {s}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
              )}
              <Field
                label="Desenho inicial"
                hint="Desenhe o ponto de partida da criança. Pode deixar em branco — ela começa do zero na tela que você escolheu."
              >
                {pintaSeed ? (
                  <PintaEmbed
                    key={
                      editingBlock?.id ??
                      `new-pinta-${blockForm.pintaAssetKind}-${blockForm.pintaSize}`
                    }
                    initialAsset={pintaSeed}
                    handleRef={pintaHandleRef}
                    onChange={() => setEditorVersion((v) => v + 1)}
                  />
                ) : (
                  <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
                    Este bloco guardou um desenho que não consigo abrir. Crie um bloco novo — o
                    conteúdo antigo não é recuperável por aqui.
                  </p>
                )}
              </Field>
              <Field
                label="Ferramentas liberadas"
                hint="A tela da criança não precisa vir cheia. Comece pelo essencial e libere mais quando a aula pedir."
              >
                <Select
                  value={blockForm.pintaToolPreset}
                  onChange={(e) =>
                    setBlockForm((f) => ({
                      ...f,
                      pintaToolPreset: e.target.value as BlockForm['pintaToolPreset'],
                    }))
                  }
                >
                  <option value="essencial">Só o essencial (desenhar, apagar, pintar, cor)</option>
                  <option value="livre">Desenho livre (formas, seleção e ajustes)</option>
                  <option value="tudo">Tudo (a caixa inteira)</option>
                </Select>
              </Field>
              <Field
                label="Desenho contínuo (nome)"
                hint="Dê o MESMO nome nas aulas que constroem um único desenho — a criança abre cada aula com o que enviou na anterior. Vazio = aula independente. ⚠️ Todas as aulas da cadeia precisam ser do MESMO tipo de desenho (o salvamento recusa e diz qual aula já usa o nome): quando a criança traz o desenho da aula anterior, é ele que abre, e o tipo e o tamanho vêm dele, não daqui."
              >
                <Input
                  value={blockForm.pintaChain}
                  maxLength={80}
                  onChange={(e) => setBlockForm((f) => ({ ...f, pintaChain: e.target.value }))}
                  placeholder="ex.: heroi-do-jogo"
                />
              </Field>
            </div>
          ) : null}

          {blockForm.kind === 'studio' ? (
            <div className="flex flex-col gap-4">
              {/* ── ESSENCIAL (redesenho 24/07): tipo → projeto → blocos visíveis →
                  projeto contínuo + última aula. O resto vive em "Configurações
                  avançadas" (colapsada — abre sozinha na edição fora do default). ── */}
              <Field
                label="Tipo de atividade"
                hint="Blocos e Ponte é o Estúdio clássico; Código Pro é o projeto profissional (o modo Código é automático)."
              >
                <div className="flex gap-2 pt-1">
                  <Button
                    type="button"
                    size="sm"
                    variant={studioKind === 'blocks' ? 'default' : 'outline'}
                    aria-pressed={studioKind === 'blocks'}
                    onClick={() => setStudioKind('blocks')}
                  >
                    Blocos e Ponte
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={studioKind === 'pro' ? 'default' : 'outline'}
                    aria-pressed={studioKind === 'pro'}
                    onClick={() => setStudioKind('pro')}
                  >
                    Código Pro
                  </Button>
                </div>
              </Field>
              <Field
                label="Projeto inicial"
                hint="Monte o código de partida, instale as extensões e dê o nome do projeto — é o que o aluno abre na aula."
              >
                <StudioEmbed
                  key={editingBlock?.id ?? 'new-studio'}
                  initialProject={
                    editingBlock && editingBlock.content.kind === 'studio'
                      ? (editingBlock.content.initialProject as Project)
                      : null
                  }
                  handleRef={studioHandleRef}
                  onChange={() => setEditorVersion((v) => v + 1)}
                  professionalAuthoring
                  hideKindChooser
                  requestedKind={studioKind}
                  onKindResolved={(kind) => {
                    setStudioKind(kind)
                    setEditorVersion((v) => v + 1)
                  }}
                  features={{ terminal: false, ai: false, professional: true, export: false }}
                />
              </Field>
              {studioKind === 'blocks' ? (
                <Field
                  label="Blocos visíveis para o aluno"
                  hint="Vazio = a paleta curada pelo nível (em Configurações avançadas). Preenchido = o aluno vê SÓ estes blocos (+ as Áreas do projeto). Bom para aulas bem guiadas."
                >
                  <StudioBlocksPicker
                    value={blockForm.studioAllowBlocks}
                    onChange={(studioAllowBlocks) =>
                      setBlockForm((f) => ({ ...f, studioAllowBlocks }))
                    }
                  />
                </Field>
              ) : null}
              <Field
                label="Projeto contínuo (nome)"
                hint="Opcional. Dê o MESMO nome às aulas que constroem um único projeto (ex.: 'jogo-da-cobrinha'): o aluno abre cada aula com o código que enviou na anterior da cadeia. Vazio = aula independente."
              >
                <Input
                  value={blockForm.studioChain}
                  maxLength={80}
                  placeholder="ex.: jogo-da-cobrinha"
                  onChange={(e) => setBlockForm((f) => ({ ...f, studioChain: e.target.value }))}
                />
              </Field>
              <div className="flex flex-col gap-1">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="size-4 accent-primary"
                    checked={blockForm.studioShowcaseEnabled}
                    onChange={(e) =>
                      setBlockForm((f) => ({ ...f, studioShowcaseEnabled: e.target.checked }))
                    }
                  />
                  Última aula do projeto — libera o "Compartilhar" no Mural
                </label>
                <p className="text-xs text-muted-foreground">
                  Ligue SÓ no bloco da última aula: aí a criança ganha o botão "Compartilhar" pra
                  publicar o jogo no Mural (+ link público de jogar). O texto do post (título/
                  resumo/capa) fica em Configurações avançadas — em branco, a IA escreve.
                </p>
              </div>

              {/* ── AVANÇADO (colapsada) ── */}
              <div className="rounded-lg border border-border">
                <button
                  type="button"
                  onClick={() => setAdvancedOpen((v) => !v)}
                  aria-expanded={advancedOpen}
                  className="flex w-full items-center justify-between px-3 py-2.5 text-sm font-medium"
                >
                  Configurações avançadas
                  <ChevronDown
                    className={`size-4 transition-transform ${advancedOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {advancedOpen ? (
                  <div className="flex flex-col gap-4 border-t border-border p-3">
                    {studioKind === 'blocks' ? (
                      <>
                        <StudioConfigClipboard
                          current={{
                            level: blockForm.studioLevel,
                            modes: blockForm.studioModes,
                            categories: blockForm.studioCategories,
                            allowReveal: blockForm.studioAllowReveal,
                            allowBlocks: blockForm.studioAllowBlocks,
                          }}
                          onPaste={(snap) =>
                            setBlockForm((f) => ({
                              ...f,
                              studioLevel: snap.level,
                              studioModes: snap.modes,
                              studioCategories: snap.categories,
                              studioAllowReveal: snap.allowReveal,
                              studioAllowBlocks: snap.allowBlocks,
                            }))
                          }
                        />
                        <div className="grid gap-4 sm:grid-cols-2">
                          <Field
                            label="Nível"
                            htmlFor="slevel"
                            hint="Cura a paleta de blocos por dificuldade (vale quando a lista de blocos visíveis está vazia)."
                          >
                            <Select
                              id="slevel"
                              value={blockForm.studioLevel}
                              onChange={(e) =>
                                setBlockForm((f) => ({
                                  ...f,
                                  studioLevel: e.target.value as BlockLevel,
                                }))
                              }
                            >
                              {STUDIO_LEVELS.map((l) => (
                                <option key={l.value} value={l.value}>
                                  {l.label}
                                </option>
                              ))}
                            </Select>
                          </Field>
                          <Field
                            label="Modos do aluno"
                            hint="Por padrão só Blocos; ligue a Ponte p/ o aluno alternar blocos ⇄ código."
                          >
                            <div className="flex flex-wrap gap-3 pt-1.5">
                              {(
                                [
                                  { value: 'blocks', label: 'Blocos' },
                                  { value: 'bridge', label: 'Ponte (blocos ⇄ código)' },
                                ] as { value: IDEMode; label: string }[]
                              ).map((m) => (
                                <label key={m.value} className="flex items-center gap-1.5 text-sm">
                                  <input
                                    type="checkbox"
                                    className="size-4 accent-primary"
                                    checked={blockForm.studioModes.includes(m.value)}
                                    onChange={(e) =>
                                      setBlockForm((f) => ({
                                        ...f,
                                        studioModes: e.target.checked
                                          ? [...f.studioModes, m.value]
                                          : f.studioModes.filter((x) => x !== m.value),
                                      }))
                                    }
                                  />
                                  {m.label}
                                </label>
                              ))}
                              {/* Bloco LEGADO que já libera o modo Código: dá pra remover,
                                  mas bloco novo nunca vê este checkbox (Código é do Pro). */}
                              {blockForm.studioModes.includes('code') ? (
                                <label className="flex items-center gap-1.5 text-sm">
                                  <input
                                    type="checkbox"
                                    className="size-4 accent-primary"
                                    checked
                                    onChange={() =>
                                      setBlockForm((f) => ({
                                        ...f,
                                        studioModes: f.studioModes.filter((x) => x !== 'code'),
                                      }))
                                    }
                                  />
                                  Código (legado)
                                </label>
                              ) : null}
                            </div>
                          </Field>
                        </div>
                        <Field
                          label="Bloquinhos sempre visíveis"
                          hint="Categorias liberadas independente do nível (opcional)."
                        >
                          <div className="flex flex-wrap gap-3 pt-1.5">
                            {CORE_CATEGORY_OPTIONS.map((cat) => (
                              <label key={cat.value} className="flex items-center gap-1.5 text-sm">
                                <input
                                  type="checkbox"
                                  className="size-4 accent-primary"
                                  checked={blockForm.studioCategories.includes(cat.value)}
                                  onChange={(e) =>
                                    setBlockForm((f) => ({
                                      ...f,
                                      studioCategories: e.target.checked
                                        ? [...f.studioCategories, cat.value]
                                        : f.studioCategories.filter((x) => x !== cat.value),
                                    }))
                                  }
                                />
                                {cat.label}
                              </label>
                            ))}
                          </div>
                        </Field>
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            className="size-4 accent-primary"
                            checked={blockForm.studioAllowReveal}
                            onChange={(e) =>
                              setBlockForm((f) => ({ ...f, studioAllowReveal: e.target.checked }))
                            }
                          />
                          Aluno pode revelar blocos avançados
                        </label>
                      </>
                    ) : null}
                    <Field
                      label="Atividade (auto-correção)"
                      hint="Opcional. Defina checagens que o editor corrige na hora; com nota de corte, viram gate da aula. Só 'estrutura' é reverificada no servidor."
                    >
                      <ActivityBuilder
                        value={blockForm.studioActivity}
                        onChange={(studioActivity) =>
                          setBlockForm((f) => ({ ...f, studioActivity }))
                        }
                      />
                    </Field>
                    <fieldset className="rounded-lg border border-border p-3">
                      <legend className="px-1 text-xs text-muted-foreground">
                        Vitrine do Mural — texto do post
                      </legend>
                      {blockForm.studioShowcaseEnabled ? (
                        <div className="flex flex-col gap-3">
                          <p className="text-xs text-muted-foreground">
                            Texto INICIAL do post (a criança ajusta ao publicar) — em branco, a IA
                            escreve a descrição. A capa padrão é a reserva quando o print falha.
                          </p>
                          <Field label="Título do post" htmlFor="bk-showcase-title">
                            <Input
                              id="bk-showcase-title"
                              value={blockForm.studioShowcaseTitle}
                              maxLength={300}
                              placeholder="Ex.: Meu jogo da cobrinha"
                              onChange={(e) =>
                                setBlockForm((f) => ({ ...f, studioShowcaseTitle: e.target.value }))
                              }
                            />
                          </Field>
                          <Field
                            label="Resumo do projeto"
                            hint="Texto inicial do post (a criança pode ajustar ao publicar). Em branco → a IA gera a descrição."
                          >
                            <Textarea
                              value={blockForm.studioShowcaseSummary}
                              maxLength={2000}
                              placeholder="Um breve resumo do que se trata o projeto."
                              onChange={(e) =>
                                setBlockForm((f) => ({
                                  ...f,
                                  studioShowcaseSummary: e.target.value,
                                }))
                              }
                            />
                          </Field>
                          <Field
                            label="Capa padrão"
                            hint="Usada em projetos web (e como reserva quando o print do jogo falha)."
                          >
                            <ImageUploader
                              scope="block"
                              allowManualUrl={false}
                              value={blockForm.studioShowcaseCover}
                              onChange={(url) =>
                                setBlockForm((f) => ({ ...f, studioShowcaseCover: url }))
                              }
                            />
                          </Field>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Ligue "Última aula do projeto" (acima, no essencial) para configurar o
                          texto do post.
                        </p>
                      )}
                    </fieldset>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {blockForm.kind === 'certificate' ? (
            <div className="flex flex-col gap-4">
              <p className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                Pode ficar em <strong>qualquer aula</strong> — o aluno libera o botão de emitir
                quando <strong>todas as aulas antes dela</strong> estão concluídas (aulas depois não
                contam), então precisa existir <strong>ao menos uma aula antes</strong>: na 1ª aula
                do curso ele nunca libera. Sai um PDF com número de série e QR de validação pública.
                ⚠️ A aula do certificado pode ter conteúdo livre (vídeo/texto de parabéns), mas{' '}
                <strong>não</strong> pode ter quiz com nota de corte nem Estúdio (travam a conclusão
                e seriam pulados na emissão).
              </p>
              <Field
                label="Imagem base do certificado"
                hint="Fundo A4 paisagem do curso (logo, título e decoração já desenhados). O conteúdo abaixo é escrito POR CIMA dela — deixe o miolo central livre."
              >
                <ImageUploader
                  scope="block"
                  value={blockForm.certBaseImageUrl}
                  onChange={(certBaseImageUrl) => setBlockForm((f) => ({ ...f, certBaseImageUrl }))}
                />
              </Field>
              <Field
                label="Linha de abertura"
                htmlFor="cert-intro"
                hint='Acima do nome. Vazio usa "Certificamos que o aluno".'
              >
                <Input
                  id="cert-intro"
                  value={blockForm.certIntroLine}
                  maxLength={200}
                  placeholder="Certificamos que o aluno"
                  onChange={(e) => setBlockForm((f) => ({ ...f, certIntroLine: e.target.value }))}
                />
              </Field>
              <p className="text-xs text-muted-foreground">
                O <strong>nome do aluno</strong> entra sozinho na emissão (perfil da criança no
                Kids, conta no adulto). Logo abaixo dele vai a <strong>mensagem</strong> (frase e/ou
                parágrafo) — <strong>obrigatória</strong>.
              </p>
              <Field
                label="Frase do curso"
                htmlFor="cert-phrase"
                hint="Logo abaixo do nome — o que o aluno concluiu (ex.: 'concluiu o Desafio do Primeiro Jogo em 5 dias')."
              >
                <Input
                  id="cert-phrase"
                  value={blockForm.certCoursePhrase}
                  maxLength={300}
                  placeholder="concluiu o Desafio do Primeiro Jogo em 5 dias"
                  onChange={(e) =>
                    setBlockForm((f) => ({ ...f, certCoursePhrase: e.target.value }))
                  }
                />
              </Field>
              <Field
                label="Parágrafo"
                hint="Abaixo da frase — explica o que o aluno fez (até ~4 linhas no PDF)."
              >
                <Textarea
                  value={blockForm.certBodyText}
                  maxLength={2000}
                  placeholder="Durante o desafio, criou seu primeiro jogo do zero, aprendeu lógica de programação e publicou o projeto."
                  onChange={(e) => setBlockForm((f) => ({ ...f, certBodyText: e.target.value }))}
                />
              </Field>
              <fieldset className="rounded-lg border border-border p-3">
                <legend className="px-1 text-xs text-muted-foreground">Assinaturas (até 2)</legend>
                <p className="mb-2 text-xs text-muted-foreground">
                  A data de conclusão é automática (a da emissão). A <strong>imagem</strong> é a
                  assinatura (o rabisco, acima da linha); o <strong>nome</strong> aparece abaixo da
                  linha como rótulo.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {([1, 2] as const).map((n) => {
                    const urlKey = n === 1 ? 'certSig1Url' : 'certSig2Url'
                    const nameKey = n === 1 ? 'certSig1Name' : 'certSig2Name'
                    return (
                      <div key={n} className="flex flex-col gap-2">
                        <Field
                          label={`Assinatura ${n}`}
                          hint="PNG/JPG (fundo transparente fica melhor)."
                        >
                          <ImageUploader
                            scope="block"
                            value={blockForm[urlKey]}
                            onChange={(url) => setBlockForm((f) => ({ ...f, [urlKey]: url }))}
                          />
                        </Field>
                        <Input
                          value={blockForm[nameKey]}
                          maxLength={120}
                          placeholder={
                            n === 1 ? 'Nome (ex.: Helena Oliveira)' : 'Nome (ex.: Julio Felipe)'
                          }
                          onChange={(e) =>
                            setBlockForm((f) => ({ ...f, [nameKey]: e.target.value }))
                          }
                        />
                      </div>
                    )
                  })}
                </div>
              </fieldset>
            </div>
          ) : null}
        </div>
      </Dialog>

      <Dialog
        open={attOpen}
        onClose={() => setAttOpen(false)}
        title={editingAtt ? 'Editar anexo' : 'Adicionar anexo'}
        footer={
          <Button variant="outline" onClick={() => setAttOpen(false)}>
            Fechar
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          <Field
            label="Arquivo"
            hint="Envie o arquivo (preenche URL/tipo/tamanho) ou informe a URL."
          >
            <FileUploader
              onUploaded={({ url, fileType, sizeBytes, filename }) =>
                setAttForm((f) => ({
                  ...f,
                  url,
                  fileType,
                  sizeBytes: String(sizeBytes),
                  label: f.label.trim() ? f.label : filename,
                }))
              }
            />
          </Field>
          <Field label="Rótulo" htmlFor="alabel">
            <Input
              id="alabel"
              value={attForm.label}
              onChange={(e) => setAttForm((f) => ({ ...f, label: e.target.value }))}
            />
          </Field>
          <Field label="URL" htmlFor="aurl">
            <Input
              id="aurl"
              value={attForm.url}
              onChange={(e) => setAttForm((f) => ({ ...f, url: e.target.value }))}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tipo do arquivo" htmlFor="aft" hint="Opcional (ex.: application/pdf).">
              <Input
                id="aft"
                value={attForm.fileType}
                onChange={(e) => setAttForm((f) => ({ ...f, fileType: e.target.value }))}
              />
            </Field>
            <Field label="Tamanho (bytes)" htmlFor="asz" hint="Opcional.">
              <Input
                id="asz"
                type="number"
                min={0}
                value={attForm.sizeBytes}
                onChange={(e) => setAttForm((f) => ({ ...f, sizeBytes: e.target.value }))}
              />
            </Field>
          </div>
        </div>
      </Dialog>
    </div>
  )
}

// ── Anexo arrastável (card com handle, rótulo e URL) ─────────────────────────
function SortableAttachmentItem({
  attachment,
  canWrite,
  onEdit,
  onDelete,
}: {
  attachment: AttachmentView
  canWrite: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, style } = useSortableItem(attachment.id)

  return (
    <Card ref={setNodeRef} style={style} className="flex items-center justify-between gap-3 p-3">
      <div className="flex min-w-0 items-center gap-3">
        {canWrite ? (
          <button
            type="button"
            className="cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
            aria-label="Arrastar anexo"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-4" />
          </button>
        ) : null}
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{attachment.label}</div>
          <div className="truncate text-xs text-muted-foreground">{attachment.url}</div>
        </div>
      </div>
      {canWrite ? (
        <div className="flex shrink-0 items-center gap-1">
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Pencil className="size-4" /> Editar
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete}>
            Excluir
          </Button>
        </div>
      ) : null}
    </Card>
  )
}
