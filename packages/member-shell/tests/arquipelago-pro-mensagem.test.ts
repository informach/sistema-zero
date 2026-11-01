import { expect, test } from 'bun:test'
import { avisarOJogo, enderecoDoPro, lerMensagemDoPro } from '../src/lib/arquipelago-pro-mensagem'

/** O Pro num quadro por cima do jogo (lacunas, 01/11/2026): o que entra e o que sai. */
const desafioId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const quadro = {} as Window
const origem = 'https://kids.exemplo.com'

test('só a mensagem do próprio quadro, da mesma origem e no formato combinado', () => {
  const saiu = { tipo: 'arquipelago-pro', evento: 'saiu' } as const
  expect(lerMensagemDoPro({ origin: origem, source: quadro, data: saiu }, quadro, origem)).toEqual(
    saiu,
  )
  const fim = { tipo: 'arquipelago-pro', evento: 'desafio', desafioId, concluido: true } as const
  expect(lerMensagemDoPro({ origin: origem, source: quadro, data: fim }, quadro, origem)).toEqual(
    fim,
  )
  // Outra origem, outra janela, sem quadro ou fora do formato: nada.
  expect(
    lerMensagemDoPro({ origin: 'https://outro.com', source: quadro, data: saiu }, quadro, origem),
  ).toBeNull()
  expect(
    lerMensagemDoPro({ origin: origem, source: {} as Window, data: saiu }, quadro, origem),
  ).toBeNull()
  expect(lerMensagemDoPro({ origin: origem, source: quadro, data: saiu }, null, origem)).toBeNull()
  expect(
    lerMensagemDoPro(
      { origin: origem, source: quadro, data: { ...fim, concluido: 'sim' } },
      quadro,
      origem,
    ),
  ).toBeNull()
  expect(
    lerMensagemDoPro(
      { origin: origem, source: quadro, data: { ...saiu, extra: 1 } },
      quadro,
      origem,
    ),
  ).toBeNull()
})

test('a rota avisa só o jogo que a abriu, para a mesma origem', () => {
  const enviadas: unknown[][] = []
  const pai = { postMessage: (...args: unknown[]) => enviadas.push(args) }
  const noQuadro = { parent: pai, location: { origin: origem } } as unknown as Window
  expect(avisarOJogo({ tipo: 'arquipelago-pro', evento: 'saiu' }, noQuadro)).toBe(true)
  expect(enviadas).toEqual([[{ tipo: 'arquipelago-pro', evento: 'saiu' }, origem]])
  // Fora de um quadro, não avisa ninguém.
  const sozinha = { location: { origin: origem } } as unknown as Window & { parent: Window }
  sozinha.parent = sozinha
  expect(avisarOJogo({ tipo: 'arquipelago-pro', evento: 'saiu' }, sozinha)).toBe(false)
})

test('os endereços da rota isolada levam o embed do jogo', () => {
  expect(enderecoDoPro({ projetoId: 'abc_1' })).toBe('/estudio/pro/abc_1?embed=arquipelago')
  expect(enderecoDoPro({ desafioId, revisao: 3 })).toBe(
    `/estudio/pro/desafio/${desafioId}?revisao=3&embed=arquipelago`,
  )
})
