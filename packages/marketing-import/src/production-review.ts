import type {
  InventoryEntry,
  ProductionAlternative,
  ProductionFolder,
  ProductionIssue,
  ProductionReview,
} from '@sistemazero/marketing-contracts'
import { relativeSourcePathSchema } from '@sistemazero/marketing-contracts'
import { reviewAdditionalProduction } from './production-additional'
import { productionFolderFromPath } from './production-folders'
import { parseStructuredCopy, type SourcePiece } from './structured-copy'

export const productionReviewVersion = 'editorial-production-v1'
export type ProductionCopy = {
  key: string
  sourcePath: string | null
  bodies: string[]
  caption: string
}
const folderPattern =
  /^(docs\/marketing\/kids\/([a-z0-9-]+)\/instagram\/producao\/postagens\/(p\d{2})-[^/]+)\//
const normalized = (value: string) => value.normalize('NFC').replace(/\s+/gu, ' ').trim()
function boundedText(text: string) {
  if (new TextEncoder().encode(text).length > 196608)
    throw new Error('Fonte textual acima de 192 KiB')
  return text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n')
}
/** Only explicit production folders; historical copies and support images are not deliveries. */
export function productionFolders(entries: InventoryEntry[]): ProductionFolder[] {
  const folders = new Map<string, ProductionFolder>()
  for (const entry of entries) {
    if (entry.disposition === 'excluded' || entry.validity === 'historical') continue
    const path = entry.path.match(
      /^(docs\/marketing\/kids\/[a-z0-9-]+\/instagram\/producao\/(?:postagens|fixados|destaques)\/[^/]+)\//,
    )?.[1]
    const folder = path ? productionFolderFromPath(path) : null
    if (folder) folders.set(folder.path, folder)
  }
  return [...folders.values()].sort((a, b) => a.path.localeCompare(b.path))
}
function strings(value: unknown): string[] {
  if (
    !Array.isArray(value) ||
    !value.length ||
    value.length > 30 ||
    value.some((item) => typeof item !== 'string' || item.length > 10000)
  )
    throw new Error('Texto de produção inválido ou acima do limite')
  return value.map((item) => String(item))
}
/** JSON is data only. Unknown production metadata remains in the original attachment. */
export function parseProductionCopy(text: string, extension: 'json' | 'md'): ProductionCopy[] {
  const source = boundedText(text)
  if (extension === 'md') {
    const parsed = parseStructuredCopy(source)
    if (parsed.issues.length)
      throw new Error(parsed.issues.map((issue) => issue.message).join('; '))
    return parsed.pieces.map((piece) => ({ ...copyFromPiece(piece), sourcePath: null }))
  }
  const value: unknown = JSON.parse(source)
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    !('id' in value) ||
    typeof value.id !== 'string' ||
    !/^P\d{2}$/.test(value.id) ||
    !('caption' in value) ||
    typeof value.caption !== 'string' ||
    value.caption.length > 10000 ||
    !('source' in value)
  )
    throw new Error('Ficha de produção sem identidade, legenda ou origem válida')
  const sourcePath = relativeSourcePathSchema.parse(value.source)
  const hasArt = 'art' in value,
    hasSlides = 'slides' in value
  if (hasArt === hasSlides)
    throw new Error('Ficha precisa ter arte única ou slides, sem ambiguidade')
  const bodies = hasArt
    ? [strings(value.art).join('\n\n')]
    : (() => {
        if (
          !('slides' in value) ||
          !Array.isArray(value.slides) ||
          !value.slides.length ||
          value.slides.length > 20
        )
          throw new Error('Slides inválidos')
        return value.slides.map((slide: unknown) => strings(slide).join('\n\n'))
      })()
  return [{ key: value.id, sourcePath, bodies, caption: value.caption }]
}
function copyFromPiece(piece: SourcePiece) {
  const main = piece.components.filter((component) => component.channel === 'main')
  return {
    key: piece.key,
    bodies: main
      .filter((component) => component.type !== 'caption')
      .map((component) => component.body),
    caption: main
      .filter((component) => component.type === 'caption')
      .map((component) => component.body)
      .join('\n\n'),
  }
}
export function parseProductionAlt(text: string): ProductionAlternative[] {
  const source = boundedText(text),
    headings = [...source.matchAll(/^(?:SLIDE (\d+)|IMAGEM [ÚU]NICA)\s*$/gm)]
  if (!headings.length) throw new Error('Texto alternativo sem identificação dos arquivos')
  const result = headings.map((heading, index) => {
    const body = source.slice(
      (heading.index ?? 0) + heading[0].length,
      headings[index + 1]?.index ?? source.length,
    )
    const short = body.match(/^Curto(?:\s*\([^\n]*\))?:\s*(.+)$/m)?.[1]?.trim()
    const long = body.match(/^Longo:\s*([\s\S]+)$/m)?.[1]?.trim()
    if (!short || !long || short.length > 4000 || long.length > 10000)
      throw new Error('Texto alternativo incompleto ou acima do limite')
    return { position: Number(heading[1] ?? 1), short, long }
  })
  if (result.length > 20 || result.some((item, index) => item.position !== index + 1))
    throw new Error('Ordem do texto alternativo incompleta ou repetida')
  return result
}
/** All text bytes must be verified against the inventory by the caller. Never approves an artwork. */
export function reviewProduction(input: {
  folder: ProductionFolder
  entries: InventoryEntry[]
  texts: ReadonlyMap<string, string>
  copy: { sourcePath: string; piece: SourcePiece } | null
}): ProductionReview {
  const { folder, texts } = input
  const identified = productionFolderFromPath(relativeSourcePathSchema.parse(folder.path))
  if (!identified || identified.key !== folder.key || identified.product !== folder.product)
    throw new Error('Pasta de produção inválida')
  if (!folder.key.startsWith('P')) return reviewAdditionalProduction(input)
  const identity = `${relativeSourcePathSchema.parse(folder.path)}/`.match(folderPattern)
  if (
    identity?.[1] !== folder.path ||
    identity[2] !== folder.product ||
    identity[3]?.toUpperCase() !== folder.key
  )
    throw new Error('Pasta de produção inválida')
  const entries = input.entries.filter((entry) => entry.path.startsWith(`${folder.path}/`))
  const issues: ProductionIssue[] = [],
    matchingCopies: string[] = [],
    otherCopies: string[] = []
  if (entries.length > 2000)
    throw new Error('Pasta de produção excede 2.000 origens; confira uma seleção menor')
  const issue = (path: string, message: string) => issues.push({ path, message })
  let divergent = false
  const files: ProductionReview['files'] = []
  for (const entry of entries) {
    const relative = entry.path.slice(folder.path.length + 1),
      match = relative.match(/^(\d{2})-(p\d{2})\.(png|jpe?g)$/i)
    if (!match) {
      if (/^\d{2}-[^/]+\.(png|jpe?g|mp4)$/i.test(relative))
        issue(entry.path, 'Entrega numerada fora do formato reconhecido; conferir individualmente')
      continue
    }
    if (
      match[2]?.toUpperCase() !== folder.key ||
      !entry.sha256 ||
      !entry.bytes ||
      entry.kind !== 'file' ||
      entry.category !== 'final-media' ||
      entry.disposition !== 'eligible' ||
      entry.validity === 'historical'
    ) {
      issue(entry.path, 'Arquivo numerado pendente ou com identidade diferente da pasta')
      continue
    }
    files.push({ path: entry.path, sha256: entry.sha256, position: Number(match[1]), alt: null })
  }
  files.sort((a, b) => a.position - b.position || a.path.localeCompare(b.path))
  if (!files.length) issue(folder.path, 'Nenhuma arte numerada concluída nesta pasta')
  if (files.length > 20 || files.some((file, index) => file.position !== index + 1))
    issue(folder.path, 'Sequência de arquivos incompleta ou ambígua')
  const altPath = `${folder.path}/texto-alternativo.txt`,
    altText = texts.get(altPath)
  if (altText === undefined) issue(altPath, 'Texto alternativo não disponível para conferência')
  else
    try {
      const alternatives = parseProductionAlt(altText)
      if (alternatives.length !== files.length)
        issue(altPath, 'Quantidade de textos alternativos diverge das artes')
      for (const file of files)
        file.alt = alternatives.find((alt) => alt.position === file.position) ?? null
    } catch (error) {
      issue(altPath, error instanceof Error ? error.message : 'Texto alternativo inválido')
    }
  const canonicalRoot = `docs/marketing/kids/${folder.product}/instagram/postagens/`
  if (
    !input.copy ||
    input.copy.piece.key !== folder.key ||
    !relativeSourcePathSchema.safeParse(input.copy.sourcePath).success ||
    !input.copy.sourcePath.startsWith(canonicalRoot) ||
    input.copy.sourcePath.slice(canonicalRoot.length).includes('/')
  )
    issue(folder.path, 'Copy canônica da mesma origem/produto não encontrada ou ambígua')
  else {
    const expected = copyFromPiece(input.copy.piece)
    if (expected.bodies.length !== files.length)
      issue(folder.path, 'Quantidade de artes diverge dos componentes da copy')
    const captionPath = `${folder.path}/legenda.txt`,
      caption = texts.get(captionPath)
    if (caption === undefined) issue(captionPath, 'Legenda da entrega não disponível')
    else if (normalized(caption) !== normalized(expected.caption)) {
      divergent = true
      issue(captionPath, 'Legenda da entrega difere da copy canônica; preservar ambas')
    }
    for (const entry of entries) {
      if (
        !/^apoio\/(?:v\d+\/)?(?:copy\.json|copy-fonte\.md)$/.test(
          entry.path.slice(folder.path.length + 1),
        )
      )
        continue
      const text = texts.get(entry.path)
      if (text === undefined) {
        issue(entry.path, 'Fonte da montagem não disponível para conferência')
        continue
      }
      try {
        const candidates = parseProductionCopy(text, entry.path.endsWith('.json') ? 'json' : 'md')
        const candidate = candidates.find((candidate) => candidate.key === folder.key)
        if (
          !candidate ||
          candidates.filter((candidate) => candidate.key === folder.key).length !== 1 ||
          (candidate.sourcePath !== null && candidate.sourcePath !== input.copy.sourcePath)
        ) {
          issue(
            entry.path,
            'Identidade ou caminho da copy de produção não coincide com a origem canônica',
          )
          continue
        }
        if (
          candidate.bodies.length === expected.bodies.length &&
          candidate.bodies.every(
            (body, index) => normalized(body) === normalized(expected.bodies[index] ?? ''),
          ) &&
          normalized(candidate.caption) === normalized(expected.caption)
        )
          matchingCopies.push(entry.path)
        else otherCopies.push(entry.path)
      } catch (error) {
        issue(entry.path, error instanceof Error ? error.message : 'Ficha de produção inválida')
      }
    }
    if (!matchingCopies.length) {
      divergent = true
      issue(folder.path, 'Nenhuma fonte de montagem coincide integralmente com a copy canônica')
    }
  }
  return {
    parserVersion: productionReviewVersion,
    folder,
    copySourcePath: input.copy?.sourcePath ?? null,
    state: divergent ? 'divergent' : issues.length ? 'incomplete' : 'ready-for-review',
    files,
    matchingCopies,
    otherCopies,
    issues,
  }
}
