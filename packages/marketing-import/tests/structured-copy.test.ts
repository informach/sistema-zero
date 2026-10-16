import { expect, test } from 'bun:test'
import { parseStructuredCopy } from '../src/structured-copy'

test('roteiro mantém fala, silêncio, sobreposição, cena e tempo sem convertê-los em timeline', () => {
  const source =
    '## P02 · Rotina\n**Formato:** Reel, cerca de 20 s.\n\n| Tempo | Texto na tela | Fala | Cena |\n| --- | --- | --- | --- |\n| 0–5 s | Leia \\| observe | Fala literal. | Captura real. |\n| 5–8 s | Observe | | Sem fala. |\n\n### Legenda\n> Legenda.\n\n**Produção:** Conferir áudio.\n\n## Orientações\n> Não é legenda.\n'
  const result = parseStructuredCopy(source),
    piece = result.pieces[0]
  expect(result.issues).toEqual([])
  expect(piece?.format).toBe('reel')
  expect(piece?.components.map((component) => component.body)).toEqual([
    'Fala literal.',
    '',
    'Legenda.',
  ])
  expect(piece?.components[0]?.productionNotes).toContain('Texto na tela: Leia | observe')
  expect(piece?.components[1]?.productionNotes).toContain('Tempo de referência: 5–8 s')
  expect(piece?.components[2]?.productionNotes).toContain('Conferir áudio.')
  expect(piece?.raw).not.toContain('Não é legenda.')
})
test('ManyChat preserva duas mensagens e destinos, separados da legenda e das artes', () => {
  const piece = parseStructuredCopy(
    '## MC01 · Título\n**Formato:** carrossel 4:5, 1 slide.\n### Slide 1\n> Público.\n**Visual:** Interno.\n### Legenda\n> Legenda.\n### Direct\n**DM1**\n> Primeira.\n**Botão interno:** Abrir\n**DM2 (depois do toque)**\n> Segunda.\n**Botão de site:** Conhecer\nhttps://example.com/?utm_content=mc01\n',
  ).pieces[0]
  expect(
    piece?.components.map((component) => [component.channel, component.key, component.body]),
  ).toEqual([
    ['main', 'slide:1', 'Público.'],
    ['main', 'legenda', 'Legenda.'],
    ['direct', 'dm1', 'Primeira.'],
    ['direct', 'dm2', 'Segunda.'],
  ])
  expect(piece?.components[3]?.productionNotes).toContain('https://example.com/?utm_content=mc01')
  expect(piece?.components[0]?.body).not.toContain('Interno')
})
test('destaques preservam ordem autoral, grupos, notas e identificadores fora de ordem numérica', () => {
  const result = parseStructuredCopy(
    '## Avaliações\n### AV06 · Fernando\n> Relato literal.\n### AV12 · Flávia\n> Outro relato.\n### AV05 · Conhecer\n> Convite.\n## Manutenção\n> Fora do destaque.\n',
  )
  expect(result.pieces[0]?.components.map((component) => component.key)).toEqual([
    'AV06',
    'AV12',
    'AV05',
  ])
  expect(result.pieces[0]?.components[2]?.body).toBe('Convite.')
  expect(result.pieces[0]?.format).toBe('story')
})
test('não inventa formato, não lê exemplos cercados como peças e recusa identidade ambígua', () => {
  const fenced = parseStructuredCopy(
    '## P01 · Título\n**Formato:** Imagem única.\n### Arte\n> Texto público.\n```md\n> Exemplo interno.\n```',
  )
  expect(fenced.pieces[0]?.components[0]?.body).toBe('Texto público.')
  expect(fenced.pieces[0]?.components[0]?.productionNotes).toContain('> Exemplo interno.')
  expect(parseStructuredCopy('## P01 · Sem formato\n### Arte\n> Copy.\n').issues[0]?.key).toBe(
    'P01',
  )
  expect(
    parseStructuredCopy(
      '```md\n## P01 · Exemplo\n**Formato:** Imagem única.\n### Arte\n> Exemplo.\n```',
    ).pieces,
  ).toEqual([])
  expect(() =>
    parseStructuredCopy(
      '## P01 · A\n**Formato:** Imagem única.\n### Arte\n> A\n## P01 · B\n**Formato:** Imagem única.\n### Arte\n> B',
    ),
  ).toThrow('repetida')
  expect(() =>
    parseStructuredCopy(
      '## P01 · A\n**Formato:** Reel.\n| Tempo | Texto na tela | Fala | Cena |\n| --- | --- | --- | --- |\n| 0 | Falta | coluna |',
    ),
  ).toThrow('colunas')
})
