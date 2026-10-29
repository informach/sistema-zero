import type { InteractiveBlock } from '@sistemazero/core/learning'
import {
  falasDoQuiz,
  reconciliarVozesDoZappy,
  type SceneVozes,
  type ZappySpeechOverride,
} from '@sistemazero/core/learning/scene'
import type { PythonLearningLevel } from '@sistemazero/core/studio/python-learning'
import { PINTA_TOOL_PRESETS, type PintaLessonAssetKind } from '@sistemazero/pinta/assets'
import type { BlockLevel, EditableStudioProject, IDEMode } from '@sistemazero/studio'
import {
  isArtSlotName,
  type StudioArtSlotForm,
  studioArtSlotsFormIssue,
} from './art-slot-authoring'
import { EMPTY_LEARNING } from './learning-form-defaults'
import type { LessonFormSnapshot } from './lesson-form-buffer'
import {
  DIALOGUE_MAX_LENGTH,
  type DialoguePose,
  type LessonBlockContent,
  type LessonBlockKind,
  MATERIALS_MAX_ITEMS,
  type MaterialItem,
  type MaterialsBlock,
  type QuizQuestion,
} from './types'

export interface QuizValue {
  questions: QuizQuestion[]
  passingScore?: number
  /** A voz do Zappy (pergunta e explicação de cada questão), gerada pelo botão da aula. */
  vozes?: SceneVozes
}

export interface MaterialsValue {
  title: string
  items: MaterialItem[]
}

export const EMPTY_MATERIALS: MaterialsValue = { title: '', items: [] }

export const STUDIO_MODES: { value: IDEMode; label: string }[] = [
  { value: 'blocks', label: 'Blocos' },
  { value: 'bridge', label: 'Ponte' },
  { value: 'code', label: 'Código' },
]

export interface BlockForm {
  galleryEnabled: boolean
  galleryMin: number
  galleryMax: number
  interactive: InteractiveBlock
  toolPurpose: 'experiment' | 'submission'
  kind: LessonBlockKind
  /** Diálogo: pose do mascote e a fala (texto simples, sem markdown). */
  dialoguePose: DialoguePose
  dialogueText: string
  dialogueZappySpeech?: ZappySpeechOverride
  dialogueVozes?: SceneVozes
  markdown: string
  html: string
  /** Embed URL do vídeo (preenchida pelo uploader Vimeo — sem campo manual). */
  src: string
  posterUrl: string
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
  /** E-book: PDF escolhido nos arquivos da aula. */
  ebookAttachmentId: string
  title: string
  /** Estúdio: nível fixado (paleta por dificuldade). */
  studioLevel: BlockLevel
  studioPythonLevel: PythonLearningLevel
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
  /** Estúdio: nome do projeto contínuo (cadeia). Vazio = aula independente. */
  studioChain: string
  /** Estúdio: os desenhos das vagas de arte que este jogo importa (vazia = nenhum). */
  studioArtSlots: StudioArtSlotForm[]
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
  /** Pinta: a vaga de arte que o desenho preenche (vazia = o desenho não entra em jogo). */
  pintaArtSlotName: string
  /** Pinta: a imagem do jogo que o desenho substitui (referência e modo "trocar"). */
  pintaArtSlotReplaces: string
  /** Materiais complementares: o nome do bloco e a lista ordenada de itens. */
  materials: MaterialsValue
  /** Exibe o primeiro PDF em um leitor ao lado do vídeo quando couber. */
  materialsBookPreview: boolean
}

/** Exportados para o teste de conformidade dos tipos de bloco (ver tests/). */
export const EMPTY_BLOCK: BlockForm = {
  galleryEnabled: false,
  galleryMin: 1,
  galleryMax: 6,
  interactive: EMPTY_LEARNING,
  toolPurpose: 'submission',
  kind: 'rich_text',
  dialoguePose: 'speaking',
  dialogueText: '',
  markdown: '',
  html: '',
  src: '',
  posterUrl: '',
  url: '',
  provider: 'vimeo',
  durationSeconds: '',
  alt: '',
  caption: '',
  quiz: { questions: [], passingScore: 70 },
  captions: [],
  ebookAttachmentId: '',
  title: '',
  studioLevel: 'iniciante-2d',
  studioPythonLevel: 1,
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
  studioChain: '',
  studioArtSlots: [],
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
  pintaArtSlotName: '',
  pintaArtSlotReplaces: '',
  materials: EMPTY_MATERIALS,
  materialsBookPreview: false,
}

/**
 * Primeiro erro da lista de materiais, ou `null`. Espelha o que o members exige — é aqui que a
 * autora descobre o problema, e não na hora de publicar.
 */
export function validateMaterials(v: LessonFormSnapshot<MaterialsValue>): string | null {
  if (v.items.length === 0) return 'Adicione ao menos um material.'
  if (v.items.length > MATERIALS_MAX_ITEMS)
    return `Os materiais aceitam até ${MATERIALS_MAX_ITEMS} itens.`
  for (const item of v.items) {
    if (item.kind === 'file' && !item.attachmentId) return 'Envie o arquivo de cada item.'
    if (item.kind === 'image' && !item.url.trim()) return 'Envie a imagem de cada item.'
    if (item.kind === 'text' && !item.markdown.trim()) return 'Escreva o recado.'
    if (item.kind === 'link' && !item.label.trim()) return 'Dê um nome a cada link.'
    if ((item.kind === 'link' || item.kind === 'video') && !/^https:\/\//i.test(item.url.trim()))
      return 'Os endereços de link e de vídeo precisam começar com https://.'
  }
  return null
}

export function materialsFromContent(content: MaterialsBlock): MaterialsValue {
  return { title: content.title ?? '', items: content.items }
}

/**
 * Primeiro erro de validação do quiz (ou `null` se ok). Espelha o que o members
 * exige: ≥1 pergunta; por pergunta, prompt, ≥2 opções (com texto) e ≥1 correta.
 */
export function validateQuiz(quiz: LessonFormSnapshot<QuizValue>): string | null {
  if (quiz.questions.length === 0) return 'Adicione ao menos uma pergunta ao quiz.'
  for (const [i, q] of quiz.questions.entries()) {
    const n = i + 1
    if (!q.prompt.trim()) return `Pergunta ${n}: informe o enunciado.`
    if (q.choices.length < 2) return `Pergunta ${n}: adicione ao menos 2 opções.`
    if (q.choices.some((c) => !c.label.trim())) return `Pergunta ${n}: há opção sem texto.`
    if (q.correctChoiceIds.length === 0) return `Pergunta ${n}: marque ao menos 1 opção correta.`
  }
  return null
}

const num = (s: string): number | undefined => (s.trim() ? Number(s) : undefined)
const opt = (s: string): string | undefined => (s.trim() ? s.trim() : undefined)

/** Monta o conteúdo do bloco a partir do form. `studioProject` = snapshot do editor embutido. */
export function buildContent(
  f: BlockForm,
  studioProject?: EditableStudioProject,
  previousContent?: LessonBlockContent,
  pintaAsset?: unknown,
): LessonBlockContent {
  if (previousContent && Object.hasOwn(previousContent, 'solutionProject'))
    throw new Error(
      'Converta o gabarito global para exemplos por parte antes de editar este bloco.',
    )
  const dur = num(f.durationSeconds)
  switch (f.kind) {
    case 'interactive':
      return f.interactive
    case 'studio': {
      if (f.galleryEnabled && studioProject)
        return {
          kind: 'studio',
          purpose: 'submission',
          initialProject: studioProject,
          gallery: { minItems: 1, maxItems: 1 },
        }
      // `studioProject` é garantido não-nulo no saveBlock (validação antes de chamar).
      // Projeto PRO: o modo Código é automático do kind — `allowedModes` é omitido
      // (redesenho 24/07; a curadoria de modos só vale no projeto de blocos).
      const isPro = studioProject?.kind === 'pro'
      return {
        kind: 'studio',
        purpose: f.toolPurpose,
        initialProject: studioProject as EditableStudioProject,
        ...(studioProject?.programmingLanguage === 'python'
          ? { pythonLevel: f.studioPythonLevel }
          : { level: f.studioLevel }),
        ...(f.studioCategories.length > 0 ? { allowCategories: f.studioCategories } : {}),
        ...(f.studioAllowBlocks.length > 0 ? { allowBlocks: f.studioAllowBlocks } : {}),
        ...(!isPro && f.studioModes.length > 0 && f.studioModes.length < STUDIO_MODES.length
          ? { allowedModes: f.studioModes }
          : {}),
        allowLevelReveal: f.studioAllowReveal,
        ...(f.studioChain.trim() ? { chain: f.studioChain.trim() } : {}),
        ...(f.studioArtSlots.length > 0
          ? { artSlots: f.studioArtSlots.map(({ name, mode }) => ({ name, mode })) }
          : {}),
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
    case 'materials':
      return {
        kind: 'materials',
        ...(opt(f.materials.title) ? { title: f.materials.title.trim() } : {}),
        ...(f.materialsBookPreview ? { bookPreview: true } : {}),
        items: f.materials.items,
      }
    case 'dialogue':
      return {
        kind: 'dialogue',
        pose: f.dialoguePose,
        text: f.dialogueText.trim(),
        ...(f.dialogueZappySpeech ? { zappySpeech: f.dialogueZappySpeech } : {}),
        ...(f.dialogueVozes ? { vozes: f.dialogueVozes } : {}),
      }
    case 'rich_text':
      return {
        kind: 'rich_text',
        ...(opt(f.markdown) ? { markdown: f.markdown } : {}),
        ...(opt(f.html) ? { html: f.html } : {}),
      }
    case 'video':
      return {
        ...(previousContent?.kind === 'video' ? previousContent : {}),
        kind: 'video',
        provider: f.provider as 'mux' | 'youtube' | 'vimeo' | 'file',
        src: f.src.trim(),
        posterUrl: opt(f.posterUrl),
        durationSeconds: dur,
        captions: f.captions.length > 0 ? f.captions : undefined,
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
        attachmentId: f.ebookAttachmentId,
        ...(opt(f.title) ? { title: f.title.trim() } : {}),
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
      if (f.galleryEnabled)
        return {
          kind: 'pinta',
          purpose: 'submission',
          initialAsset: null,
          gallery: { minItems: f.galleryMin, maxItems: f.galleryMax },
        }
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
        // A vaga só vale no desenho que a criança ENVIA (o members recusa na exploração).
        ...(f.toolPurpose !== 'experiment' && isArtSlotName(f.pintaArtSlotName)
          ? {
              artSlot: {
                name: f.pintaArtSlotName,
                ...(isArtSlotName(f.pintaArtSlotReplaces)
                  ? { replaces: f.pintaArtSlotReplaces }
                  : {}),
              },
            }
          : {}),
      }
    default: {
      // O dicionário só guarda o que ainda casa com o texto (e a pronúncia) de AGORA: uma pergunta
      // reescrita não pode publicar o MP3 da versão anterior.
      const vozes = reconciliarVozesDoZappy(
        falasDoQuiz(f.quiz).map((fala) => fala.speechText),
        f.quiz.vozes,
      )
      return {
        kind: 'quiz',
        questions: f.quiz.questions,
        ...(f.quiz.passingScore != null ? { passingScore: f.quiz.passingScore } : {}),
        ...(vozes ? { vozes } : {}),
      }
    }
  }
}

/** Campo obrigatório faltando → mensagem amigável (null = válido). */
export function validateBlock(f: LessonFormSnapshot<BlockForm>): string | null {
  switch (f.kind) {
    case 'dialogue': {
      const fala = f.dialogueText.trim()
      if (!fala) return 'Escreva a fala do Zappy.'
      if (fala.length > DIALOGUE_MAX_LENGTH)
        return `A fala do Zappy passa de ${DIALOGUE_MAX_LENGTH} caracteres.`
      return null
    }
    case 'video':
      return f.src.trim() ? null : 'Envie o vídeo antes de publicar.'
    case 'image':
      return f.url.trim() ? null : 'Envie a imagem antes de publicar.'
    case 'audio':
      return f.url.trim() ? null : 'Envie o áudio antes de publicar.'
    case 'embed':
      return f.html.trim() ? null : 'Escreva o HTML do conteúdo interativo.'
    case 'ebook':
      return f.ebookAttachmentId ? null : 'Escolha um PDF dos arquivos da aula.'
    case 'materials':
      return validateMaterials(f.materials)
    case 'studio': {
      // O projeto inicial vem do editor embutido (validado no saveBlock). Aqui só
      // barramos "zero modos" — que, omitido no payload, viraria "todos liberados"
      // (o OPOSTO da intenção do autor; achado do review).
      if (f.studioModes.length === 0) return 'Selecione ao menos um modo do Estúdio.'
      return studioArtSlotsFormIssue(f.studioArtSlots)
    }
    case 'pinta': {
      if (f.pintaArtSlotReplaces && !f.pintaArtSlotName)
        return 'Dê um nome à vaga do desenho, ou tire a imagem do jogo que ele substitui.'
      return null
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
