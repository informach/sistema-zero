import { expect, test } from 'bun:test'
import { Scene } from 'three'
import { criarCarregadorPublicado } from '../src/mundo/carregar-cenario-publicado'
import { cenarioPublicadoParaTeste, portaDoCenarioParaTeste } from './fixtures/cenario-publicado'

test('publicação anterior permanece até a GPU terminar; erro conserva versão e troca libera a anterior', async () => {
  const fonte = await cenarioPublicadoParaTeste(),
    porta = await portaDoCenarioParaTeste(fonte),
    alvo = new Scene()
  let falhar = false,
    soltar: (() => void) | undefined,
    entrou: (() => void) | undefined,
    bloquear = false
  let foco = { x: 10, z: -4 }
  const carregador = criarCarregadorPublicado({
    ...porta,
    alvo,
    maxTextura: 4096,
    foco: () => foco,
    async prepararGpu() {
      if (falhar) throw Error('GPU indisponível')
      if (bloquear) {
        entrou?.()
        await new Promise<void>((r) => {
          soltar = r
        })
      }
    },
  })
  try {
    const primeira = (await carregador.carregar('sua-ilha'))!
    expect(alvo.children).toEqual([primeira.cena])
    const segunda = await cenarioPublicadoParaTeste()
    segunda.publicacao.versao = 2
    await porta.usar(segunda)
    falhar = true
    await expect(carregador.carregar('sua-ilha')).rejects.toThrow('GPU indisponível')
    expect(carregador.instalado()).toBe(primeira)
    expect(alvo.children).toEqual([primeira.cena])
    falhar = false
    bloquear = true
    const esperando = new Promise<void>((r) => {
        entrou = r
      }),
      trocando = carregador.carregar('sua-ilha')
    await Promise.race([esperando, trocando])
    expect(alvo.children).toEqual([primeira.cena])
    foco = { x: 500, z: 500 }
    soltar!()
    const nova = (await trocando)!
    expect(nova.publicacao.versao).toBe(2)
    expect(nova.raiz.children[0]!.visible).toBe(false)
    expect(nova.colisao.celula).toEqual({ x: 6, z: 6 })
    expect(primeira.cena.children).toHaveLength(0)
    expect(alvo.children).toEqual([nova.cena])
    await porta.usar(null)
    expect(await carregador.carregar('sua-ilha')).toBeNull()
    expect(alvo.children).toHaveLength(0)
  } finally {
    carregador.descartar()
  }
})

test('desmontagem durante preparo GPU não ativa nem conserva uma cena parcial', async () => {
  const porta = await portaDoCenarioParaTeste(await cenarioPublicadoParaTeste()),
    alvo = new Scene()
  let soltar: (() => void) | undefined, entrou: (() => void) | undefined
  const esperando = new Promise<void>((r) => {
      entrou = r
    }),
    carregador = criarCarregadorPublicado({
      ...porta,
      alvo,
      maxTextura: 4096,
      foco: () => ({ x: 10, z: -4 }),
      async prepararGpu() {
        entrou!()
        await new Promise<void>((r) => {
          soltar = r
        })
      },
    }),
    carregando = carregador.carregar('sua-ilha')
  await Promise.race([esperando, carregando])
  const rejeicao = carregando.then(
    () => null,
    (erro: unknown) => erro,
  )
  carregador.descartar()
  soltar!()
  expect(await rejeicao).toBeInstanceOf(Error)
  expect(alvo.children).toHaveLength(0)
  expect(carregador.instalado()).toBeNull()
  await expect(carregador.carregar('sua-ilha')).rejects.toThrow(/encerrado/)
})

test('voltar à ilha com a mesma versão não prepara nada; pedir de novo durante a carga espera a mesma', async () => {
  const porta = await portaDoCenarioParaTeste(await cenarioPublicadoParaTeste()),
    alvo = new Scene()
  let preparos = 0
  const carregador = criarCarregadorPublicado({
    ...porta,
    alvo,
    maxTextura: 4096,
    foco: () => ({ x: 10, z: -4 }),
    async prepararGpu() {
      preparos++
    },
  })
  try {
    const a = carregador.carregar('sua-ilha'),
      b = carregador.carregar('sua-ilha')
    expect(b).toBe(a)
    const primeira = (await a)!
    expect(preparos).toBe(1)
    // A criança voltou à ilha: o perfil é relido, a cena instalada continua a mesma.
    expect(await carregador.carregar('sua-ilha')).toBe(primeira)
    expect(preparos).toBe(1)
    expect(alvo.children).toEqual([primeira.cena])
    // Publicaram a versão 2 enquanto ela estava fora: voltar instala a nova.
    const segunda = await cenarioPublicadoParaTeste()
    segunda.publicacao.versao = 2
    await porta.usar(segunda)
    const nova = (await carregador.carregar('sua-ilha'))!
    expect(nova).not.toBe(primeira)
    expect(nova.publicacao.versao).toBe(2)
    expect(preparos).toBe(2)
  } finally {
    carregador.descartar()
  }
})
