import { describe, expect, it, spyOn } from 'bun:test'
import { mapTwoDBootstrap } from '../bootstrap'
import type { MapTwoDApi } from '../contract'

/**
 * Colisão DE VERDADE em cada motor: o texto que vai ao documento é executado e o personagem
 * tem de parar no chão do cenário. Não usa canvas nativo: colidir não desenha.
 *
 * Nasceu do defeito de 17/11/2026: o Avançado recebia `solid` como `Set`, lia `m.solid[idx]`
 * e o "Colidir com cenário" não fazia nada, com todos os testes verdes.
 */

const PIXEL = 'data:image/png;base64,AAAA'
/** 4×4 de 16 px: a linha de baixo é chão sólido, a peça 1 (linha 2, coluna 3) é plataforma. */
function cena(nome = 'vila', inicio = { x: 24, y: 8 }) {
  const cells = Array(16).fill(-1)
  for (let c = 0; c < 4; c++) cells[12 + c] = 0
  cells[8 + 3] = 1
  return {
    version: 1,
    name: nome,
    id: nome,
    tileSize: 16,
    cols: 4,
    rows: 4,
    tilesets: [
      { id: 'ts', name: 'ts', image: PIXEL, columns: 2, count: 2, solid: [0], platform: [1] },
    ],
    layers: [
      { id: 't', kind: 'tiles', name: 'Chão', visible: true, tilesetId: 'ts', cells },
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
            x: inicio.x,
            y: inicio.y,
            width: 0,
            height: 0,
            properties: {},
          },
          {
            id: 'a',
            name: 'Área',
            type: '',
            role: 'trigger',
            x: 0,
            y: 0,
            width: 16,
            height: 16,
            properties: {},
          },
        ],
      },
    ],
  }
}

interface Corpo {
  x: number
  y: number
  w: number
  h: number
  vx: number
  vy: number
}
type Motor = MapTwoDApi & Record<string, (...args: never[]) => unknown>

async function carregar(
  alvo: 'g2d' | 'gk',
  meta: Record<string, unknown>,
  assets: Record<string, string> = { 'meu-desenho': PIXEL },
): Promise<{ api: Motor; quadro: () => void }> {
  const fila: Array<(ts: number) => void> = []
  const win = {
    addEventListener() {},
    performance: { now: () => 0 },
    devicePixelRatio: 1,
    innerWidth: 1200,
    innerHeight: 700,
    __SZGAME_ASSET_META: meta,
    __SZGAME_ASSETS: assets,
  } as unknown as Record<string, unknown>
  new Function('window', 'requestAnimationFrame', await mapTwoDBootstrap(alvo))(
    win,
    (cb: (ts: number) => void) => fila.push(cb),
  )
  const api = (alvo === 'g2d' ? win.SZGame2D : win.SZGameKit) as Motor | undefined
  if (!api) throw new Error('o motor não montou')
  return {
    api,
    quadro: () => {
      for (const cb of fila.splice(0)) cb(16)
    },
  }
}

describe('cenário do Pinta nos dois motores', () => {
  for (const alvo of ['g2d', 'gk'] as const) {
    it(`${alvo}: o personagem para no chão sólido do cenário`, async () => {
      const { api } = await carregar(alvo, { 'meu-desenho': { scene: cena() } })
      api.createMapScene('mapa', 'meu-desenho')
      // Os pés (y + h = 52) entraram 4 px no chão, que começa em y = 48.
      const corpo: Corpo = { x: 20, y: 44, w: 8, h: 8, vx: 0, vy: 4 }
      api.collideMapScene(corpo, 'mapa')
      expect(corpo.y).toBe(40)
      expect(corpo.x).toBe(20)
      // No ar, longe de qualquer peça, nada muda.
      const livre: Corpo = { x: 20, y: 4, w: 8, h: 8, vx: 0, vy: 0 }
      api.collideMapScene(livre, 'mapa')
      expect(livre.y).toBe(4)
    })

    it(`${alvo}: o início e o tamanho vêm da cena, e seguem o mapa quando ele muda`, async () => {
      const primeiro = await carregar(alvo, { 'meu-desenho': { scene: cena() } })
      primeiro.api.createMapScene('mapa', 'meu-desenho')
      expect(primeiro.api.mapSpawn('mapa', 'x')).toBe(24)
      expect(primeiro.api.mapSize('mapa', 'width')).toBe(64)
      const depois = await carregar(alvo, {
        'meu-desenho': { scene: cena('vila', { x: 40, y: 24 }) },
      })
      depois.api.createMapScene('mapa', 'meu-desenho')
      expect(depois.api.mapSpawn('mapa', 'x')).toBe(40)
      expect(depois.api.mapSpawn('mapa', 'y')).toBe(24)
    })

    it(`${alvo}: "Quando entrar em área" vale sem desenhar a camada de trás`, async () => {
      const { api, quadro } = await carregar(alvo, { 'meu-desenho': { scene: cena() } })
      api.createMapScene('mapa', 'meu-desenho')
      const corpo: Corpo = { x: 40, y: 4, w: 8, h: 8, vx: 0, vy: 0 }
      const entradas: string[] = []
      api.mapArea('mapa', corpo, 'trigger', (area) => entradas.push(area.name))
      quadro()
      expect(entradas).toEqual([])
      corpo.x = 4
      quadro()
      quadro()
      expect(entradas).toEqual(['Área'])
      corpo.x = 40
      quadro()
      corpo.x = 4
      quadro()
      expect(entradas).toEqual(['Área', 'Área'])
    })

    it(`${alvo}: mapa com nome diferente do desenho não avisa imagem que falta`, async () => {
      const avisos = spyOn(console, 'warn').mockImplementation(() => {})
      try {
        const { api } = await carregar(alvo, {
          'meu-desenho': { scene: cena('Vila do Norte') },
        })
        api.createMapScene('mapa', 'meu-desenho')
        api.collideMapScene({ x: 20, y: 44, w: 8, h: 8, vx: 0, vy: 4 }, 'mapa')
        expect(avisos.mock.calls.flat().join('\n')).not.toContain('não está no projeto')
      } finally {
        avisos.mockRestore()
      }
    })
  }

  it('os blocos antigos dizem que o desenho é um cenário e apontam o bloco novo', async () => {
    const avisos = spyOn(console, 'warn').mockImplementation(() => {})
    try {
      // Só o sinal curto (`hasScene`): é o que o documento leva quando o jogo não usa o cenário.
      for (const meta of [{ scene: cena() }, { hasScene: true }]) {
        const basico = await carregar('g2d', { 'meu-desenho': meta })
        ;(basico.api.createTileMapFromAsset as (n: string) => unknown)('meu-desenho')
        const avancado = await carregar('gk', { 'meu-desenho': meta })
        ;(avancado.api.loadTilemap as (n: string, a: string) => unknown)('mapa', 'meu-desenho')
      }
      const texto = avisos.mock.calls.flat().join('\n')
      expect(
        texto.match(/é um cenário\. Use o bloco "Criar cenário do meu desenho"/g),
      ).toHaveLength(4)
      expect(texto).not.toContain('veio com um')
      avisos.mockClear()
      // Desenho sem mapa nenhum: a frase de sempre, sem mudar uma letra.
      const basico = await carregar('g2d', {})
      ;(basico.api.createTileMapFromAsset as (n: string) => unknown)('meu-desenho')
      const avancado = await carregar('gk', {})
      ;(avancado.api.loadTilemap as (n: string, a: string) => unknown)('mapa', 'meu-desenho')
      const antigo = avisos.mock.calls.flat().join('\n')
      expect(antigo).toContain(
        'O desenho "meu-desenho" nao veio com um mapa do Pinta. Envie o MAPA pelo foguete do Pinta (ou use "Criar mapa de tiles" para montar na mao).',
      )
      expect(antigo).toContain(
        'o desenho "meu-desenho" não veio com um MAPA do Pinta — envie o MAPA pelo foguete do Pinta',
      )
    } finally {
      avisos.mockRestore()
    }
  })
})
