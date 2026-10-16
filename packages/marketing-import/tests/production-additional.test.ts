import { expect, test } from 'bun:test'
import { type InventoryEntry, productionReviewSchema } from '@sistemazero/marketing-contracts'
import { classifySource } from '../src/inventory-policy'
import { productionFolderFromPath } from '../src/production-folders'
import { productionInputs, productionReviewFromTexts } from '../src/production-inputs'
import { productionFolders } from '../src/production-review'

const root = 'docs/marketing/kids/produto/instagram'
function source(path: string): InventoryEntry {
  return {
    path,
    kind: 'file',
    ...classifySource('sistema-zero', path, false),
    sha256: 'a'.repeat(64),
    bytes: 120,
  }
}
function pinned() {
  const folder = productionFolderFromPath(`${root}/producao/fixados/01-primeiro`)
  if (!folder) throw new Error('Pasta inválida')
  const texts = new Map([
    [
      `${root}/02-fixados.md`,
      '## F01 · Primeiro\n**Formato:** Carrossel, 2 slides.\n### Slide 1\n> Primeiro.\n### Slide 2\n> Segundo.\n### Legenda\n> Legenda original.',
    ],
    [`${folder.path}/legenda.txt`, 'Legenda original.'],
    [
      `${folder.path}/texto-alternativo.txt`,
      '01-capa.png\r\nDescrição da capa.\r\n\r\n02-slide.png\r\nDescrição da segunda tela.',
    ],
    [`${folder.path}/publicacao.txt`, 'As imagens provisórias serão substituídas por vídeos.'],
  ])
  const entries = [
    ...texts.keys(),
    `${folder.path}/01-capa.png`,
    `${folder.path}/02-slide.png`,
    `${folder.path}/apoio/03-referencia.png`,
    `${root}/01-destaques.md`,
    `${root}/postagens/copy.md`,
  ].map(source)
  return { folder, texts, entries }
}
test('fixados conservam as descrições por nome exato e não inferem equivalência da arte pela quantidade', () => {
  const f = pinned()
  expect(productionFolders(f.entries)).toEqual([f.folder])
  const inputs = productionInputs(f.entries, f.folder.path)
  expect(
    inputs.selected.filter((entry) => entry.kind === 'canonical').map((entry) => entry.source.path),
  ).toEqual([`${root}/02-fixados.md`])
  expect(inputs.selected.filter((entry) => entry.kind === 'media')).toHaveLength(2)
  const review = productionReviewSchema.parse(
    productionReviewFromTexts(f.folder, f.entries, f.texts),
  )
  expect(review.parserVersion).toBe('editorial-production-v2')
  expect(review.state).toBe('incomplete')
  expect(review.files.map((file) => [file.position, file.alt?.short])).toEqual([
    [1, 'Descrição da capa.'],
    [2, 'Descrição da segunda tela.'],
  ])
  expect(review.matchingCopies).toEqual([])
  expect(review.issues.some((issue) => issue.message.includes('ficha de montagem'))).toBe(true)
  f.texts.set(`${f.folder.path}/legenda.txt`, 'Outra legenda.')
  expect(productionReviewFromTexts(f.folder, f.entries, f.texts).state).toBe('divergent')
})
test('destaques mantêm originais sem inventar alt, identidade dos componentes ou fontes de montagem', () => {
  const folder = productionFolderFromPath(`${root}/producao/destaques/alunos`)
  if (!folder) throw new Error('Pasta inválida')
  const texts = new Map([
    [
      `${root}/01-destaques.md`,
      '## Alunos\n### AL07 · Fernando\n> Fernando.\n### AL06 · Convite\n> Conhecer.',
    ],
    [
      `${folder.path}/publicacao.txt`,
      '01-convite.png — AL06\n02-fernando.png — AL07\nVersão provisória.',
    ],
  ])
  const entries = [
    ...texts.keys(),
    `${folder.path}/01-convite.png`,
    `${folder.path}/02-fernando.png`,
    `${folder.path}/molduras/01-convite.png`,
  ].map(source)
  const review = productionReviewSchema.parse(productionReviewFromTexts(folder, entries, texts))
  expect(review.folder.key).toBe('highlight:alunos')
  expect(review.copySourcePath).toBe(`${root}/01-destaques.md`)
  expect(review.files.map((file) => file.path.split('/').at(-1))).toEqual([
    '01-convite.png',
    '02-fernando.png',
  ])
  expect(review.files.every((file) => file.alt === null)).toBe(true)
  expect(review.state).toBe('incomplete')
  expect(productionFolderFromPath(`${root}/producao/destaques/quem-somos`)?.key).toBe(
    'highlight:sobre-nos',
  )
  expect(productionFolderFromPath(`${root}/producao/fixados/00-invalido`)).toBeNull()
  expect(productionFolderFromPath(`${root}/producao/fixados/01-primeiro/../../outside`)).toBeNull()
})
test('descrições sem arquivo exato e sequências quebradas ficam como pendências rastreáveis', () => {
  const f = pinned()
  f.texts.set(
    `${f.folder.path}/texto-alternativo.txt`,
    '01-outra.png\nNão corresponde.\n\n03-slide.png\nLacuna.',
  )
  f.entries = f.entries.map((entry) =>
    entry.path.endsWith('/02-slide.png')
      ? { ...entry, path: entry.path.replace('/02-slide.png', '/03-slide.png') }
      : entry,
  )
  const review = productionReviewFromTexts(f.folder, f.entries, f.texts)
  expect(review.state).toBe('incomplete')
  expect(review.files[0]?.alt).toBeNull()
  expect(review.issues.some((issue) => issue.message.includes('Sequência'))).toBe(true)
  expect(review.issues.some((issue) => issue.message.includes('sem arquivo correspondente'))).toBe(
    true,
  )
})
