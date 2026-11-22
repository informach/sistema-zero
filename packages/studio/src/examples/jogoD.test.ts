import { afterEach, beforeAll, expect, test } from 'bun:test'
import {
  PINTA_SCENE_LIMITS,
  PINTA_SCENE_MAX_CHARS,
  type PintaScene,
  readPintaScene,
} from '@sistemazero/core/studio/pinta-scene'
import * as Blockly from 'blockly/core'
import { jogoDAssets, jogoDIR } from '../../scripts/gen-jogo-d'
import { RAIO_SEM_INIMIGO } from '../../scripts/jogo-d/cenas'
import { registerExtensionBlocks } from '../blockly/blocks'
import { buildIRFromWorkspace } from '../blockly/buildIR'
import { ensureBlocklyInitialized } from '../blockly/setup'
import { buildWorkspaceStateFromIR } from '../blockly/workspaceState'
import {
  assetManifest,
  assetMetaManifest,
  PROJECT_ASSET_LIMITS,
  soundManifest,
} from '../core/project'
import { compileStatements, generateJS } from '../generators/js'
import { behaviorStatements, type SZIRV2 } from '../ir'
import { stripIds } from '../official-extensions/game-2d/__gen_dinoCorredor'
import { gameTwoDBlocks } from '../official-extensions/game-2d/blocks'
import { mapTwoDBootstrap } from '../official-extensions/map-2d/bootstrap'
import { parseJS } from '../parsers/js'
import { JOGO_D_IR } from './__gen_jogoD'
import { JOGO_D_ASSETS } from './jogoD.generated'
import { jogoDExample } from './jogoDExample'
import { JOGO_D_DESCRIPTION, jogoDSource } from './jogoDSource'

/**
 * O jogo D (lote 8 da conclusão do plano do Estúdio, 22/11/2026): materiais e programa feitos
 * por código, conferidos contra os leitores do Pinta, os tetos do projeto e o motor de verdade.
 */

const cenas = JOGO_D_ASSETS.filter((a) => a.scene).map((a) => a.scene as PintaScene)
const cena = (id: string) => cenas.find((s) => s.id === id)!
const objetos = (s: PintaScene) => s.layers.flatMap((l) => (l.kind === 'objects' ? l.objects : []))
const ENTIDADES = ['moeda', 'inimigo', 'bau']
const meio = (o: { x: number; y: number; width: number; height: number }) =>
  [o.x + o.width / 2, o.y + o.height / 2] as const

beforeAll(() => {
  ensureBlocklyInitialized()
  registerExtensionBlocks(gameTwoDBlocks)
})

test('os materiais gerados são os mesmos bytes a cada rodada e estão em dia com o gerador', () => {
  const primeira = JSON.stringify(jogoDAssets())
  expect(JSON.stringify(jogoDAssets())).toBe(primeira)
  expect(JSON.stringify(JOGO_D_ASSETS)).toBe(primeira)
  expect(JSON.stringify(stripIds(JOGO_D_IR))).toBe(JSON.stringify(jogoDIR()))
})

test('cada cena passa no leitor do Pinta e cabe nos tetos de cena e de projeto', () => {
  expect(cenas.map((s) => s.id)).toEqual([
    'jogo-d-mundo',
    'jogo-d-caverna-1',
    'jogo-d-caverna-2',
    'jogo-d-caverna-3',
    'jogo-d-casa-1',
    'jogo-d-casa-2',
    'jogo-d-casa-3',
    'jogo-d-casa-4',
  ])
  for (const s of cenas) {
    expect(readPintaScene(s), s.id).toEqual(s)
    expect(JSON.stringify(s).length).toBeLessThanOrEqual(PINTA_SCENE_MAX_CHARS)
    expect(s.layers.length).toBeLessThanOrEqual(PINTA_SCENE_LIMITS.layers)
    for (const l of s.layers)
      if (l.kind === 'objects')
        expect(l.objects.length).toBeLessThanOrEqual(PINTA_SCENE_LIMITS.objects)
  }
  const mundo = cena('jogo-d-mundo')
  expect([mundo.cols, mundo.rows]).toEqual([96, 72])
  expect(mundo.layers.length).toBeGreaterThanOrEqual(12)
  // Camadas de trás, da frente (copas, telhados), névoa com paralaxe e a de colisão.
  expect(mundo.layers.some((l) => l.kind === 'tiles' && l.front && l.parallaxX)).toBe(true)
  expect(mundo.layers.some((l) => l.kind === 'tiles' && l.collision)).toBe(true)
  const total = JOGO_D_ASSETS.reduce(
    (n, a) => n + a.dataUrl.length + (a.scene ? JSON.stringify(a.scene).length : 0),
    0,
  )
  expect(total).toBeLessThanOrEqual(PROJECT_ASSET_LIMITS.maxAssetsTotalChars)
  expect(JOGO_D_ASSETS.length).toBeLessThanOrEqual(PROJECT_ASSET_LIMITS.maxAssetsCount)
})

test('toda porta tem destino e chegada, e o destino tem a porta de volta para perto dela', () => {
  const nomes = new Set(JOGO_D_ASSETS.map((a) => a.name))
  let portas = 0
  for (const origem of cenas)
    for (const porta of objetos(origem).filter((o) => o.role === 'door')) {
      portas++
      const destino = String(porta.properties.destino)
      expect(nomes.has(destino), `${origem.id} → ${destino}`).toBe(true)
      const chegada = objetos(cena(destino)).find((o) => o.id === porta.properties.chegada)
      expect(chegada, `${porta.id} sem chegada`).toBeDefined()
      // A chegada não fica DENTRO de uma porta do destino (o herói voltaria na hora).
      for (const outra of objetos(cena(destino)).filter((o) => o.role === 'door'))
        expect(
          chegada!.x >= outra.x &&
            chegada!.x <= outra.x + outra.width &&
            chegada!.y >= outra.y &&
            chegada!.y <= outra.y + outra.height,
        ).toBe(false)
      // A volta: uma porta do destino leva à origem, e a chegada dela fica junto desta porta.
      const volta = objetos(cena(destino)).find(
        (o) => o.role === 'door' && o.properties.destino === origem.id,
      )
      expect(volta, `${destino} sem porta para ${origem.id}`).toBeDefined()
      const ponto = objetos(origem).find((o) => o.id === volta!.properties.chegada)!
      expect(Math.hypot(ponto.x - porta.x, ponto.y - porta.y)).toBeLessThan(64)
    }
  expect(portas).toBe(14)
})

test('as seis regiões cobrem o mundo, cada peça numa só (semiabertas), com vizinhas em par', () => {
  const mundo = cena('jogo-d-mundo')
  const regioes = objetos(mundo).filter((o) => o.role === 'region')
  expect(regioes.map((r) => r.name)).toEqual([
    'Vila',
    'Floresta',
    'Montanha',
    'Lago',
    'Campo',
    'Ruínas',
  ])
  // O tocador confere as bordas incluídas: cada ponto do mundo, inclusive a borda exata entre
  // duas regiões, fica numa só (revisão do lote 8).
  const dentro = (r: (typeof regioes)[number], x: number, y: number) =>
    x >= r.x && y >= r.y && x <= r.x + r.width && y <= r.y + r.height
  for (let y = 0; y < mundo.rows * mundo.tileSize; y += 16)
    for (let x = 0; x < mundo.cols * mundo.tileSize; x += 16)
      expect(regioes.filter((r) => dentro(r, x, y)).length, `${x},${y}`).toBe(1)
  const vizinhas = new Map(regioes.map((r) => [r.name, String(r.properties.vizinhas).split(',')]))
  for (const [nome, lista] of vizinhas)
    for (const outra of lista) expect(vizinhas.get(outra), `${nome} ↔ ${outra}`).toContain(nome)
})

test('nenhum inimigo nasce perto de uma chegada, do início ou do centro de uma região', () => {
  // O inimigo persegue quem está a menos de 140 px: o herói apanhava toda vez que saía da caverna 3.
  for (const s of cenas) {
    const pontos = objetos(s).filter(
      (o) => o.type === 'chegada' || o.role === 'start' || o.role === 'region',
    )
    for (const inimigo of objetos(s).filter((o) => o.type === 'inimigo'))
      for (const p of pontos) {
        const [px, py] = p.role === 'region' ? meio(p) : [p.x, p.y]
        const d = Math.hypot(inimigo.x + 16 - px, inimigo.y + 16 - py)
        expect(d, `${s.id}: ${inimigo.id} perto de ${p.id}`).toBeGreaterThanOrEqual(
          RAIO_SEM_INIMIGO * 32 - 16,
        )
      }
  }
})

test('mais de 600 entidades, e a região com as vizinhas liga no máximo 300', () => {
  const todas = cenas.flatMap((s) => objetos(s).filter((o) => ENTIDADES.includes(o.type)))
  expect(todas.length).toBeGreaterThanOrEqual(600)
  // Cada entidade tem a chave única que o programa guarda.
  expect(new Set(todas.map((o) => o.properties.chave)).size).toBe(todas.length)
  const mundo = cena('jogo-d-mundo')
  const doMundo = objetos(mundo).filter((o) => ENTIDADES.includes(o.type))
  for (const r of objetos(mundo).filter((o) => o.role === 'region')) {
    const ativas = [r.name, ...String(r.properties.vizinhas).split(',')]
    const ligadas = doMundo.filter((o) => ativas.includes(String(o.properties.regiao)))
    expect(ligadas.length, r.name).toBeLessThanOrEqual(300)
  }
})

test('nomes e textos em português, sem travessão e sem "IA"', () => {
  const textos = [
    JOGO_D_DESCRIPTION,
    jogoDExample.name,
    jogoDExample.description,
    ...cenas.flatMap((s) => [
      s.name,
      ...s.layers.map((l) => l.name),
      ...objetos(s).map((o) => o.name),
    ]),
    ...(jogoDSource().match(/"[^"]*"/g) ?? []),
  ]
  for (const texto of textos) {
    expect(texto).not.toContain('—')
    expect(texto).not.toMatch(/\bIA\b/)
  }
})

test('o programa abre nos blocos sem trecho opaco e volta ao mesmo código', () => {
  const ir = jogoDExample.ir
  expect(JSON.stringify(ir)).not.toMatch(/"type":"(?:rawJS|memberCall)"/)
  const original = compileStatements(behaviorStatements(ir), 0)
  expect(compileStatements(parseJS(original), 0)).toBe(original)
  const workspace = new Blockly.Workspace()
  try {
    Blockly.serialization.workspaces.load(buildWorkspaceStateFromIR(ir), workspace)
    const rebuilt = buildIRFromWorkspace(workspace)
    expect(JSON.stringify(rebuilt)).not.toContain('rawJS')
    expect(compileStatements(stripIds(behaviorStatements(rebuilt)), 0)).toBe(original)
  } finally {
    workspace.dispose()
  }
})

// --- Uma rodada do jogo no motor de verdade (sem navegador) ----------------------------------

const originalContext = HTMLCanvasElement.prototype.getContext
afterEach(() => {
  HTMLCanvasElement.prototype.getContext = originalContext
  localStorage.clear()
})

interface Sprite {
  x: number
  y: number
  w: number
  h: number
}
interface Sonda {
  jogador: Sprite
  lugar(): string
  regiao(): string
  pontos(): number
  pegos(): string[]
  grupos(): { items: Sprite[] }[]
}

async function jogar(materiais = JOGO_D_ASSETS, armazenamento: Storage = localStorage) {
  const avisos: unknown[][] = []
  const lidas: string[] = []
  HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement) {
    return new Proxy(
      {
        canvas: this,
        globalAlpha: 1,
        measureText: (t: string) => ({ width: String(t).length * 9 }),
      },
      { get: (o, k) => (k in o ? Reflect.get(o, k) : () => {}) },
    ) as unknown as CanvasRenderingContext2D
  } as unknown as typeof originalContext
  class Imagem {
    complete = false
    naturalWidth = 0
    naturalHeight = 0
    width = 32
    height = 32
    onload: (() => void) | null = null
    addEventListener() {}
    decode() {
      return Promise.resolve()
    }
    set src(_valor: string) {
      this.complete = true
      this.naturalWidth = this.naturalHeight = 32
      queueMicrotask(() => this.onload?.())
    }
  }
  const fila = new Map<number, FrameRequestCallback>()
  let id = 0,
    agora = 0
  const win: Record<string, unknown> = {
    addEventListener() {},
    removeEventListener() {},
    performance: { now: () => agora },
    innerWidth: 640,
    innerHeight: 480,
    devicePixelRatio: 1,
    __SZGAME_ASSETS: assetManifest(materiais),
    // Conta as leituras de cada cena: é como o tocador prepara um lugar.
    __SZGAME_ASSET_META: new Proxy(assetMetaManifest(materiais), {
      get(alvo, nome) {
        if (typeof nome === 'string') lidas.push(nome)
        return Reflect.get(alvo, nome)
      },
    }),
    __SZGAME_SOUNDS: soundManifest(materiais),
  }
  const raf = (fn: FrameRequestCallback) => {
    fila.set(++id, fn)
    return id
  }
  const consoleCalado = {
    warn: (...args: unknown[]) => avisos.push(args),
    error: (...args: unknown[]) => avisos.push(args),
    log() {},
  }
  const motor = await mapTwoDBootstrap('g2d')
  new Function(
    'window',
    'Image',
    'requestAnimationFrame',
    'cancelAnimationFrame',
    'console',
    motor,
  )(win, Imagem, raf, (n: number) => fila.delete(n), consoleCalado)
  const ir = JOGO_D_IR as SZIRV2
  const behavior: SZIRV2['behavior'] = {
    ...ir.behavior,
    start: [
      ...ir.behavior.start,
      {
        type: 'rawJS',
        advanced: true,
        code: 'window.sonda = { jogador, lugar: () => lugar, regiao: () => regiao, pontos: () => pontos, pegos: () => pegos, grupos: () => [moedas, inimigos, baus] };',
      },
    ],
  }
  new Function(
    'window',
    'Image',
    'requestAnimationFrame',
    'cancelAnimationFrame',
    'SZGame2D',
    'ctx',
    'console',
    'localStorage',
    generateJS({ behavior, lifecycle: 'game-2d' }),
  )(
    win,
    Imagem,
    raf,
    (n: number) => fila.delete(n),
    win.SZGame2D,
    win.ctx,
    consoleCalado,
    armazenamento,
  )
  for (let i = 0; i < 12; i++) await Promise.resolve()
  const quadros = (n: number) => {
    for (let i = 0; i < n; i++) {
      agora += 1000 / 60
      const passos = [...fila.values()]
      fila.clear()
      for (const passo of passos) passo(agora)
    }
  }
  const sonda = win.sonda as Sonda
  if (!sonda) throw new Error(`O jogo não começou: ${JSON.stringify(avisos)}`)
  const api = win.SZGame2D as { setPosition(s: Sprite, x: number, y: number): void }
  /** Põe o centro do herói num ponto do lugar (é o que as áreas conferem). */
  const ir_ = (x: number, y: number) => api.setPosition(sonda.jogador, x - 11, y - 12)
  const vivas = () => sonda.grupos().reduce((n, g) => n + g.items.length, 0)
  return { sonda, quadros, ir: ir_, vivas, avisos, lidas }
}

test('rodada: a região liga as entidades, a porta leva à chegada, o que foi pego fica pego e a cama guarda', async () => {
  const jogo = await jogar()
  jogo.quadros(3)
  expect(jogo.sonda.lugar()).toBe('jogo-d-mundo')
  expect(jogo.sonda.regiao()).toBe('Vila')
  // Vila + Floresta + Lago: 3 × 75.
  expect(jogo.vivas()).toBe(225)

  // A porta da casa 1 leva para dentro, na chegada da casa.
  const mundo = cena('jogo-d-mundo')
  const porta = objetos(mundo).find((o) => o.id === 'porta-casa-1')!
  jogo.ir(...meio(porta))
  jogo.quadros(2)
  expect(jogo.sonda.lugar()).toBe('jogo-d-casa-1')
  const chegada = objetos(cena('jogo-d-casa-1')).find((o) => o.id === 'chegada')!
  expect(jogo.sonda.jogador.x + 11).toBe(chegada.x)
  expect(jogo.sonda.jogador.y + 12).toBe(chegada.y)
  expect(jogo.vivas()).toBe(6)

  // Pega uma moeda da casa.
  const moeda = jogo.sonda.grupos()[0]!.items[0]!
  jogo.ir(moeda.x + moeda.w / 2, moeda.y + moeda.h / 2)
  jogo.quadros(2)
  expect(jogo.sonda.pontos()).toBe(1)
  expect(jogo.sonda.pegos()).toHaveLength(1)

  // Dorme na cama: o jogo fica guardado.
  const cama = objetos(cena('jogo-d-casa-1')).find((o) => o.id === 'cama')!
  jogo.ir(...meio(cama))
  jogo.quadros(2)
  expect(localStorage.getItem('jogo-d-salvo')).toBe('sim')
  expect(localStorage.getItem('jogo-d-pontos')).toBe('1')

  // Sai pela porta da casa e chega junto da porta do mundo.
  const saida = objetos(cena('jogo-d-casa-1')).find((o) => o.id === 'porta-saida')!
  jogo.ir(...meio(saida))
  jogo.quadros(2)
  expect(jogo.sonda.lugar()).toBe('jogo-d-mundo')
  const ponto = objetos(mundo).find((o) => o.id === 'saida-casa-1')!
  expect(jogo.sonda.jogador.x + 11).toBe(ponto.x)
  expect(jogo.sonda.jogador.y + 12).toBe(ponto.y)
  expect(jogo.vivas()).toBe(225)

  // Volta para a casa: a moeda pega não volta.
  jogo.ir(...meio(porta))
  jogo.quadros(2)
  expect(jogo.sonda.lugar()).toBe('jogo-d-casa-1')
  expect(jogo.vivas()).toBe(5)
  expect(jogo.avisos).toEqual([])

  // Um jogo novo lê o que a cama guardou.
  const outro = await jogar()
  outro.quadros(2)
  expect(outro.sonda.pontos()).toBe(1)
  outro.ir(...meio(porta))
  outro.quadros(2)
  expect(outro.vivas()).toBe(5)
})

test('rodada: 70 passagens pelas portas da caverna sem aviso e com as mesmas entidades', async () => {
  const jogo = await jogar()
  jogo.quadros(2)
  const mundo = cena('jogo-d-mundo')
  const entrada = objetos(mundo).find((o) => o.id === 'porta-caverna-1')!
  const saida = objetos(cena('jogo-d-caverna-1')).find((o) => o.id === 'porta-saida')!
  for (let i = 0; i < 70; i++) {
    jogo.ir(...meio(i % 2 ? saida : entrada))
    jogo.quadros(2)
    expect(jogo.sonda.lugar()).toBe(i % 2 ? 'jogo-d-mundo' : 'jogo-d-caverna-1')
  }
  // 32 moedas, 10 morcegos e 1 baú na caverna.
  jogo.ir(...meio(entrada))
  jogo.quadros(2)
  expect(jogo.vivas()).toBe(43)
  expect(jogo.avisos).toEqual([])
})

test('rodada: o destino quebrado avisa uma vez e o herói fica onde está', async () => {
  const quebrados = structuredClone(JOGO_D_ASSETS)
  const mundo = quebrados.find((a) => a.name === 'jogo-d-mundo')!.scene!
  const porta = objetos(mundo).find((o) => o.id === 'porta-casa-4')!
  porta.properties = { ...porta.properties, destino: 'jogo-d-sumida' }
  const jogo = await jogar(quebrados)
  jogo.quadros(2)
  for (let vez = 0; vez < 3; vez++) {
    jogo.ir(...meio(porta))
    jogo.quadros(2)
    expect(jogo.sonda.lugar()).toBe('jogo-d-mundo')
    expect(jogo.sonda.jogador.x + 11).toBe(meio(porta)[0])
    expect(jogo.sonda.jogador.y + 12).toBe(meio(porta)[1])
    // Sai da porta para a entrada contar de novo.
    jogo.ir(meio(porta)[0], meio(porta)[1] + 64)
    jogo.quadros(2)
  }
  const avisos = jogo.avisos.map((a) => String(a[0]))
  expect(avisos.filter((a) => a.includes('jogo-d-sumida'))).toHaveLength(1)
  expect(avisos).toHaveLength(1)
})

test('rodada: os destinos das portas ficam prontos antes de passar, e a passagem não lê nada', async () => {
  const jogo = await jogar()
  jogo.quadros(10)
  const destinos = objetos(cena('jogo-d-mundo'))
    .filter((o) => o.role === 'door')
    .map((o) => String(o.properties.destino))
  // Só as cenas (as imagens dos personagens também passam pelos metadados).
  const ehCena = (nome: string) => cenas.some((s) => s.id === nome)
  expect(new Set(jogo.lidas.filter(ehCena))).toEqual(new Set(['jogo-d-mundo', ...destinos]))
  const antes = jogo.lidas.length
  jogo.ir(...meio(objetos(cena('jogo-d-mundo')).find((o) => o.id === 'porta-caverna-3')!))
  jogo.quadros(2)
  expect(jogo.sonda.lugar()).toBe('jogo-d-caverna-3')
  expect(jogo.lidas.slice(antes).filter(ehCena)).toEqual([])
})

test('rodada: a cama guarda numa chave só, também no armazenamento da prévia (500 chaves)', async () => {
  // O mesmo teto do armazenamento da prévia (`preview/storageBridge.ts`): a 501ª chave é recusada.
  const dados = new Map<string, string>()
  const prévia = {
    getItem: (k: string) => dados.get(k) ?? null,
    setItem: (k: string, v: unknown) => {
      if (!dados.has(k) && dados.size >= 500) throw new DOMException('cheio', 'QuotaExceededError')
      dados.set(k, String(v))
    },
    removeItem: (k: string) => void dados.delete(k),
    clear: () => dados.clear(),
    key: (i: number) => [...dados.keys()][i] ?? null,
    get length() {
      return dados.size
    },
  } as Storage
  const jogo = await jogar(JOGO_D_ASSETS, prévia)
  jogo.quadros(2)
  // A criança pegou quase tudo (600 itens) e foi dormir.
  for (let i = 0; i < 600; i++) jogo.sonda.pegos().push(`jogo-d-mundo/item-${i}`)
  const porta = objetos(cena('jogo-d-mundo')).find((o) => o.id === 'porta-casa-1')!
  jogo.ir(...meio(porta))
  jogo.quadros(2)
  jogo.ir(...meio(objetos(cena('jogo-d-casa-1')).find((o) => o.id === 'cama')!))
  jogo.quadros(2)
  expect(prévia.getItem('jogo-d-salvo')).toBe('sim')
  expect(dados.size).toBe(3)
  expect(jogo.avisos).toEqual([])
  const outro = await jogar(JOGO_D_ASSETS, prévia)
  outro.quadros(2)
  expect(outro.sonda.pegos()).toHaveLength(600)
})

test('rodada: a porta cuja chegada falta no destino ainda troca de lugar (o herói no início dele)', async () => {
  const semChegada = structuredClone(JOGO_D_ASSETS)
  const mundo = semChegada.find((a) => a.name === 'jogo-d-mundo')!.scene!
  const porta = objetos(mundo).find((o) => o.id === 'porta-casa-1')!
  porta.properties = { ...porta.properties, chegada: 'nada' }
  const jogo = await jogar(semChegada)
  jogo.quadros(2)
  jogo.ir(...meio(porta))
  jogo.quadros(2)
  expect(jogo.sonda.lugar()).toBe('jogo-d-casa-1')
  expect(jogo.vivas()).toBe(6)
  const inicio = objetos(cena('jogo-d-casa-1')).find((o) => o.role === 'start')!
  expect([jogo.sonda.jogador.x, jogo.sonda.jogador.y]).toEqual([inicio.x, inicio.y])
})
