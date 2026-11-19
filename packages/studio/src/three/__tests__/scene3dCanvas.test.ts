import { expect, spyOn, test } from 'bun:test'
import type {
  CenaNoThree,
  OpcoesDoRuntimeCompilado,
} from '@sistemazero/molda-cenarios-motor/runtime'
import {
  BoxGeometry,
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  PerspectiveCamera,
  Scene,
  Vector3,
} from 'three'
import { generateJS } from '../../generators/js'
import { criarTransporteDeEnsaio } from '../../testing/scene3dTransportFixture'
import { carregarCena3DDoProjeto } from '../scene3d'
import { criarInstaladorDeCenas3D } from '../scene3dCanvas'

async function preparar() {
  const plano = await criarTransporteDeEnsaio(),
    carregados: CenaNoThree[] = []
  const carregar = async (id: string, sinal: AbortSignal, opcoes?: OpcoesDoRuntimeCompilado) => {
    const r = await carregarCena3DDoProjeto(id, plano.assets, sinal, opcoes)
    carregados.push(r)
    return r
  }
  return { plano, carregar, carregados }
}

test('a ligação troca apenas a base importada e libera os recursos anteriores, conservando o programa Three', async () => {
  const { plano, carregar, carregados } = await preparar(),
    instalador = criarInstaladorDeCenas3D(carregar),
    alvo = new Scene(),
    original = new Color('#112233'),
    autoral = new Mesh(new BoxGeometry(), new MeshBasicMaterial())
  alvo.background = original
  alvo.add(autoral)
  try {
    expect(instalador.instalado(alvo)).toBeUndefined()
    const primeiro = await instalador.instalar(plano.assetId, alvo, new AbortController().signal)
    expect(instalador.instalado(alvo)).toBe(primeiro)
    expect(alvo.children.includes(primeiro.cena)).toBe(true)
    expect(alvo.background === primeiro.cena.background).toBe(true)
    expect(autoral.parent).toBe(alvo)
    const segundo = await instalador.instalar(plano.assetId, alvo, new AbortController().signal)
    expect(primeiro.cena.parent).toBeNull()
    expect(instalador.instalado(alvo)).toBe(segundo)
    expect(carregados[0]!.colisoes.arvores).toBe(0)
    primeiro.descartar()
    expect(segundo.cena.parent).toBe(alvo)
    segundo.descartar()
    segundo.descartar()
    expect(alvo.background).toBe(original)
    expect(instalador.instalado(alvo)).toBeUndefined()
    expect(autoral.parent).toBe(alvo)
    expect(carregados.every((r) => r.colisoes.arvores === 0)).toBe(true)
  } finally {
    instalador.descartar()
    autoral.geometry.dispose()
    autoral.material.dispose()
  }
})

test('a receita de atualização usa o loop existente antes e depois do carregamento, com foco em coordenadas globais', async () => {
  const { plano, carregar } = await preparar(),
    instalador = criarInstaladorDeCenas3D(carregar),
    alvo = new Scene(),
    camera = new PerspectiveCamera(50, 1, 0.1, 1000),
    grupo = new Group(),
    foco = new Object3D()
  grupo.position.set(10, 2, -4)
  foco.position.set(3, 0, 2)
  grupo.add(foco)
  alvo.add(grupo)
  const codigo = generateJS({
      statements: [
        {
          type: 'threeSceneUpdate',
          scene: 'cena',
          camera: 'camera',
          focus: 'personagem',
          dt: { type: 'num', value: 1 / 60 },
        },
      ],
    }),
    executar = new Function(
      'window',
      'cena',
      'camera',
      'personagem',
      codigo.replace(/^import[^\n]*\n/gm, ''),
    ),
    janela = { SZScene3D: { instalado: instalador.instalado } }
  expect(codigo).not.toContain('requestAnimationFrame')
  expect(() => executar({}, alvo, camera, foco)).not.toThrow()
  expect(() => executar(janela, alvo, camera, foco)).not.toThrow()
  try {
    const r = await instalador.instalar(plano.assetId, alvo, new AbortController().signal),
      atualizacao = spyOn(r, 'atualizar'),
      quadro = spyOn(r, 'quadro')
    executar(janela, alvo, camera, foco)
    expect(atualizacao).toHaveBeenCalledWith(1 / 60)
    expect(quadro).toHaveBeenCalledTimes(1)
    expect(quadro.mock.calls[0]![1]).toEqual(new Vector3(13, 2, -2))
    expect(foco.position).toEqual(new Vector3(3, 0, 2))
    r.descartar()
    expect(() => executar(janela, alvo, camera, foco)).not.toThrow()
    expect(quadro).toHaveBeenCalledTimes(1)
    atualizacao.mockRestore()
    quadro.mockRestore()
  } finally {
    instalador.descartar()
  }
})

test('erro de preparo e sinal já cancelado conservam a cena vigente', async () => {
  const { plano, carregar } = await preparar(),
    instalador = criarInstaladorDeCenas3D(carregar),
    alvo = new Scene()
  try {
    const ativo = await instalador.instalar(plano.assetId, alvo, new AbortController().signal)
    await expect(
      instalador.instalar('ausente', alvo, new AbortController().signal),
    ).rejects.toThrow('Escolha um cenário')
    expect(ativo.cena.parent).toBe(alvo)
    const cancelado = new AbortController()
    cancelado.abort()
    await expect(instalador.instalar(plano.assetId, alvo, cancelado.signal)).rejects.toThrow()
    expect(ativo.cena.parent).toBe(alvo)
  } finally {
    instalador.descartar()
  }
})

test('um preparo atrasado não substitui a escolha mais recente nem retém sua geometria', async () => {
  const { plano, carregar, carregados } = await preparar(),
    alvo = new Scene()
  let liberar!: () => void,
    preparada!: () => void,
    chamadas = 0
  const porta = new Promise<void>((resolve) => {
      liberar = resolve
    }),
    iniciou = new Promise<void>((resolve) => {
      preparada = resolve
    }),
    instalador = criarInstaladorDeCenas3D(async (...args) => {
      const ordem = ++chamadas,
        r = await carregar(...args)
      if (ordem === 1) {
        preparada()
        await porta
      }
      return r
    })
  const antigo = instalador.instalar(plano.assetId, alvo, new AbortController().signal)
  try {
    await iniciou
    const atual = await instalador.instalar(plano.assetId, alvo, new AbortController().signal)
    liberar()
    await expect(antigo).rejects.toThrow()
    expect(carregados[0]!.colisoes.arvores).toBe(0)
    expect(atual.cena.parent).toBe(alvo)
    expect(alvo.children.filter((n) => n === atual.cena)).toHaveLength(1)
  } finally {
    liberar()
    instalador.descartar()
  }
})

test('cancelar uma ligação não afeta outra cena e não sobrescreve o ambiente alterado pelo programa', async () => {
  const { plano, carregar } = await preparar(),
    instalador = criarInstaladorDeCenas3D(carregar),
    a = new Scene(),
    b = new Scene(),
    controle = new AbortController()
  try {
    const primeiro = await instalador.instalar(plano.assetId, a, controle.signal),
      segundo = await instalador.instalar(plano.assetId, b, new AbortController().signal),
      editado = new Color('#551122')
    a.background = editado
    controle.abort()
    expect(primeiro.colisoes.arvores).toBe(0)
    expect(primeiro.cena.parent).toBeNull()
    expect(a.background).toBe(editado)
    expect(segundo.cena.parent).toBe(b)
  } finally {
    instalador.descartar()
  }
  expect(b.children).toHaveLength(0)
})

test('encerrar durante preparo libera o resultado atrasado e impede novas instalações', async () => {
  const { plano, carregar, carregados } = await preparar(),
    alvo = new Scene()
  let liberar!: () => void, preparada!: () => void
  const porta = new Promise<void>((resolve) => {
      liberar = resolve
    }),
    iniciou = new Promise<void>((resolve) => {
      preparada = resolve
    }),
    instalador = criarInstaladorDeCenas3D(async (...args) => {
      const r = await carregar(...args)
      preparada()
      await porta
      return r
    }),
    pendente = instalador.instalar(plano.assetId, alvo, new AbortController().signal)
  await iniciou
  instalador.descartar()
  liberar()
  await expect(pendente).rejects.toThrow()
  expect(carregados[0]!.colisoes.arvores).toBe(0)
  expect(alvo.children).toHaveLength(0)
  await expect(
    instalador.instalar(plano.assetId, alvo, new AbortController().signal),
  ).rejects.toThrow('encerrada')
})

test('o ambiente autoral alterado enquanto o arquivo prepara é restaurado ao retirar a primeira base', async () => {
  const { plano, carregar } = await preparar(),
    alvo = new Scene()
  let liberar!: () => void, preparada!: () => void
  const porta = new Promise<void>((resolve) => {
      liberar = resolve
    }),
    iniciou = new Promise<void>((resolve) => {
      preparada = resolve
    }),
    instalador = criarInstaladorDeCenas3D(async (...args) => {
      const r = await carregar(...args)
      preparada()
      await porta
      return r
    }),
    pendente = instalador.instalar(plano.assetId, alvo, new AbortController().signal)
  try {
    await iniciou
    const novoFundo = new Color('#123456')
    alvo.background = novoFundo
    alvo.backgroundRotation.y = 0.6
    liberar()
    const r = await pendente
    r.descartar()
    expect(alvo.background).toBe(novoFundo)
    expect(alvo.backgroundRotation.y).toBeCloseTo(0.6)
  } finally {
    liberar()
    instalador.descartar()
  }
})

test('uma troca conserva também o ambiente que o programa alterou entre duas bases importadas', async () => {
  const { plano, carregar } = await preparar(),
    alvo = new Scene(),
    instalador = criarInstaladorDeCenas3D(carregar)
  try {
    await instalador.instalar(plano.assetId, alvo, new AbortController().signal)
    const fundo = new Color('#913456')
    alvo.background = fundo
    alvo.backgroundRotation.y = 0.8
    const segundo = await instalador.instalar(plano.assetId, alvo, new AbortController().signal)
    segundo.descartar()
    expect(alvo.background).toBe(fundo)
    expect(alvo.backgroundRotation.y).toBeCloseTo(0.8)
  } finally {
    instalador.descartar()
  }
})

test('cancelar pelo evento de montagem Three conserva a base anterior e libera o preparo novo', async () => {
  const { plano, carregar, carregados } = await preparar(),
    alvo = new Scene(),
    controle = new AbortController()
  let cancelarNaMontagem = false
  const instalador = criarInstaladorDeCenas3D(async (...args) => {
    const r = await carregar(...args)
    if (cancelarNaMontagem) r.cena.addEventListener('added', () => controle.abort())
    return r
  })
  try {
    const anterior = await instalador.instalar(plano.assetId, alvo, new AbortController().signal)
    cancelarNaMontagem = true
    await expect(instalador.instalar(plano.assetId, alvo, controle.signal)).rejects.toThrow()
    expect(instalador.instalado(alvo)).toBe(anterior)
    expect(anterior.cena.parent).toBe(alvo)
    expect(anterior.fisica.active()).toBe(true)
    expect(carregados[1]!.colisoes.arvores).toBe(0)
    expect(carregados[1]!.cena.parent).toBeNull()
  } finally {
    instalador.descartar()
  }
})
