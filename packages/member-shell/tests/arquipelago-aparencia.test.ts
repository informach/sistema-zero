import { expect, test } from 'bun:test'
import {
  AparenciaLidaSchema,
  CATALOGO_DE_OBJETOS,
  planificacaoDoMolde,
} from '@sistemazero/arquipelago-contracts'
import { assetToJson, createModelAsset } from '@sistemazero/molda/assets'
import {
  exportarAparenciaDaCriacao,
  type LeituraDeAparencia,
  lerAparenciaDaConta,
  listarCriacoesQueCabem,
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
      async listar(f) {
        chamadas.push(`listar:${f}`)
        return []
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

/** Um PNG só com o cabeçalho no tamanho pedido (a régua lê o IHDR). */
function pngDe(largura: number, altura: number): Uint8Array<ArrayBuffer> {
  const b = new Uint8Array(33)
  const v = new DataView(b.buffer)
  v.setUint32(0, 0x89504e47)
  v.setUint32(4, 0x0d0a1a0a)
  v.setUint32(8, 13)
  v.setUint32(12, 0x49484452)
  v.setUint32(16, largura)
  v.setUint32(20, altura)
  return b
}
const resumo = (itemId: string, kind: string, em: number, extra: object = {}) => ({
  itemId,
  name: itemId,
  kind,
  itemUpdatedAt: em,
  revision: 1,
  bytes: 10,
  thumb: null,
  syncedAt: em,
  ...extra,
})

test('A30: só entram as criações que cabem no molde, da mais nova à mais antiga', async () => {
  const molde = CATALOGO_DE_OBJETOS.geladeira.molde
  const plan = planificacaoDoMolde(molde)!
  const modelo = createModelAsset({
    name: 'geladeira',
    starterBox: { width: 13, height: 28, depth: 13.5 },
  })
  const glb = await exportarAparenciaDaCriacao(
    'dona',
    'molda',
    JSON.stringify(assetToJson(modelo)),
    modelo.id,
    new AbortController().signal,
  )
  const p = porta({
    async listar(f) {
      return f === 'pinta'
        ? [
            resumo('certa-velha', 'pixel-background', 1),
            resumo('torta', 'pixel-background', 2),
            resumo('certa-nova', 'pixel-background', 3),
            resumo('apagada', 'pixel-background', 4, { deletedAt: 5 }),
            resumo('boneco', 'pixel-sprite', 5),
          ]
        : [resumo('caixa', 'model', 1, { thumb: 'data:image/png;base64,AAAA' })]
    },
    async baixar(_f, id) {
      return id
    },
    async exportar(f, json) {
      if (f === 'molda') return glb
      return {
        tipo: 'pinta',
        bytes: json === 'torta' ? pngDe(8, 8) : pngDe(plan.largura, plan.altura),
      }
    },
  })
  const lista = await listarCriacoesQueCabem('dona', molde, undefined, p.porta)
  expect(lista.map((c) => `${c.ferramenta}:${c.id}`)).toEqual([
    'pinta:certa-nova',
    'pinta:certa-velha',
    'molda:caixa',
  ])
  expect(lista[0]!.miniatura).toStartWith('data:image/png;base64,')
  expect(lista[2]!.miniatura).toBe('data:image/png;base64,AAAA')
  expect(p.chamadas).not.toContain('baixar:pinta:boneco')
})

test('A30: ferramenta fechada ou de outro perfil não lista nada dela', async () => {
  const p = porta({
    async acesso(f) {
      return f === 'pinta'
        ? { viewerId: 'irmao', situacao: 'disponivel' }
        : { viewerId: 'dona', situacao: 'bloqueada' }
    },
  })
  expect(
    await listarCriacoesQueCabem('dona', CATALOGO_DE_OBJETOS.geladeira.molde, undefined, p.porta),
  ).toEqual([])
  expect(p.chamadas.filter((c) => c.startsWith('listar'))).toEqual([])
})
