import { expect, test } from 'bun:test'
import {
  JogosDoMuralSchema,
  MoldeDoJogoDoMuralSchema,
  type Plataforma,
} from '@sistemazero/arquipelago-contracts'
import { criarListaDoMural } from '../src/estado/mural'

const jogo = { playId: '11111111-1111-4111-8111-111111111111', titulo: 'Bolhas' }
test('contrato pequeno só aceita referências de publicação, nunca URL ou fonte', () => {
  expect(JogosDoMuralSchema.safeParse({ jogos: [jogo] }).success).toBe(true)
  expect(JogosDoMuralSchema.safeParse({ jogos: Array(25).fill(jogo) }).success).toBe(false)
  expect(JogosDoMuralSchema.safeParse({ jogos: [{ ...jogo, projeto: {} }] }).success).toBe(false)
  expect(MoldeDoJogoDoMuralSchema.safeParse({ playId: jogo.playId }).success).toBe(true)
  for (const molde of [
    { playId: 'https://externo.invalid' },
    { playId: jogo.playId, url: '/outro' },
    null,
  ]) {
    expect(MoldeDoJogoDoMuralSchema.safeParse(molde).success).toBe(false)
  }
})

test('lista deduplica leitura, descarta jogos retirados e permite repetir após falha', async () => {
  let concluir!: (r: { status: number; corpo: unknown }) => void
  const chamadas: string[] = []
  const fonte = criarListaDoMural({
    servico: {
      buscar: (caminho: string) => {
        chamadas.push(caminho)
        return new Promise((resolve) => {
          concluir = resolve
        })
      },
    },
  } as unknown as Plataforma)
  const primeira = fonte.carregar()
  expect(fonte.carregar()).toBe(primeira)
  expect(chamadas).toEqual(['/mural'])
  concluir({ status: 200, corpo: { jogos: [jogo] } })
  await primeira
  expect(fonte.estado.getState()).toEqual({ lista: [jogo], situacao: 'pronta' })
  const retirada = fonte.carregar()
  expect(fonte.estado.getState().lista).toEqual([])
  concluir({ status: 200, corpo: { jogos: [] } })
  await retirada
  expect(fonte.estado.getState()).toEqual({ lista: [], situacao: 'pronta' })
  const erro = fonte.carregar()
  concluir({ status: 200, corpo: { jogos: [{ playId: 'fora' }] } })
  await erro
  expect(fonte.estado.getState()).toEqual({ lista: [], situacao: 'erro' })
  const repetida = fonte.carregar()
  concluir({ status: 200, corpo: { jogos: [jogo] } })
  await repetida
  expect(fonte.estado.getState().lista).toEqual([jogo])
})
