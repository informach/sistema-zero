import type {
  InventoryEntry,
  ProductionFolder,
  ProductionReview,
} from '@sistemazero/marketing-contracts'
import { isProductionCanonicalPath } from './production-folders'
import type { SourcePiece } from './structured-copy'

/** Fixed posts and highlights have no standardized mounting-copy manifests in the
 * archive. Preserve their deliveries and discrepancies without claiming textual
 * equivalence from a filename, an alt description or the number of images. */
export function reviewAdditionalProduction(input: {
  folder: ProductionFolder
  entries: InventoryEntry[]
  texts: ReadonlyMap<string, string>
  copy: { sourcePath: string; piece: SourcePiece } | null
}): ProductionReview {
  const { folder, texts } = input
  const issues: ProductionReview['issues'] = []
  const issue = (path: string, message: string) => issues.push({ path, message })
  const entries = input.entries.filter((entry) => entry.path.startsWith(`${folder.path}/`))
  if (entries.length > 2000) throw new Error('Pasta de produção excede 2.000 origens')
  const files: ProductionReview['files'] = []
  for (const entry of entries) {
    const relative = entry.path.slice(folder.path.length + 1)
    const numbered = relative.match(/^(\d{2})-[a-z0-9-]+\.(png|jpe?g|mp4)$/i)
    if (!numbered) continue
    if (
      !entry.sha256 ||
      !entry.bytes ||
      entry.kind !== 'file' ||
      entry.disposition !== 'eligible' ||
      entry.category !== 'final-media' ||
      entry.validity === 'historical'
    ) {
      issue(entry.path, 'Arquivo numerado pendente ou sem integridade conferida')
      continue
    }
    files.push({ path: entry.path, sha256: entry.sha256, position: Number(numbered[1]), alt: null })
  }
  files.sort((a, b) => a.position - b.position || a.path.localeCompare(b.path))
  if (!files.length) issue(folder.path, 'Nenhuma entrega numerada concluída nesta pasta')
  if (files.length > 20 || files.some((file, index) => file.position !== index + 1))
    issue(folder.path, 'Sequência de arquivos incompleta ou ambígua')
  const altPath = `${folder.path}/texto-alternativo.txt`
  const altText = texts.get(altPath)
  if (altText === undefined) issue(altPath, 'Texto alternativo não disponível para conferência')
  else {
    const normalized = altText.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n')
    const headings = [...normalized.matchAll(/^(\d{2}-[a-z0-9-]+\.(?:png|jpe?g))\s*$/gim)]
    const seen = new Set<string>()
    for (const [index, heading] of headings.entries()) {
      const name = heading[1] ?? ''
      const body = normalized
        .slice(
          (heading.index ?? 0) + heading[0].length,
          headings[index + 1]?.index ?? normalized.length,
        )
        .trim()
      const file = files.find((value) => value.path === `${folder.path}/${name}`)
      if (!file || seen.has(name) || !body || body.length > 4000) {
        issue(altPath, 'Descrição sem arquivo correspondente, repetida ou fora do limite')
        continue
      }
      seen.add(name)
      // The source has one description, not two editorial variants.
      file.alt = { position: file.position, short: body, long: body }
    }
    if (!headings.length || files.some((file) => !file.alt))
      issue(altPath, 'A descrição não cobre exatamente as entregas numeradas')
  }
  let divergent = false
  const copy = input.copy
  if (!copy || copy.piece.key !== folder.key || !isProductionCanonicalPath(folder, copy.sourcePath))
    issue(folder.path, 'Copy canônica da mesma origem/produto não encontrada ou ambígua')
  else {
    const components = copy.piece.components.filter(
      (component) => component.channel === 'main' && component.type !== 'caption',
    )
    if (components.length !== files.length)
      issue(
        folder.path,
        'Quantidade de entregas diverge dos componentes da copy; conferir identidade e ordem',
      )
    if (folder.key.startsWith('F')) {
      const captionPath = `${folder.path}/legenda.txt`
      const caption = texts.get(captionPath)
      const expected = copy.piece.components
        .filter((component) => component.channel === 'main' && component.type === 'caption')
        .map((component) => component.body)
        .join('\n\n')
      const normalize = (value: string) => value.normalize('NFC').replace(/\s+/gu, ' ').trim()
      if (caption === undefined) issue(captionPath, 'Legenda da entrega não disponível')
      else if (normalize(caption) !== normalize(expected)) {
        divergent = true
        issue(captionPath, 'Legenda da entrega difere da copy canônica; preservar ambas')
      }
    }
  }
  issue(
    folder.path,
    'Esta pasta não tem ficha de montagem estruturada. Confira o texto e a identidade de cada arte antes de vinculá-la aos componentes; ordem e quantidade não comprovam correspondência.',
  )
  const instructions = `${folder.path}/publicacao.txt`
  if (texts.has(instructions))
    issue(
      instructions,
      'Orientações de publicação preservadas: conferir versões provisórias, substituições por vídeo, stickers e ordem indicada antes de produzir ou publicar.',
    )
  return {
    parserVersion: 'editorial-production-v2',
    folder,
    copySourcePath: copy?.sourcePath ?? null,
    state: divergent ? 'divergent' : 'incomplete',
    files,
    matchingCopies: [],
    otherCopies: [],
    issues,
  }
}
