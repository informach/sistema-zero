import { expect, test } from 'bun:test'
import { AparenciaLidaSchema } from '@sistemazero/arquipelago-contracts'
import { assetToJson, createModelAsset } from '@sistemazero/molda/assets'
import {
  exportarAparenciaDaCriacao,
  type LeituraDeAparencia,
  lerAparenciaDaConta,
} from '../src/lib/arquipelago-aparencia'

test('exporta o modelo real da conta e recusa documento de outro id ou formato', async () => {
  const asset = createModelAsset({
    name: 'molde-geladeira',
    starterBox: { width: 13, height: 28, depth: 13.5 },
  })
  const json = JSON.stringify(assetToJson(asset))
  const signal = new AbortController().signal
  const r = await exportarAparenciaDaCriacao('dona', 'molda', json, asset.id, signal)
  expect(AparenciaLidaSchema.safeParse(r).success).toBe(true)
  expect(await exportarAparenciaDaCriacao('dona', 'molda', json, 'outro', signal)).toBeNull()
  expect(
    await exportarAparenciaDaCriacao('dona', 'molda', '{"formatVersion":999}', asset.id, signal),
  ).toBeNull()
})

const png = Uint8Array.from(
  atob(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLttAAAAABJRU5ErkJggg==',
  ),
  (c) => c.charCodeAt(0),
)
function porta(mudar: Partial<LeituraDeAparencia> = {}) {
  const chamadas: string[] = []
  return {
    chamadas,
    porta: {
      async acesso(f) {
        chamadas.push(`acesso:${f}`)
        return { viewerId: 'dona', situacao: 'disponivel' }
      },
      async baixar(f, id) {
        chamadas.push(`baixar:${f}:${id}`)
        return f === 'pinta' ? '{}' : null
      },
      async exportar(f) {
        chamadas.push(`exportar:${f}`)
        return { tipo: 'pinta', bytes: png }
      },
      ...mudar,
    } satisfies LeituraDeAparencia,
  }
}
test('lê somente depois da autorização da pessoa desta montagem', async () => {
  const p = porta()
  expect((await lerAparenciaDaConta('dona', 'criacao', undefined, p.porta))?.tipo).toBe('pinta')
  expect(p.chamadas).toEqual([
    'acesso:molda',
    'baixar:molda:criacao',
    'acesso:pinta',
    'baixar:pinta:criacao',
    'exportar:pinta',
  ])
})
test('outro perfil ou ferramenta bloqueada nunca baixa', async () => {
  for (const acesso of [
    { viewerId: 'irmao', situacao: 'disponivel' },
    { viewerId: 'dona', situacao: 'bloqueada' },
    null,
  ]) {
    const p = porta({
      async acesso() {
        return acesso
      },
    })
    expect(await lerAparenciaDaConta('dona', 'criacao', undefined, p.porta)).toBeNull()
    expect(p.chamadas).toEqual([])
  }
})
test('recusa id de rota, falha, excesso e aborto sem exportar', async () => {
  const p = porta()
  expect(await lerAparenciaDaConta('dona', '../irmao', undefined, p.porta)).toBeNull()
  expect(p.chamadas).toEqual([])
  const c = new AbortController()
  const aborted = porta({
    async baixar() {
      c.abort()
      return '{}'
    },
  })
  expect(await lerAparenciaDaConta('dona', 'criacao', c.signal, aborted.porta)).toBeNull()
  expect(aborted.chamadas).not.toContain('exportar:molda')
  expect(
    await lerAparenciaDaConta(
      'dona',
      'criacao',
      undefined,
      porta({
        async baixar() {
          throw new Error('403')
        },
      }).porta,
    ),
  ).toBeNull()
  expect(
    await lerAparenciaDaConta(
      'dona',
      'criacao',
      undefined,
      porta({
        async exportar() {
          return { tipo: 'pinta', bytes: new Uint8Array(300_000) }
        },
      }).porta,
    ),
  ).toBeNull()
})
