import { describe, expect, it, spyOn } from 'bun:test'
import { mapTwoDBootstrap } from '../bootstrap'
import type { MapTwoDApi } from '../contract'
import { mapTwoDSource } from '../runtime'

/**
 * O tocador de cenas do Pinta num mundo com portas (lote 8 da conclusão do plano do Estúdio,
 * 22/11/2026, o jogo D): voltar a uma cena visitada não a prepara de novo (cache das cenas
 * preparadas), os destinos das portas ficam prontos alguns quadros depois de a cena começar, o
 * destino quebrado só avisa quando a criança usa a porta (e o jogador fica onde está), as áreas
 * são conferidas uma vez por posição do corpo, e passar por portas muitas vezes não dá o aviso
 * falso de "Criar mapa está rodando sem parar".
 */

type Cena = Record<string, unknown>
const porta = (id: string, destino: string, x = 0) => ({
  id,
  name: `Porta para ${destino}`,
  type: '',
  role: 'door',
  x,
  y: 0,
  width: 16,
  height: 16,
  properties: { destino },
})
function cena(id: string, objetos: unknown[] = []): Cena {
  return {
    version: 1,
    name: id,
    id,
    tileSize: 16,
    cols: 2,
    rows: 2,
    tilesets: [
      { id: 'ts', name: 'ts', image: `img-${id}`, columns: 1, count: 1, solid: [0], platform: [] },
    ],
    layers: [
      {
        id: 't',
        kind: 'tiles',
        name: 'Chão',
        visible: true,
        tilesetId: 'ts',
        cells: [0, -1, -1, -1],
      },
      {
        id: 'o',
        kind: 'objects',
        name: 'Objetos',
        visible: true,
        objects: [
          {
            id: 's',
            name: 'Início',
            type: '',
            role: 'start',
            x: 24,
            y: 24,
            width: 0,
            height: 0,
            properties: {},
          },
          {
            id: 'z',
            name: 'Área',
            type: 'zona',
            role: 'trigger',
            x: 16,
            y: 16,
            width: 16,
            height: 16,
            properties: {},
          },
          ...objetos,
        ],
      },
    ],
  }
}

function tocador(cenas: Record<string, Cena | null>) {
  const lidas: string[] = []
  const avisos: string[] = []
  const decodificadas: string[] = []
  const fila: Array<() => void> = []
  const api = new Function(`${mapTwoDSource};return createMap2D;`)()({
    meta: (name: string) => {
      lidas.push(name)
      const s = cenas[name]
      return s ? { scene: s } : null
    },
    context: () => ({
      canvas: { width: 32, height: 32 },
      globalAlpha: 1,
      imageSmoothingEnabled: true,
      save() {},
      restore() {},
      translate() {},
      rotate() {},
      scale() {},
      transform() {},
      setTransform() {},
      drawImage() {},
    }),
    width: () => 32,
    height: () => 32,
    camera: () => ({ x: 0, y: 0 }),
    screen: () => {},
    image: (url: string) => ({
      complete: false,
      naturalWidth: 0,
      decode: () => {
        decodificadas.push(url)
        return Promise.resolve()
      },
    }),
    warn: (message: string) => avisos.push(message),
    frame: (step: () => void) => fila.push(step),
    collision: (_name: string, _scene: unknown, rows: number[][]) => rows,
    collide: () => {},
  }) as MapTwoDApi
  const quadros = (n: number) => {
    for (let i = 0; i < n; i++) for (const step of fila.splice(0)) step()
  }
  return { api, lidas, avisos, decodificadas, quadros }
}

const naPorta = () => ({ x: 4, y: 4, w: 2, h: 2 })
/** O "Usar a porta" do tocador (o nome começa com use, mas não é um hook do React). */
const atravessar = (api: MapTwoDApi) => api.useMapDoor

describe('o tocador de cenas num mundo com portas', () => {
  it('voltar a uma cena visitada não a prepara de novo', () => {
    const { api, lidas } = tocador({
      vila: cena('vila', [porta('p1', 'casa')]),
      casa: cena('casa', [porta('p2', 'vila')]),
    })
    api.createMapScene('mundo', 'vila')
    const corpo = naPorta()
    for (let i = 0; i < 6; i++) {
      atravessar(api)('mundo', corpo, api.mapObjectById('mundo', i % 2 ? 'p2' : 'p1')!)
      Object.assign(corpo, naPorta())
    }
    expect(lidas.filter((n) => n === 'vila')).toHaveLength(1)
    expect(lidas.filter((n) => n === 'casa')).toHaveLength(1)
  })

  it('os destinos das portas ficam prontos alguns quadros depois de a cena começar', () => {
    const { api, lidas, decodificadas, quadros } = tocador({
      vila: cena('vila', [porta('p1', 'casa', 0), porta('p2', 'caverna', 16)]),
      casa: cena('casa'),
      caverna: cena('caverna'),
    })
    api.createMapScene('mundo', 'vila')
    // Ao criar, nada além da cena pedida.
    expect(lidas).toEqual(['vila'])
    // Um destino por quadro.
    quadros(1)
    expect(lidas).toEqual(['vila', 'casa'])
    quadros(1)
    expect(lidas).toEqual(['vila', 'casa', 'caverna'])
    expect(decodificadas).toEqual(expect.arrayContaining(['img-casa', 'img-caverna']))
    // A passagem não prepara nada: a cena já estava pronta.
    atravessar(api)('mundo', naPorta(), api.mapObjectById('mundo', 'p1')!)
    expect(lidas).toHaveLength(3)
    expect(api.mapSpawn('mundo', 'x')).toBe(24)
  })

  it('a pré-carga também roda com "Quando entrar em área" registrado depois de criar a cena', () => {
    // O caso de todo jogo de verdade (revisão do lote 8): o relógio das áreas nascia com uma
    // geração nova e matava a pré-carga, que ficava marcada como rodando para sempre.
    const { api, lidas, quadros } = tocador({
      vila: cena('vila', [porta('p1', 'casa', 0), porta('p2', 'caverna', 16)]),
      casa: cena('casa', [porta('p3', 'vila')]),
      caverna: cena('caverna'),
    })
    api.createMapScene('mundo', 'vila')
    api.mapArea('mundo', naPorta(), 'door', () => {})
    quadros(3)
    expect(lidas).toEqual(['vila', 'casa', 'caverna'])
    // Na casa, o destino de volta já está no cache: nada é lido de novo, nem na passagem.
    atravessar(api)('mundo', naPorta(), api.mapObjectById('mundo', 'p1')!)
    quadros(3)
    atravessar(api)('mundo', naPorta(), api.mapObjectById('mundo', 'p3')!)
    expect(lidas).toEqual(['vila', 'casa', 'caverna'])
  })

  it('o destino quebrado não avisa na pré-carga; avisa uma vez ao usar e o jogador fica', () => {
    const { api, avisos, quadros } = tocador({
      vila: cena('vila', [porta('p1', 'sumida')]),
      sumida: null,
    })
    api.createMapScene('mundo', 'vila')
    quadros(3)
    expect(avisos).toEqual([])
    const corpo = naPorta()
    atravessar(api)('mundo', corpo, api.mapObjectById('mundo', 'p1')!)
    atravessar(api)('mundo', corpo, api.mapObjectById('mundo', 'p1')!)
    expect(avisos).toHaveLength(1)
    expect(corpo).toEqual(naPorta())
    expect(api.mapObjectById('mundo', 'p1')).not.toBeNull()
  })

  it('as áreas são conferidas uma vez por posição do corpo (desenhar e colidir no mesmo lugar)', () => {
    // Vinte zonas: cada conferência lê o corpo uma vez por zona.
    const zonas = Array.from({ length: 20 }, (_, i) => ({
      id: `z${i}`,
      name: `Zona ${i}`,
      type: 'zona',
      role: 'trigger',
      x: 40 + i * 20,
      y: 40,
      width: 8,
      height: 8,
      properties: {},
    }))
    const { api } = tocador({ vila: cena('vila', zonas) })
    api.createMapScene('mundo', 'vila')
    let leituras = 0
    const real = { x: 20, y: 20, w: 2, h: 2 }
    const corpo = new Proxy(real, {
      get(alvo, chave) {
        if (chave === 'x') leituras++
        return alvo[chave as keyof typeof alvo]
      },
    })
    let entradas = 0
    api.mapArea('mundo', corpo, 'zona', () => entradas++)
    api.drawMapScene('mundo', 'back')
    const umaConferencia = leituras
    api.drawMapScene('mundo', 'front')
    api.collideMapScene(corpo, 'mundo')
    expect(leituras - umaConferencia).toBeLessThanOrEqual(2)
    expect(entradas).toBe(1)
    // Mudou de lugar: confere de novo (a colisão entrega a entrada mesmo sem quadro).
    real.x = 0
    api.collideMapScene(corpo, 'mundo')
    real.x = 20
    api.collideMapScene(corpo, 'mundo')
    expect(entradas).toBe(2)
  })

  // No Avançado o teste só confere que nada avisa: o host dele nunca usou o createTileMap.
  for (const target of ['g2d', 'gk'] as const)
    it(`${target}: 70 passagens por porta não dão o aviso falso de "Criar mapa"`, async () => {
      const win: Record<string, unknown> = {
        addEventListener() {},
        performance: { now: () => 0 },
        devicePixelRatio: 1,
        __SZGAME_ASSETS: {},
        __SZGAME_ASSET_META: {
          vila: { scene: cena('vila', [porta('p1', 'casa')]) },
          casa: { scene: cena('casa', [porta('p2', 'vila')]) },
        },
      }
      const avisos = spyOn(console, 'warn').mockImplementation(() => {})
      try {
        new Function('window', 'requestAnimationFrame', await mapTwoDBootstrap(target))(
          win,
          () => 0,
        )
        const api = win[target === 'g2d' ? 'SZGame2D' : 'SZGameKit'] as MapTwoDApi
        api.createMapScene('mundo', 'vila')
        for (let i = 0; i < 70; i++)
          atravessar(api)('mundo', naPorta(), api.mapObjectById('mundo', i % 2 ? 'p2' : 'p1')!)
        const textos = avisos.mock.calls.map((c) => String(c[0]))
        expect(textos.filter((t) => t.includes('rodando sem parar'))).toEqual([])
      } finally {
        avisos.mockRestore()
      }
    })
})
