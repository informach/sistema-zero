import { expect, test } from 'bun:test'
import type { InventoryEntry } from '@sistemazero/marketing-contracts'
import { classifySource } from '../src/inventory-policy'
import {
  parseProductionAlt,
  parseProductionCopy,
  productionFolders,
  reviewProduction,
} from '../src/production-review'
import { parseStructuredCopy } from '../src/structured-copy'

const folder = {
  path: 'docs/marketing/kids/produto/instagram/producao/postagens/p01-titulo',
  key: 'P01',
  product: 'produto',
}
const sourcePath = 'docs/marketing/kids/produto/instagram/postagens/copy.md'
const copy =
  '## P01 · Título\n**Formato:** Carrossel, 2 slides.\n### Slide 1\n> Olá.\n### Slide 2\n> Segunda tela.\n### Legenda\n> Legenda.\n'
function fixture() {
  const piece = parseStructuredCopy(copy).pieces[0]
  if (!piece) throw new Error('Fixture inválida')
  const paths = [
    '01-p01.png',
    '02-p01.png',
    'apoio/copy.json',
    'legenda.txt',
    'texto-alternativo.txt',
    'apoio/imagem.png',
    'preview.png',
  ]
  const entries: InventoryEntry[] = paths.map((relative) => {
    const path = `${folder.path}/${relative}`
    return {
      path,
      kind: 'file',
      ...classifySource('sistema-zero', path, false),
      sha256: 'a'.repeat(64),
      bytes: 120,
    }
  })
  const texts = new Map([
    [
      `${folder.path}/apoio/copy.json`,
      JSON.stringify({
        id: 'P01',
        slides: [['Olá.'], ['Segunda tela.']],
        caption: 'Legenda.',
        source: sourcePath,
        script: 'not executed',
      }),
    ],
    [`${folder.path}/legenda.txt`, 'Legenda.\r\n'],
    [
      `${folder.path}/texto-alternativo.txt`,
      'SLIDE 1\nCurto (4 caracteres): Um.\n\nLongo: Primeira arte.\n\nSLIDE 2\nCurto: Dois.\nLongo: Segunda arte.',
    ],
  ])
  return { folder, entries, texts, copy: { sourcePath, piece } }
}
test('reconcilia ordem e conteúdo literal sem tratar apoio como entrega nem aprovar a peça', () => {
  const input = fixture(),
    result = reviewProduction(input)
  expect(productionFolders(input.entries)).toEqual([folder])
  expect(result.state).toBe('ready-for-review')
  expect(result.files.map((file) => [file.position, file.alt?.short])).toEqual([
    [1, 'Um.'],
    [2, 'Dois.'],
  ])
  expect(result.matchingCopies).toEqual([`${folder.path}/apoio/copy.json`])
  expect(result.issues).toEqual([])
  input.texts.set(`${folder.path}/legenda.txt`, 'Legenda alterada.')
  expect(reviewProduction(input).state).toBe('divergent')
  expect(
    reviewProduction(input).issues.some((issue) => issue.message.includes('preservar ambas')),
  ).toBe(true)
})
test('NFC e espaços são equivalentes; pontuação e palavras diferentes continuam divergentes', () => {
  const input = fixture()
  input.texts.set(
    `${folder.path}/apoio/copy.json`,
    JSON.stringify({
      id: 'P01',
      slides: [['Ola\u0301.'], ['Segunda\n\ntela.']],
      caption: ' Legenda. ',
      source: sourcePath,
    }),
  )
  expect(reviewProduction(input).state).toBe('ready-for-review')
  input.texts.set(
    `${folder.path}/apoio/copy.json`,
    JSON.stringify({
      id: 'P01',
      slides: [['Olá!'], ['Segunda tela.']],
      caption: 'Legenda.',
      source: sourcePath,
    }),
  )
  expect(reviewProduction(input).state).toBe('divergent')
})
test('versões de montagem são comparadas pelo conteúdo sem escolher o maior número da pasta', () => {
  const input = fixture()
  const source = input.entries[2]
  if (!source) throw new Error('Fixture inválida')
  for (const version of ['v3', 'v4']) {
    const path = `${folder.path}/apoio/${version}/copy-fonte.md`
    input.entries.push({ ...source, path })
    input.texts.set(
      path,
      version === 'v3' ? copy : copy.replace('Segunda tela.', 'Texto diferente.'),
    )
  }
  input.texts.delete(`${folder.path}/apoio/copy.json`)
  input.entries = input.entries.filter((entry) => !entry.path.endsWith('/copy.json'))
  const result = reviewProduction(input)
  expect(result.state).toBe('ready-for-review')
  expect(result.matchingCopies).toEqual([`${folder.path}/apoio/v3/copy-fonte.md`])
})
test('recusa lacunas, duplicação, produto diferente e identidade incompatível, mantendo ausência explícita', () => {
  const input = fixture()
  input.entries = input.entries.filter((entry) => !entry.path.endsWith('01-p01.png'))
  expect(reviewProduction(input).issues.some((issue) => issue.message.includes('Sequência'))).toBe(
    true,
  )
  const duplicate = fixture(),
    first = duplicate.entries[0]
  if (!first) throw new Error('Fixture inválida')
  duplicate.entries.push({ ...first, path: first.path.replace('.png', '.jpg') })
  expect(reviewProduction(duplicate).state).toBe('incomplete')
  const other = fixture()
  other.copy.sourcePath = sourcePath.replace('/produto/', '/outro/')
  expect(
    reviewProduction(other).issues.some((issue) => issue.message.includes('mesma origem/produto')),
  ).toBe(true)
  expect(() => reviewProduction({ ...fixture(), folder: { ...folder, key: 'P02' } })).toThrow(
    'Pasta',
  )
  const missing = fixture()
  missing.entries = missing.entries.filter((entry) => !entry.path.endsWith('.png'))
  expect(reviewProduction(missing).state).toBe('incomplete')
})
test('dados incompletos, caminhos fora da origem e formatos ambíguos não executam nem inventam conteúdo', () => {
  expect(() =>
    parseProductionCopy(
      '{"id":"P01","slides":[["a"]],"art":["b"],"source":"a.md","caption":""}',
      'json',
    ),
  ).toThrow('ambiguidade')
  expect(() =>
    parseProductionCopy('{"id":"P01","art":["a"],"source":"../a.md","caption":""}', 'json'),
  ).toThrow()
  expect(() => parseProductionCopy('x'.repeat(196609), 'md')).toThrow('192 KiB')
  expect(() => parseProductionAlt('SLIDE 2\nCurto: A.\nLongo: B.')).toThrow('Ordem')
  expect(() => parseProductionAlt('IMAGEM ÚNICA\nCurto: A.')).toThrow('incompleto')
  expect(parseProductionAlt('IMAGEM ÚNICA\nCurto: A.\nLongo: B.\nTexto da arte: C.')[0]?.long).toBe(
    'B.\nTexto da arte: C.',
  )
})
