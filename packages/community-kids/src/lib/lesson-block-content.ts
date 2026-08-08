import type { Project } from '@sistemazero/studio'
import type {
  AudioBlock,
  CertificateBlock,
  ComingSoonBlock,
  EbookBlock,
  EmbedBlock,
  ImageBlock,
  LessonBlockView,
  QuizBlock,
  RichTextBlock,
  StudioBlock,
  VideoBlock,
} from '@/lib/types'

export type ParsedLessonBlock = {
  block: LessonBlockView
  content:
    | AudioBlock
    | CertificateBlock
    | ComingSoonBlock
    | EbookBlock
    | EmbedBlock
    | ImageBlock
    | QuizBlock
    | RichTextBlock
    | StudioBlock
    | VideoBlock
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function optionalString(record: Record<string, unknown>, key: string): boolean {
  return record[key] === undefined || typeof record[key] === 'string'
}

function optionalNumber(record: Record<string, unknown>, key: string): boolean {
  return record[key] === undefined || typeof record[key] === 'number'
}

function optionalBoolean(record: Record<string, unknown>, key: string): boolean {
  return record[key] === undefined || typeof record[key] === 'boolean'
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function optionalStringArray(record: Record<string, unknown>, key: string): boolean {
  return record[key] === undefined || isStringArray(record[key])
}

function isProject(value: unknown): value is Project {
  if (!isRecord(value) || !isRecord(value.files)) return false
  if (
    typeof value.id !== 'string' ||
    typeof value.name !== 'string' ||
    typeof value.createdAt !== 'number' ||
    typeof value.updatedAt !== 'number' ||
    typeof value.mode !== 'string' ||
    typeof value.files['index.html'] !== 'string' ||
    typeof value.files['style.css'] !== 'string' ||
    typeof value.files['script.js'] !== 'string' ||
    !('ir' in value) ||
    !('blocksState' in value) ||
    !Array.isArray(value.installedExtensions)
  ) {
    return false
  }
  if (
    !value.installedExtensions.every(
      (extension) =>
        isRecord(extension) &&
        typeof extension.id === 'string' &&
        typeof extension.version === 'string' &&
        typeof extension.installedAt === 'number',
    )
  ) {
    return false
  }
  if (
    value.extraFiles !== undefined &&
    (!Array.isArray(value.extraFiles) ||
      !value.extraFiles.every(
        (file) =>
          isRecord(file) &&
          typeof file.name === 'string' &&
          typeof file.language === 'string' &&
          typeof file.content === 'string',
      ))
  ) {
    return false
  }
  if (
    value.assets !== undefined &&
    (!Array.isArray(value.assets) ||
      !value.assets.every(
        (asset) =>
          isRecord(asset) &&
          typeof asset.id === 'string' &&
          typeof asset.name === 'string' &&
          typeof asset.kind === 'string' &&
          typeof asset.dataUrl === 'string',
      ))
  ) {
    return false
  }
  return (
    (value.kind === undefined || value.kind === 'classic' || value.kind === 'pro') &&
    (value.tree === undefined || isRecord(value.tree)) &&
    (value.proMeta === undefined || isRecord(value.proMeta))
  )
}

function isRichTextBlock(value: unknown): value is RichTextBlock {
  return (
    isRecord(value) &&
    value.kind === 'rich_text' &&
    optionalString(value, 'html') &&
    optionalString(value, 'markdown') &&
    optionalStringArray(value, 'codeLanguageHints')
  )
}

function isVideoBlock(value: unknown): value is VideoBlock {
  return (
    isRecord(value) &&
    value.kind === 'video' &&
    ['mux', 'youtube', 'vimeo', 'file'].includes(
      typeof value.provider === 'string' ? value.provider : '',
    ) &&
    typeof value.src === 'string' &&
    optionalString(value, 'posterUrl') &&
    optionalNumber(value, 'durationSeconds') &&
    (value.captions === undefined ||
      (Array.isArray(value.captions) &&
        value.captions.every(
          (caption) =>
            isRecord(caption) &&
            typeof caption.lang === 'string' &&
            typeof caption.url === 'string',
        )))
  )
}

function isImageBlock(value: unknown): value is ImageBlock {
  return (
    isRecord(value) &&
    value.kind === 'image' &&
    typeof value.url === 'string' &&
    optionalString(value, 'alt') &&
    optionalString(value, 'caption')
  )
}

function isAudioBlock(value: unknown): value is AudioBlock {
  return (
    isRecord(value) &&
    value.kind === 'audio' &&
    typeof value.url === 'string' &&
    optionalNumber(value, 'durationSeconds')
  )
}

function isQuizBlock(value: unknown): value is QuizBlock {
  return (
    isRecord(value) &&
    value.kind === 'quiz' &&
    Array.isArray(value.questions) &&
    value.questions.every(
      (question) =>
        isRecord(question) &&
        typeof question.id === 'string' &&
        typeof question.prompt === 'string' &&
        Array.isArray(question.choices) &&
        question.choices.every(
          (choice) =>
            isRecord(choice) && typeof choice.id === 'string' && typeof choice.label === 'string',
        ),
    ) &&
    (value.passingScore === undefined ||
      value.passingScore === null ||
      typeof value.passingScore === 'number')
  )
}

function isEmbedBlock(value: unknown): value is EmbedBlock {
  return (
    isRecord(value) &&
    value.kind === 'embed' &&
    optionalString(value, 'html') &&
    optionalString(value, 'sandbox') &&
    optionalString(value, 'embedType') &&
    optionalString(value, 'src') &&
    optionalNumber(value, 'height')
  )
}

function isEbookBlock(value: unknown): value is EbookBlock {
  return isRecord(value) && value.kind === 'ebook' && optionalString(value, 'title')
}

function isCertificateBlock(value: unknown): value is CertificateBlock {
  if (!isRecord(value) || value.kind !== 'certificate') return false
  const stringFields = [
    'baseImageUrl',
    'introLine',
    'coursePhrase',
    'bodyText',
    'accentColor',
    'title',
    'issuerName',
    'signatureImageUrl',
    'logoUrl',
    'message',
  ]
  if (!stringFields.every((field) => optionalString(value, field))) return false
  return (
    value.signatures === undefined ||
    (Array.isArray(value.signatures) &&
      value.signatures.every(
        (signature) =>
          isRecord(signature) &&
          optionalString(signature, 'imageUrl') &&
          optionalString(signature, 'name'),
      ))
  )
}

function isStudioBlock(value: unknown): value is StudioBlock {
  if (!isRecord(value) || value.kind !== 'studio' || !isProject(value.initialProject)) return false
  if (
    !optionalString(value, 'level') ||
    !optionalStringArray(value, 'allowBlocks') ||
    !optionalStringArray(value, 'allowCategories') ||
    !optionalStringArray(value, 'allowedModes') ||
    !optionalBoolean(value, 'allowLevelReveal') ||
    !optionalString(value, 'chain') ||
    (value.activity !== undefined && !isRecord(value.activity))
  ) {
    return false
  }
  return (
    value.showcase === undefined ||
    (isRecord(value.showcase) &&
      typeof value.showcase.enabled === 'boolean' &&
      optionalString(value.showcase, 'title') &&
      optionalString(value.showcase, 'summary') &&
      optionalString(value.showcase, 'defaultCoverUrl'))
  )
}

function isComingSoonBlock(value: unknown): value is ComingSoonBlock {
  return isRecord(value) && value.kind === 'coming_soon' && optionalString(value, 'message')
}

export function parseLessonBlock(block: LessonBlockView): ParsedLessonBlock | null {
  const value = block.content
  switch (block.kind) {
    case 'rich_text':
      return isRichTextBlock(value) ? { block, content: value } : null
    case 'video':
      return isVideoBlock(value) ? { block, content: value } : null
    case 'image':
      return isImageBlock(value) ? { block, content: value } : null
    case 'audio':
      return isAudioBlock(value) ? { block, content: value } : null
    case 'quiz':
      return isQuizBlock(value) ? { block, content: value } : null
    case 'embed':
      return isEmbedBlock(value) ? { block, content: value } : null
    case 'ebook':
      return isEbookBlock(value) ? { block, content: value } : null
    case 'certificate':
      return isCertificateBlock(value) ? { block, content: value } : null
    case 'studio':
      return isStudioBlock(value) ? { block, content: value } : null
    case 'coming_soon':
      return isComingSoonBlock(value) ? { block, content: value } : null
    default:
      return null
  }
}
