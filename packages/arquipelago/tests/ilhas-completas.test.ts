import { describe, expect, test } from 'bun:test'
import { ilha } from '@sistemazero/arquipelago-contracts'
import { BoxGeometry, Group, Mesh, MeshStandardMaterial, Texture } from 'three'
import { buscarIlha, ilhasNaMemoria, reterIlha, soltarIlha } from '../src/mundo/carregar-ilha'
import { usarSuave } from '../src/mundo/copas'
import { aplicarOpacidade, prepararIlha, soltarExtras } from '../src/mundo/ilha-completa'
import {
  centroNoAnel,
  DISTANCIA_DA_TROCA,
  naPonteDa,
  nivelDeDetalhe,
  PRIORIDADE_DA_FISICA,
  RAIO_DA_ILHA_DO_ANEL,
  trajetoDaPonte,
} from '../src/mundo/medidas'
import {
  completaColide,
  completaNaCena,
  type EstadoDaIlha,
  esmaecer,
  esperandoPeloChao,
  opacidadeAlvo,
  PRIORIDADE_DA_CARGA_DA_ILHA,
  proximoEstadoDaIlha,
  type SinaisDaIlha,
} from '../src/sistemas/ilhas-completas'

const parado: SinaisDaIlha = {
  perto: false,
  naTroca: false,
  carregada: false,
  falhou: false,
  saiuDeVista: true,
}

function passo(atual: EstadoDaIlha, s: Partial<SinaisDaIlha>): EstadoDaIlha {
  return proximoEstadoDaIlha(atual, { ...parado, ...s })
}

describe('o ciclo da ilha completa', () => {
  test('ida e volta: longe → carregando → pronta → ativa → descarregando → longe', () => {
    expect(passo('longe', {})).toBe('longe')
    expect(passo('longe', { perto: true })).toBe('carregando')
    expect(passo('carregando', { perto: true })).toBe('carregando')
    expect(passo('carregando', { perto: true, carregada: true })).toBe('pronta')
    // Pronta espera a pessoa chegar no meio da ponte para trocar.
    expect(passo('pronta', { perto: true, carregada: true })).toBe('pronta')
    expect(passo('pronta', { perto: true, naTroca: true, carregada: true })).toBe('ativa')
    // Andar pela ilha e voltar para a ponte não descarrega.
    expect(passo('ativa', { perto: true, carregada: true })).toBe('ativa')
    expect(passo('ativa', { carregada: true })).toBe('descarregando')
    expect(passo('descarregando', { carregada: true, saiuDeVista: false })).toBe('descarregando')
    expect(passo('descarregando', { carregada: true, saiuDeVista: true })).toBe('longe')
  })

  test('meia-volta: sair da ponte no meio da carga solta tudo; voltar a tempo reativa', () => {
    expect(passo('carregando', {})).toBe('descarregando')
    expect(passo('pronta', { carregada: true })).toBe('descarregando')
    expect(
      passo('descarregando', { perto: true, naTroca: true, carregada: true, saiuDeVista: false }),
    ).toBe('ativa')
    // Sem o arquivo na memória, a volta passa por longe e carrega de novo.
    expect(passo('descarregando', { perto: true, naTroca: true, saiuDeVista: true })).toBe('longe')
  })

  test('falha: fica a versão leve, sem pedir de novo até a pessoa se afastar', () => {
    expect(passo('carregando', { perto: true, falhou: true })).toBe('longe')
    expect(passo('longe', { perto: true, falhou: true })).toBe('longe')
    expect(passo('longe', { perto: true, falhou: false })).toBe('carregando')
  })

  test('só a ativa colide; entrando ou saindo, as duas aparecem', () => {
    expect(completaColide('ativa')).toBe(true)
    for (const e of ['longe', 'carregando', 'pronta', 'descarregando'] as const) {
      expect(completaColide(e)).toBe(false)
    }
    expect(completaNaCena('ativa')).toBe(true)
    expect(completaNaCena('descarregando')).toBe(true)
    expect(completaNaCena('pronta')).toBe(false)
    expect(opacidadeAlvo('ativa')).toBe(1)
    expect(opacidadeAlvo('descarregando')).toBe(0)
  })

  test('o esmaecer anda pela duração e para no alvo', () => {
    expect(esmaecer(0, 1, 0.4, 0.8)).toBeCloseTo(0.5)
    expect(esmaecer(0.9, 1, 0.4, 0.8)).toBe(1)
    expect(esmaecer(0.3, 0, 0.4, 0.8)).toBe(0)
    expect(esmaecer(0.5, 0.5, 1, 0.8)).toBe(0.5)
  })
})

describe('onde a ilha começa a carregar e onde ela troca', () => {
  const bosque = ilha('bosque')
  const centro = centroNoAnel(bosque)

  test('a ponte do Bosque é reconhecida do começo ao fim, e só ela', () => {
    for (const p of trajetoDaPonte(bosque, 12)) expect(naPonteDa(bosque, p.x, p.z)).toBe(true)
    expect(naPonteDa(bosque, 0, 0)).toBe(false)
    const vila = trajetoDaPonte(ilha('vila-doce'), 4)[2]
    expect(vila && naPonteDa(bosque, vila.x, vila.z)).toBe(false)
  })

  test('a carga começa na cabeça da ponte e a troca acontece no meio dela', () => {
    const ponte = trajetoDaPonte(bosque, 20)
    const inicio = ponte[0]
    const fim = ponte.at(-1)
    if (!inicio || !fim) throw new Error('sem ponte')
    const d0 = Math.hypot(inicio.x - centro.x, inicio.z - centro.z)
    expect(nivelDeDetalhe(d0, naPonteDa(bosque, inicio.x, inicio.z))).not.toBe('silhueta')
    expect(d0).toBeGreaterThan(DISTANCIA_DA_TROCA)
    const d1 = Math.hypot(fim.x - centro.x, fim.z - centro.z)
    expect(d1).toBeLessThan(DISTANCIA_DA_TROCA)
    // Na ilha central, nem perto.
    expect(nivelDeDetalhe(Math.hypot(centro.x, centro.z), false)).toBe('silhueta')
    expect(nivelDeDetalhe(RAIO_DA_ILHA_DO_ANEL - 2, false)).toBe('completa')
  })
})

describe('memória das ilhas completas', () => {
  function cenaFalsa() {
    const g = new Group()
    const material = new MeshStandardMaterial()
    const mesh = new Mesh(undefined, material)
    g.add(mesh)
    let soltas = 0
    mesh.geometry.addEventListener('dispose', () => soltas++)
    material.addEventListener('dispose', () => soltas++)
    return { g, soltas: () => soltas }
  }

  test('no máximo uma ilha completa por vez, e soltar libera geometria e material', async () => {
    const a = cenaFalsa()
    const b = cenaFalsa()
    await buscarIlha('a.glb', async () => a.g)
    expect(ilhasNaMemoria()).toBe(1)
    await buscarIlha('b.glb', async () => b.g)
    expect(ilhasNaMemoria()).toBe(1)
    expect(a.soltas()).toBe(2)
    soltarIlha('b.glb')
    expect(b.soltas()).toBe(2)
    expect(ilhasNaMemoria()).toBe(0)
  })

  test('soltar antes de o arquivo chegar solta assim que ele chega', async () => {
    const a = cenaFalsa()
    let entregar: (o: Group) => void = () => {}
    const pedido = buscarIlha('lenta.glb', () => new Promise((r) => (entregar = r)))
    soltarIlha('lenta.glb')
    entregar(a.g)
    await expect(pedido).rejects.toThrow()
    expect(a.soltas()).toBe(2)
    expect(ilhasNaMemoria()).toBe(0)
  })

  test('um pedido que falha some da lista (a próxima visita tenta de novo)', async () => {
    await expect(
      buscarIlha('quebrada.glb', async () => Promise.reject(new Error('rede'))),
    ).rejects.toThrow('rede')
    expect(ilhasNaMemoria()).toBe(0)
  })

  test('cancelar durante a compilação espera o usuário da cena e libera extras antes da malha', async () => {
    const a = cenaFalsa()
    await buscarIlha('compilando.glb', async () => a.g)
    let extras = 0
    const retencao = reterIlha('compilando.glb', a.g, () => {
      expect(a.soltas()).toBe(0)
      extras++
    })
    expect(retencao).not.toBeNull()
    soltarIlha('compilando.glb')
    expect(retencao?.ativa()).toBe(false)
    expect(a.soltas()).toBe(0)
    const nova = cenaFalsa()
    await buscarIlha('compilando.glb', async () => nova.g)
    retencao?.liberar()
    retencao?.liberar()
    expect(extras).toBe(1)
    expect(a.soltas()).toBe(2)
    expect(nova.soltas()).toBe(0)
    soltarIlha('compilando.glb')
    expect(nova.soltas()).toBe(2)
  })
})

describe('o esmaecer dos materiais', () => {
  test('cancelar a compilação libera original substituído, opaco, transparente, textura e geometria uma vez', async () => {
    const texture = new Texture()
    const original = new MeshStandardMaterial({ map: texture })
    const geometry = new BoxGeometry()
    const mesh = new Mesh(geometry, original)
    mesh.name = 'copa-teste'
    const scene = new Group().add(mesh)
    await buscarIlha('copas-canceladas.glb', async () => scene)
    const p = prepararIlha(scene, ilha('bosque'))
    const copa = p.copas[0]
    if (!copa?.materiais[0] || !copa.suaves[0]) throw new Error('Copa não preparada')
    const disposals = { original: 0, opaque: 0, transparent: 0, geometry: 0, texture: 0 }
    original.addEventListener('dispose', () => disposals.original++)
    copa.materiais[0].addEventListener('dispose', () => disposals.opaque++)
    copa.suaves[0].addEventListener('dispose', () => disposals.transparent++)
    geometry.addEventListener('dispose', () => disposals.geometry++)
    texture.addEventListener('dispose', () => disposals.texture++)
    const lease = reterIlha('copas-canceladas.glb', scene, () => soltarExtras(p))
    usarSuave(copa, true)
    soltarIlha('copas-canceladas.glb')
    expect(Object.values(disposals)).toEqual([0, 0, 0, 0, 0])
    lease?.liberar()
    lease?.liberar()
    expect(disposals).toEqual({ original: 1, opaque: 1, transparent: 1, geometry: 1, texture: 1 })
  })
  test('pontilha só no meio da troca e respeita a água transparente', () => {
    const chao = new MeshStandardMaterial()
    const agua = new MeshStandardMaterial({ transparent: true, opacity: 0.25 })
    aplicarOpacidade([chao, agua], 0.5)
    expect(chao.alphaHash).toBe(true)
    expect(chao.opacity).toBeCloseTo(0.5)
    expect(agua.alphaHash).toBe(false)
    expect(agua.opacity).toBeCloseTo(0.125)
    const versao = chao.version
    aplicarOpacidade([chao, agua], 1)
    expect(chao.alphaHash).toBe(false)
    expect(chao.version).toBeGreaterThan(versao)
    expect(agua.opacity).toBeCloseTo(0.25)
  })
})

test('reabrir no deque protege o primeiro quadro antes da física, até o colisor entrar', () => {
  expect(PRIORIDADE_DA_CARGA_DA_ILHA).toBeLessThan(PRIORIDADE_DA_FISICA)
  const sinais = { perto: true, naTroca: true, carregada: false, falhou: false, saiuDeVista: true }
  let estado: EstadoDaIlha = 'longe'
  estado = proximoEstadoDaIlha(estado, sinais)
  expect(esperandoPeloChao(estado, false)).toBe(true)
  estado = proximoEstadoDaIlha(estado, { ...sinais, carregada: true })
  expect(esperandoPeloChao(estado, false)).toBe(true)
  estado = proximoEstadoDaIlha(estado, { ...sinais, carregada: true })
  expect(estado).toBe('ativa')
  expect(esperandoPeloChao(estado, false)).toBe(true)
  expect(esperandoPeloChao(estado, true)).toBe(false)
})
