import { afterEach, expect, test } from 'bun:test'
import { type CenaNoThree, resolverInicioDaCena } from '@sistemazero/molda-cenarios-motor/runtime'
import { Vector3 } from 'three'
import { criarTransporteDeEnsaio } from '../../../testing/scene3dTransportFixture'
import { carregarCena3DDoProjeto } from '../../../three/scene3d'
import { criarInstaladorDeCenas3D } from '../../../three/scene3dCanvas'
import { loadStartedWorld, pressKey, releaseKey } from './kitHarness'

afterEach(() => {
  window.dispatchEvent(new Event('pagehide'))
  delete window.SZScene3D
  releaseKey('w', 'KeyW')
  releaseKey(' ', 'Space')
  for (const e of document.querySelectorAll('#szw3d-stage')) e.remove()
})

async function instalarCarregador(opcoes: Parameters<typeof criarTransporteDeEnsaio>[0] = {}) {
  const plano = await criarTransporteDeEnsaio(opcoes),
    carregados: CenaNoThree[] = []
  const carregar: NonNullable<Window['SZScene3D']>['carregar'] = (id, sinal, opcoes) => {
    return carregarCena3DDoProjeto(id, plano.assets, sinal, opcoes).then((r) => {
      carregados.push(r)
      return r
    })
  }
  const ligacoes = criarInstaladorDeCenas3D(carregar)
  window.SZScene3D = {
    inicio: resolverInicioDaCena,
    carregar,
    instalar: ligacoes.instalar,
    instalado: ligacoes.instalado,
  }
  return { plano, carregados }
}

test('Mundo 3D usa o chão e ambiente reais e descarta a base substituída sem trocar o controlador', async () => {
  const { plano, carregados } = await instalarCarregador(),
    mundo = await loadStartedWorld((api) => {
      api.loadScene(plano.assetId)
      api.person('#448855', 'nenhum')
    }),
    primeiro = carregados[0]!,
    cena = mundo.renderers[0]!.scene!
  expect(cena.children.includes(primeiro.cena)).toBe(true)
  expect(cena.background).toBe(primeiro.cena.background)
  expect(mundo.api.groundHeight(15, 15)).toBe(primeiro.alturas!(15, 15))
  expect(mundo.api.playerPos('y')).toBeGreaterThanOrEqual(0)
  expect(await mundo.api.loadScene(plano.assetId)).toBe(true)
  expect(primeiro.cena.parent).toBeNull()
  expect(primeiro.colisoes.arvores).toBe(0)
  expect(cena.children.includes(carregados[1]!.cena)).toBe(true)
  mundo.step(2)
  expect(Number.isFinite(mundo.api.playerPos('y'))).toBe(true)
  mundo.api.disposeAll()
  expect(carregados[1]!.colisoes.arvores).toBe(0)
})

test('recorte físico não vira chão invisível nem teleporta o personagem ao fundo', async () => {
  const { plano, carregados } = await instalarCarregador({ comBuraco: true }),
    mundo = await loadStartedWorld((api) => {
      api.loadScene(plano.assetId)
      api.person('#448855', 'nenhum')
      api.personPlace(10, 0, 0)
    })
  expect(carregados[0]!.alturas!.temChao!({ x: 10, z: 6 })).toBe(false)
  pressKey('w', 'KeyW')
  mundo.step(40)
  expect(mundo.api.playerPos('z')).toBeGreaterThan(4)
  expect(mundo.api.playerPos('y')).toBeLessThan(-0.01)
  expect(mundo.api.playerPos('y')).toBeGreaterThan(-10)
  mundo.api.disposeAll()
})

test('o personagem respeita os triângulos de colisão do cenário, além da altura do terreno', async () => {
  const { plano, carregados } = await instalarCarregador(),
    mundo = await loadStartedWorld((api) => {
      api.loadScene(plano.assetId)
      api.person('#448855', 'nenhum')
      api.personPlace(0.5, -2, 0)
    })
  expect(
    carregados[0]!.colisoes.rastrear(new Vector3(0.5, 0.5, -1), new Vector3(0.5, 0.5, 1)),
  ).not.toBeNull()
  pressKey('w', 'KeyW')
  mundo.step(40)
  expect(mundo.api.playerPos('z')).toBeLessThan(-0.4)
  expect(mundo.api.playerPos('y')).toBeLessThan(0.1)
  mundo.api.disposeAll()
})

test('preserva a origem do cenário, sem prender o personagem nas bordas do antigo mundo centralizado', async () => {
  const { plano } = await instalarCarregador({ origem: { x: 100, z: -90 } }),
    mundo = await loadStartedWorld((api) => {
      api.loadScene(plano.assetId)
      api.person('#448855', 'nenhum')
      api.personPlace(110, -70, 0)
    })
  pressKey('w', 'KeyW')
  mundo.step(20)
  expect(mundo.api.playerPos('x')).toBe(110)
  expect(mundo.api.playerPos('z')).toBeGreaterThan(-70)
  expect(mundo.api.playerPos('y')).toBeCloseTo(0)
  mundo.api.disposeAll()
})

test('falha na próxima cena conserva a base vigente; encerrar durante preparo não instala recursos atrasados', async () => {
  const { plano, carregados } = await instalarCarregador(),
    mundo = await loadStartedWorld((api) => {
      api.loadScene(plano.assetId)
    }),
    atual = carregados[0]!
  expect(await mundo.api.loadScene('cenario-ausente')).toBe(false)
  expect(mundo.renderers[0]!.scene!.children.includes(atual.cena)).toBe(true)
  const pendente = mundo.api.loadScene(plano.assetId)
  mundo.api.disposeAll()
  expect(await pendente).toBe(false)
  expect(atual.colisoes.arvores).toBe(0)
  for (const r of carregados) expect(r.colisoes.arvores).toBe(0)
})

test('a área de apoio dos pés atravessa uma junta estreita sem perder o piso real sobre o recorte', async () => {
  const { plano, carregados } = await instalarCarregador({ comBuraco: true, comPonte: true }),
    mundo = await loadStartedWorld((api) => {
      api.loadScene(plano.assetId)
      api.person('#448855', 'nenhum')
      api.personPlace(9, 5.5, 0)
    })
  expect(carregados[0]!.alturas!.temChao!({ x: 9, z: 6.1 })).toBe(false)
  pressKey('w', 'KeyW')
  for (let quadro = 0; quadro < 8; quadro++) {
    mundo.step(1)
    expect(mundo.api.playerPos('y')).toBeGreaterThan(0.35)
  }
  expect(mundo.api.playerPos('z')).toBeGreaterThan(6.2)
  mundo.api.disposeAll()
})

test('contato real da cápsula mantém o apoio quando uma pequena superfície fica entre os raios dos pés', async () => {
  const { plano } = await instalarCarregador({ comBuraco: true, comApoioPequeno: true }),
    mundo = await loadStartedWorld((api) => {
      api.loadScene(plano.assetId)
      api.person('#448855', 'nenhum')
      api.personPlace(10.01, 5.01, 90)
    })
  pressKey('w', 'KeyW')
  mundo.step(1)
  releaseKey('w', 'KeyW')
  mundo.step(5)
  expect(mundo.api.playerPos('y')).toBeGreaterThan(0.35)
  mundo.api.disposeAll()
})

test('a chegada sobre uma junta considera os pés inteiros, sem nascer no terreno sob a ponte', async () => {
  const { plano } = await instalarCarregador({ comPonte: true, fundo: -1 }),
    mundo = await loadStartedWorld((api) => {
      api.loadScene(plano.assetId)
      api.person('#448855', 'nenhum')
      api.personPlace(9, 6.1, 0)
    })
  expect(mundo.api.playerPos('y')).toBeGreaterThan(0.35)
  expect(Math.abs(mundo.api.playerPos('z') - 6.1)).toBeLessThan(0.05)
  mundo.api.disposeAll()
})

test('um cenário fora da origem oferece uma chegada válida mesmo sem um bloco de posicionamento', async () => {
  const { plano, carregados } = await instalarCarregador({ origem: { x: 100, z: -90 } }),
    mundo = await loadStartedWorld((api) => {
      api.loadScene(plano.assetId)
      api.person('#448855', 'nenhum')
    })
  expect(
    carregados[0]!.alturas!.temChao!({ x: mundo.api.playerPos('x'), z: mundo.api.playerPos('z') }),
  ).toBe(true)
  expect(mundo.api.playerPos('y')).toBeCloseTo(0)
  mundo.api.disposeAll()
})

test('posicionar o carrinho durante o preparo conserva as coordenadas do cenário fora da origem', async () => {
  const { plano } = await instalarCarregador({ origem: { x: 100, z: -90 } }),
    mundo = await loadStartedWorld((api) => {
      api.loadScene(plano.assetId)
      api.car({ style: 'jipe', color: '#448855' })
      api.carPlace(110, -70, 0)
    })
  expect(mundo.api.playerPos('x')).toBe(110)
  expect(mundo.api.playerPos('z')).toBe(-70)
  expect(mundo.api.playerPos('y')).toBeCloseTo(0)
  mundo.api.disposeAll()
})

test('reposicionar após o início preserva o apoio da ponte, sem descer ao terreno sob ela', async () => {
  const { plano } = await instalarCarregador({ comPonte: true, fundo: -1 }),
    mundo = await loadStartedWorld((api) => {
      api.loadScene(plano.assetId)
      api.person('#448855', 'nenhum')
      api.personPlace(2, 2, 0)
    })
  mundo.api.personPlace(9, 6.1, 0)
  expect(mundo.api.playerPos('y')).toBeGreaterThan(0.35)
  mundo.step(2)
  expect(mundo.api.playerPos('y')).toBeGreaterThan(0.35)
  mundo.api.disposeAll()
})

test('o salto encontra o teto físico da cena antes de atravessá-lo', async () => {
  const { plano } = await instalarCarregador({ comTeto: true }),
    mundo = await loadStartedWorld((api) => {
      api.loadScene(plano.assetId)
      api.person('#448855', 'nenhum')
    })
  // Put the feet below the roof using a nearby low approach, not arrival from above.
  mundo.api.personPlace(9, 4, 0)
  pressKey('w', 'KeyW')
  mundo.step(12)
  releaseKey('w', 'KeyW')
  expect(mundo.api.playerPos('z')).toBeGreaterThan(5)
  expect(mundo.api.playerPos('y')).toBeLessThan(0.1)
  pressKey(' ', 'Space')
  for (let quadro = 0; quadro < 12; quadro++) {
    mundo.step(1)
    expect(mundo.api.playerPos('y') + 1.7).toBeLessThanOrEqual(2.301)
  }
  releaseKey(' ', 'Space')
  mundo.api.disposeAll()
})

test('"Quando o jogador entrar na região" conta cada entrada uma vez, inclusive começando dentro', async () => {
  const { plano } = await instalarCarregador({ comRegioes: true }),
    entradas: string[] = [],
    mundo = await loadStartedWorld((api) => {
      api.loadScene(plano.assetId)
      api.person('#448855', 'nenhum')
      api.personPlace(-10, 0, 0)
      const regras = api as unknown as { onEnterRegion(name: string, fn: () => void): void }
      regras.onEnterRegion('Vila', () => entradas.push('Vila'))
      regras.onEnterRegion('Floresta', () => entradas.push('Floresta'))
    })
  mundo.step(3)
  expect(entradas).toEqual(['Vila'])
  mundo.api.personPlace(10, 5, 0)
  mundo.step(3)
  mundo.api.personPlace(20, 10, 0)
  mundo.step(3)
  expect(entradas).toEqual(['Vila', 'Floresta'])
  mundo.api.personPlace(-10, 0, 0)
  mundo.step(3)
  expect(entradas).toEqual(['Vila', 'Floresta', 'Vila'])
  mundo.api.disposeAll()
})
