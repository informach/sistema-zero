import { expect, spyOn, test } from 'bun:test'
import { Box3, Mesh, MeshStandardMaterial, Scene } from 'three'
import { encodeAssetBase64 } from '../../core/assetBinary'
import { createEmptyProject } from '../../core/project'
import { PROJECT_ASSET_LIMITS } from '../../core/projectAssets'
import { prepararImportacaoDeCena3D } from '../../core/scene3d/importar'
import { criarFonteDeCenarioDeEnsaio } from '../../testing/moldaSceneFixture'
import { carregarCena3DDoProjeto } from '../scene3d'

async function projeto() {
  const { host, resumo, fonte } = await criarFonteDeCenarioDeEnsaio(2),
    aberto = await host.abrirCenario(resumo.id),
    salvo = await host.editarCenario(
      resumo.id,
      resumo.revisao,
      [
        {
          tipo: 'cenario.restaurar',
          documento: {
            ...aberto.documento,
            iluminacao: { ...aberto.documento.iluminacao, ceu: { tipo: 'cor', cor: '#89bbdd' } },
          },
        },
      ],
      'ambiente-do-runtime',
    ),
    { pacote } = await fonte.preparar(resumo.id, salvo.revisao, {
      signal: new AbortController().signal,
      juntar: false,
    }),
    plano = await prepararImportacaoDeCena3D(createEmptyProject('cena', 'Meu programa'), pacote)
  return { plano, pacote }
}

test('resolve pelo ID e usa o runtime canônico, preservando fonte, matrizes e descarte em três ciclos', async () => {
  const { plano, pacote } = await projeto()
  for (let ciclo = 0; ciclo < 3; ciclo++) {
    const r = await carregarCena3DDoProjeto(
      plano.assetId,
      plano.assets,
      new AbortController().signal,
    )
    expect(r.cena instanceof Scene).toBe(true)
    expect(JSON.stringify(r.dados)).toBe(JSON.stringify(pacote.cena))
    expect(r.raiz.children.map((n) => [...n.matrix.elements])).toEqual(
      r.dados.nos.map((n) => n.matriz),
    )
    expect(new Box3().setFromObject(r.raiz).isEmpty()).toBe(false)
    const geometrias = new Set(),
      materiais = new Set()
    let geometriasSoltas = 0,
      materiaisSoltos = 0
    r.raiz.traverse((n) => {
      if (!(n instanceof Mesh)) return
      if (!geometrias.has(n.geometry)) {
        geometrias.add(n.geometry)
        n.geometry.addEventListener('dispose', () => geometriasSoltas++)
      }
      for (const m of Array.isArray(n.material) ? n.material : [n.material]) {
        if (materiais.has(m)) continue
        materiais.add(m)
        m.addEventListener('dispose', () => materiaisSoltos++)
      }
    })
    r.atualizar(1 / 60)
    r.descartar()
    const soltos = [geometriasSoltas, materiaisSoltos]
    expect(geometriasSoltas).toBe(geometrias.size)
    expect(materiaisSoltos).toBe(materiais.size)
    expect(r.cena.children).toHaveLength(0)
    expect(r.colisoes.arvores).toBe(0)
    r.descartar()
    expect([geometriasSoltas, materiaisSoltos]).toEqual(soltos)
  }
})

test('não resolve por nome e recusa recurso ausente ou bytes adulterados', async () => {
  const { plano } = await projeto(),
    sinal = new AbortController().signal,
    cena = plano.assets.find((a) => a.id === plano.assetId)!,
    modelo = plano.assets.find((a) => a.kind === 'model3d')!
  await expect(carregarCena3DDoProjeto(cena.name, plano.assets, sinal)).rejects.toThrow(/cenário/i)
  await expect(carregarCena3DDoProjeto(modelo.id, plano.assets, sinal)).rejects.toThrow(/cenário/i)
  await expect(
    carregarCena3DDoProjeto(
      plano.assetId,
      plano.assets.filter((a) => a !== modelo),
      sinal,
    ),
  ).rejects.toThrow(/precisa/)
  await expect(
    carregarCena3DDoProjeto(
      plano.assetId,
      plano.assets.map((a) =>
        a === modelo
          ? {
              ...a,
              dataUrl: `data:model/gltf-binary;base64,${encodeAssetBase64(new Uint8Array([1, 2, 3]))}`,
            }
          : a,
      ),
      sinal,
    ),
  ).rejects.toThrow()
})

test('captura os bytes e opções antes da primeira espera, sem reter alterações posteriores', async () => {
  const { plano, pacote } = await projeto(),
    opcoes = { maxTextura: 4096 },
    carregar = carregarCena3DDoProjeto(
      plano.assetId,
      plano.assets,
      new AbortController().signal,
      opcoes,
    )
  opcoes.maxTextura = 1
  for (const a of plano.assets) a.dataUrl = 'data:application/octet-stream;base64,AQ=='
  const r = await carregar
  try {
    expect(JSON.stringify(r.dados)).toBe(JSON.stringify(pacote.cena))
  } finally {
    r.descartar()
  }
})

test('cancelamento antes e entre recursos não entrega uma cena parcial', async () => {
  const { plano } = await projeto(),
    antes = new AbortController()
  antes.abort()
  await expect(
    carregarCena3DDoProjeto(plano.assetId, plano.assets, antes.signal),
  ).rejects.toHaveProperty('name', 'AbortError')
  const durante = new AbortController()
  let lidos = 0
  await expect(
    carregarCena3DDoProjeto(plano.assetId, plano.assets, durante.signal, {
      progresso(pronto) {
        lidos = pronto
        if (pronto === 1) durante.abort()
      },
    }),
  ).rejects.toHaveProperty('name', 'AbortError')
  expect(lidos).toBe(1)
})

test('cancelamento na microtarefa da entrega descarta o resultado já carregado', async () => {
  const { plano } = await projeto(),
    controle = new AbortController(),
    descartar = spyOn(MeshStandardMaterial.prototype, 'dispose')
  try {
    await expect(
      carregarCena3DDoProjeto(plano.assetId, plano.assets, controle.signal, {
        progresso(pronto, total) {
          if (pronto && pronto === total) queueMicrotask(() => controle.abort())
        },
      }),
    ).rejects.toHaveProperty('name', 'AbortError')
    expect(descartar.mock.calls.length).toBeGreaterThan(0)
  } finally {
    descartar.mockRestore()
  }
})

test('orçamento do transporte é conferido antes de decodificar recursos', async () => {
  const { plano } = await projeto(),
    cena = plano.assets.find((a) => a.id === plano.assetId)!,
    sinal = new AbortController().signal,
    demais = Array.from({ length: PROJECT_ASSET_LIMITS.maxAssetsCount + 1 }, (_, i) => ({
      ...cena,
      id: `extra-${i}`,
    }))
  await expect(carregarCena3DDoProjeto(plano.assetId, demais, sinal)).rejects.toThrow(
    /limite de arquivos/,
  )
  await expect(
    carregarCena3DDoProjeto(
      plano.assetId,
      [{ ...cena, dataUrl: 'x'.repeat(PROJECT_ASSET_LIMITS.maxAssetsTotalChars + 1) }],
      sinal,
    ),
  ).rejects.toThrow(/espaço do projeto/)
})
