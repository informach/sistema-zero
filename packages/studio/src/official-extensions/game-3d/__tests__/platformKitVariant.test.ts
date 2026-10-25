import { afterEach, describe, expect, it } from 'bun:test'
import * as RealTHREE from 'three'
import { createEmptyProject, type Project } from '#core'
import type { ExtensionExample } from '#extensions'
import { loadExtensionBootstrapScript } from '#extensions'
import { captureCoverFromProject } from '../../../cover/coverCapture'
import { buildClassicFileMap } from '../../../export/fileMap'
import { identityMinifiers } from '../../../export/minify'
import { generateProjectFiles } from '../../../generators/project'
import { renderProjectToPreviewDocAsync } from '../../../preview/renderProject'
import { gameThreeDExtension } from '..'
import { gameThreeDExamples } from '../exampleCatalog'
import { corridaInfinitaExample, pegaEstrelasExample, reinoCogumeloExample } from '../examples'
import { GAME_3D_PLATFORM_KIT_METHODS } from '../platformCodec'
import {
  GAME_3D_WITHOUT_PLATFORM_VARIANT,
  gameThreeDBootstrapVariant,
  gameThreeDUsesPlatformKit,
} from '../platformKitVariant'
import { gameThreeDRuntime, gameThreeDRuntimeWithoutPlatform } from '../runtime'
import { gameThreeDPlatformRuntimeSource } from '../runtimePlatform'

/**
 * Kit Plataforma injetado só quando o projeto usa (lote 14 do review 3D, P2). O runtime sem o
 * kit tem de ser o MESMO jogo para quem não usa o kit, e o preview, a capa, o export e o player
 * têm de escolher a mesma variante para o mesmo projeto.
 */

/** Uma linha que só existe no fragmento do kit (sobrevive à compactação do runtime). */
const KIT_LINE = 'var MAX_STAGE_MESHES = 260;'
const ABSENT_LINE = 'function platformKitAbsent()'

const runtimeBody = (source: string) => source.replace(/^import \* as THREE from 'three';\n/, '')

describe('Kit Plataforma: a lista do codec é a do fragmento', () => {
  it('cada método da lista é uma função do fragmento e uma chave da API', () => {
    for (const name of GAME_3D_PLATFORM_KIT_METHODS) {
      expect(gameThreeDPlatformRuntimeSource).toContain(`function ${name}(`)
      expect(gameThreeDRuntime).toContain(`${name}: ${name},`)
    }
  })

  it('nenhuma chave da API aponta para função do fragmento fora da lista', () => {
    const fragmentFunctions = new Set(
      [...gameThreeDPlatformRuntimeSource.matchAll(/^ {2}function ([A-Za-z_$][\w$]*)\(/gm)].map(
        (m) => m[1],
      ),
    )
    const apiNames = [...gameThreeDRuntime.matchAll(/^([A-Za-z_$][\w$]*): \1,?$/gm)].map(
      (m) => m[1] as string,
    )
    // Anti-vácuo: as duas varreduras acharam alguma coisa.
    expect(fragmentFunctions.size).toBeGreaterThan(40)
    expect(apiNames.length).toBeGreaterThan(100)
    const exposedFromKit = apiNames.filter((name) => fragmentFunctions.has(name)).sort()
    expect(exposedFromKit).toEqual([...GAME_3D_PLATFORM_KIT_METHODS].sort())
  })
})

describe('Kit Plataforma: as duas variantes do runtime', () => {
  it('o completo traz o fragmento; o sem kit traz só o substituto', () => {
    expect(gameThreeDRuntime).toContain(KIT_LINE)
    expect(gameThreeDRuntime).not.toContain(ABSENT_LINE)
    expect(gameThreeDRuntimeWithoutPlatform).not.toContain(KIT_LINE)
    expect(gameThreeDRuntimeWithoutPlatform).toContain(ABSENT_LINE)
    // O kit pesa: a variante sem ele tem de ser bem menor.
    expect(gameThreeDRuntime.length - gameThreeDRuntimeWithoutPlatform.length).toBeGreaterThan(
      25_000,
    )
  })

  it('as duas compilam e o sem kit não tem crase nem cifrão-chave soltos', () => {
    for (const source of [gameThreeDRuntime, gameThreeDRuntimeWithoutPlatform]) {
      expect(() => new Function('THREE', 'window', 'document', runtimeBody(source))).not.toThrow()
    }
    expect(gameThreeDRuntimeWithoutPlatform).not.toContain('`')
    expect(gameThreeDRuntimeWithoutPlatform).not.toContain('${')
  })
})

describe('Kit Plataforma: detecção pelo código', () => {
  for (const name of GAME_3D_PLATFORM_KIT_METHODS) {
    it(`SZGame3D.${name}( pede o runtime completo`, () => {
      const code = `const cena = SZGame3D.createScene("tela");\nSZGame3D.${name}(cena, "x");`
      expect(gameThreeDUsesPlatformKit(code)).toBe(true)
      expect(gameThreeDBootstrapVariant({ code })).toBe('')
    })
  }

  it('apelido e colchete também contam; parte de outro nome não conta', () => {
    expect(gameThreeDUsesPlatformKit('const g = SZGame3D; g.loadStage(cena, mapa)')).toBe(true)
    expect(gameThreeDUsesPlatformKit("SZGame3D['stageStep'](cena, heroi)")).toBe(true)
    expect(gameThreeDUsesPlatformKit('const { heroIs } = SZGame3D')).toBe(true)
    expect(gameThreeDUsesPlatformKit('minhaloadStageX(); loadStage2()')).toBe(false)
  })

  it('código sem o kit pede a variante enxuta; sem contexto, o completo', () => {
    const code = 'const cena = SZGame3D.createScene("tela"); SZGame3D.createBox(cena, 1, 1, 1)'
    expect(gameThreeDBootstrapVariant({ code })).toBe(GAME_3D_WITHOUT_PLATFORM_VARIANT)
    expect(gameThreeDBootstrapVariant()).toBe('')
  })

  it('loadBootstrapScript: sem contexto completo, com contexto pela detecção', async () => {
    const runtime = gameThreeDExtension.runtime
    if (!runtime.loadBootstrapScript) throw new Error('o Jogo 3D carrega por loadBootstrapScript')
    expect(await runtime.loadBootstrapScript()).toBe(gameThreeDRuntime)
    expect(await runtime.loadBootstrapScript({ code: 'SZGame3D.createScene("t")' })).toBe(
      gameThreeDRuntimeWithoutPlatform,
    )
    expect(await runtime.loadBootstrapScript({ code: 'SZGame3D.loadStage(c, m)' })).toBe(
      gameThreeDRuntime,
    )
  })

  it('o host memoiza por variante: o mesmo tipo de código não recompõe', async () => {
    let calls = 0
    const runtime = gameThreeDExtension.runtime
    if (!runtime.loadBootstrapScript) throw new Error('o Jogo 3D carrega por loadBootstrapScript')
    const load = runtime.loadBootstrapScript
    const counted = {
      ...gameThreeDExtension,
      runtime: {
        ...runtime,
        loadBootstrapScript: (context?: { code: string }) => {
          calls += 1
          return load(context)
        },
      },
    }
    const a = await loadExtensionBootstrapScript(counted, { code: 'SZGame3D.createScene("a")' })
    const b = await loadExtensionBootstrapScript(counted, { code: 'SZGame3D.createBox(c)' })
    expect(a).toBe(b)
    expect(calls).toBe(1)
    const full = await loadExtensionBootstrapScript(counted, { code: 'SZGame3D.heroIs(h, "x")' })
    expect(await loadExtensionBootstrapScript(counted)).toBe(full)
    expect(calls).toBe(2)
  })
})

// ---------------------------------------------------------------------------------------
// O runtime sem kit roda os jogos que não usam o kit igual ao completo.
// ---------------------------------------------------------------------------------------

class FakeRenderer {
  static created: FakeRenderer[] = []
  shadowMap = { enabled: false, type: 0 }
  loop: ((time: number) => void) | null = null
  renders = 0
  capabilities = { maxTextureSize: 4096, isWebGL2: true }
  constructor() {
    FakeRenderer.created.push(this)
  }
  setPixelRatio() {}
  setSize() {}
  setAnimationLoop(loop: ((time: number) => void) | null) {
    this.loop = loop
  }
  render() {
    this.renders++
  }
  dispose() {}
  forceContextLoss() {}
}

function exampleFiles(example: ExtensionExample) {
  const files = generateProjectFiles({
    ir: example.ir as Parameters<typeof generateProjectFiles>[0]['ir'],
    projectName: example.name,
  })
  const html = String(files['index.html'] ?? '')
  const body = (/<body[^>]*>([\s\S]*)<\/body>/i.exec(html)?.[1] ?? '').replace(
    /<script[\s\S]*?<\/script>/gi,
    '',
  )
  return { body, script: String(files['script.js'] ?? '') }
}

const exampleScript = (example: ExtensionExample) => exampleFiles(example).script

/** Roda o jogo 150 quadros (com o "começar" e teclas) e devolve o que dá para comparar. */
/** Sorteio e relógio fixos: as duas variantes têm de ver o MESMO jogo para serem comparadas. */
function deterministic<T>(run: (clock: { t: number }) => T): T {
  const random = Math.random
  const now = performance.now
  const dateNow = Date.now
  let seed = 1
  const clock = { t: 0 }
  Math.random = () => {
    seed = (seed * 16_807) % 2_147_483_647
    return (seed - 1) / 2_147_483_646
  }
  performance.now = () => clock.t
  Date.now = () => clock.t
  try {
    return run(clock)
  } finally {
    Math.random = random
    performance.now = now
    Date.now = dateNow
  }
}

function play(runtime: string, files: { body: string; script: string }) {
  return deterministic((clock) => playWith(runtime, files, clock))
}

function playWith(
  runtime: string,
  { body, script }: { body: string; script: string },
  clock: { t: number },
) {
  FakeRenderer.created = []
  document.body.innerHTML = body
  const listeners = new Map<string, Set<(e: unknown) => void>>()
  const win: Record<string, unknown> = {
    devicePixelRatio: 1,
    innerWidth: 800,
    innerHeight: 600,
    addEventListener(name: string, fn: (e: unknown) => void) {
      const set = listeners.get(name) ?? new Set()
      set.add(fn)
      listeners.set(name, set)
    },
    removeEventListener(name: string, fn: (e: unknown) => void) {
      listeners.get(name)?.delete(fn)
    },
  }
  const THREE = { ...RealTHREE, WebGLRenderer: FakeRenderer }
  new Function('THREE', 'window', 'document', runtimeBody(runtime))(THREE, win, document)
  const api = win.SZGame3D as Record<string, unknown>
  new Function('window', 'SZGame3D', script)(win, api)
  const frame = (n: number) => {
    for (let i = 0; i < n; i++) {
      clock.t += 16
      FakeRenderer.created.at(-1)?.loop?.(clock.t)
    }
  }
  frame(1)
  ;(document.querySelector('.szr-screen button') as HTMLButtonElement | null)?.click()
  for (const code of ['ArrowRight', 'ArrowUp', 'Space']) {
    for (const fn of listeners.get('keydown') ?? [])
      fn({ preventDefault() {}, code, key: code, repeat: false })
  }
  frame(150)
  return {
    apiKeys: Object.keys(api).sort(),
    renders: FakeRenderer.created.at(-1)?.renders ?? 0,
    body: document.body.innerHTML,
  }
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Kit Plataforma: o runtime sem kit roda os jogos sem kit', () => {
  for (const example of [pegaEstrelasExample, corridaInfinitaExample]) {
    it(`${example.name}: escolhe a variante sem kit`, () => {
      expect(gameThreeDBootstrapVariant({ code: exampleScript(example) })).toBe(
        GAME_3D_WITHOUT_PLATFORM_VARIANT,
      )
    })
  }

  it('todo exemplo sem o kit joga igual nas duas variantes', () => {
    let played = 0
    for (const example of gameThreeDExamples) {
      const files = exampleFiles(example)
      if (gameThreeDBootstrapVariant({ code: files.script }) !== GAME_3D_WITHOUT_PLATFORM_VARIANT)
        continue
      const enxuto = play(gameThreeDRuntimeWithoutPlatform, files)
      const completo = play(gameThreeDRuntime, files)
      expect({ example: example.name, ...enxuto }).toEqual({ example: example.name, ...completo })
      expect(enxuto.renders).toBeGreaterThan(150)
      played++
    }
    // Anti-vácuo: o catálogo tem 20 jogos sem o kit (só o Reino Cogumelo usa).
    expect(played).toBeGreaterThanOrEqual(20)
  })

  it('Reino Cogumelo (o jogo do kit) recebe o runtime completo', () => {
    expect(gameThreeDBootstrapVariant({ code: exampleScript(reinoCogumeloExample) })).toBe('')
  })

  it('chamar um método do kit no runtime sem kit para com o recado, não no carregamento', () => {
    const win: Record<string, unknown> = { addEventListener() {}, removeEventListener() {} }
    const THREE = { ...RealTHREE, WebGLRenderer: FakeRenderer }
    new Function('THREE', 'window', 'document', runtimeBody(gameThreeDRuntimeWithoutPlatform))(
      THREE,
      win,
      document,
    )
    const api = win.SZGame3D as Record<string, () => unknown>
    expect(typeof api.loadStage).toBe('function')
    expect(() => api.loadStage?.()).toThrow('Kit Plataforma')
  })
})

// ---------------------------------------------------------------------------------------
// Preview/player, capa e export escolhem a MESMA variante para o mesmo projeto.
// ---------------------------------------------------------------------------------------

function game3dProject(script: string): Project {
  const base = createEmptyProject('01ARZ3NDEKTSV4RRFFQ69G5FAX', 'Jogo 3D')
  return {
    ...base,
    files: {
      'index.html': '<body><canvas id="tela"></canvas><script src="script.js"></script></body>',
      'style.css': 'body{margin:0}',
      'script.js': script,
    },
    installedExtensions: [{ id: 'game-3d', version: '1.0.0', installedAt: 0 }],
  }
}

/** O texto do documento com os scripts externalizados em data: já decodificados. */
function documentText(doc: string): string {
  const decoded = [...doc.matchAll(/data:text\/javascript;base64,([^"']+)/gi)].map((m) =>
    Buffer.from(m[1] ?? '', 'base64').toString('utf-8'),
  )
  return [doc, ...decoded].join('\n')
}

async function coverDocument(project: Project): Promise<string> {
  const docs: string[] = []
  await captureCoverFromProject(project, {
    requireIsolatedPreview: true,
    originAdapter: {
      async createPreviewUrl(request) {
        docs.push(request.document)
        throw new Error('sem rede no teste')
      },
    },
  })
  const doc = docs[0]
  if (!doc) throw new Error('a capa não montou o documento')
  return documentText(doc)
}

async function exportedRuntime(project: Project): Promise<string> {
  const { files } = await buildClassicFileMap(project, identityMinifiers)
  return String(files['public/sz-ext/game-3d.js'] ?? '')
}

async function playerDocument(project: Project): Promise<string> {
  return documentText(await renderProjectToPreviewDocAsync(project))
}

describe('Kit Plataforma: preview, capa e export coerentes', () => {
  const cases = [
    {
      nome: 'sem o kit',
      script: 'const cena = SZGame3D.createScene("tela");',
      has: ABSENT_LINE,
      hasNot: KIT_LINE,
    },
    {
      nome: 'com o kit',
      script: 'const cena = SZGame3D.createPlatformScene("tela");',
      has: KIT_LINE,
      hasNot: ABSENT_LINE,
    },
  ]
  for (const { nome, script, has, hasNot } of cases) {
    it(`${nome}: player, capa e site exportado injetam a mesma variante`, async () => {
      const project = game3dProject(script)
      const [player, cover, exported] = await Promise.all([
        playerDocument(project),
        coverDocument(project),
        exportedRuntime(project),
      ])
      for (const text of [player, cover, exported]) {
        expect(text).toContain(has)
        expect(text).not.toContain(hasNot)
      }
    })
  }

  it('o kit num arquivo extra também conta', async () => {
    const project: Project = {
      ...game3dProject('const cena = SZGame3D.createScene("tela");'),
      extraFiles: [
        { name: 'fase.js', language: 'javascript', content: 'SZGame3D.loadStage(c, m)' },
      ],
    }
    expect(await exportedRuntime(project)).toContain(KIT_LINE)
    expect(await playerDocument(project)).toContain(KIT_LINE)
  })
})

describe('Cenas dos kits sem página: propriedade e descarte', () => {
  it('Travessia, Corrida, Empilhar e Plataforma usam uma tela própria e restauram a página ao parar', () => {
    document.body.innerHTML = '<p id="host-content">Conteúdo do host</p>'
    document.body.style.margin = '13px'
    document.body.style.background = 'pink'
    document.documentElement.style.overflow = 'auto'
    const win: Record<string, unknown> = {
      innerWidth: 800,
      innerHeight: 600,
      addEventListener() {},
      removeEventListener() {},
    }
    new Function('THREE', 'window', 'document', runtimeBody(gameThreeDRuntime))(
      { ...RealTHREE, WebGLRenderer: FakeRenderer },
      win,
      document,
    )
    const api = win.SZGame3D
    if (
      !api ||
      typeof api !== 'object' ||
      !('createFullscreenScene' in api) ||
      typeof api.createFullscreenScene !== 'function' ||
      !('disposeAll' in api) ||
      typeof api.disposeAll !== 'function'
    )
      throw new Error('API do Jogo 3D ausente')
    for (const kit of ['crossing', 'race', 'stack', 'platform']) {
      api.createFullscreenScene('#0b1020', kit)
      expect(document.querySelectorAll('canvas').length).toBe(1)
      expect(document.getElementById('host-content')?.textContent).toBe('Conteúdo do host')
      expect(document.body.style.margin).toBe('0px')
    }
    api.disposeAll()
    expect(document.querySelectorAll('canvas').length).toBe(0)
    expect(document.getElementById('host-content')?.textContent).toBe('Conteúdo do host')
    expect(document.body.style.margin).toBe('13px')
    expect(document.body.style.background).toBe('pink')
    expect(document.documentElement.style.overflow).toBe('auto')
    const create = api.createFullscreenScene
    expect(() => create('#0b1020', 'unknown-kit')).toThrow('tipo de kit')
    expect(document.querySelectorAll('canvas').length).toBe(0)
  })
  it('falha ao criar o renderer não deixa canvas nem estilos do jogo na página', () => {
    document.body.innerHTML = '<p>Host intacto</p>'
    document.body.style.margin = '17px'
    document.body.style.background = 'pink'
    document.documentElement.style.overflow = 'auto'
    class FailedRenderer {
      constructor() {
        throw new Error('WebGL indisponível')
      }
    }
    const win: Record<string, unknown> = { addEventListener() {}, removeEventListener() {} }
    new Function('THREE', 'window', 'document', runtimeBody(gameThreeDRuntime))(
      { ...RealTHREE, WebGLRenderer: FailedRenderer },
      win,
      document,
    )
    const api = win.SZGame3D
    if (
      !api ||
      typeof api !== 'object' ||
      !('createFullscreenScene' in api) ||
      typeof api.createFullscreenScene !== 'function'
    )
      throw new Error('API ausente')
    const create = api.createFullscreenScene
    expect(() => create('#0b1020', 'crossing')).toThrow('WebGL indisponível')
    expect(document.querySelectorAll('canvas').length).toBe(0)
    expect(document.body.style.margin).toBe('17px')
    expect(document.body.style.background).toBe('pink')
    expect(document.documentElement.style.overflow).toBe('auto')
  })
})

it('os controles nativos dos kits conservam toque, teclado físico e limpeza sem criar uma segunda lógica de jogo', () => {
  const listeners = new Map<string, Set<(event: object) => void>>()
  const win: Record<string, unknown> = {
    innerWidth: 800,
    innerHeight: 600,
    addEventListener(name: string, fn: (event: object) => void) {
      const list = listeners.get(name) ?? new Set()
      list.add(fn)
      listeners.set(name, list)
    },
    removeEventListener(name: string, fn: (event: object) => void) {
      listeners.get(name)?.delete(fn)
    },
  }
  new Function('THREE', 'window', 'document', runtimeBody(gameThreeDRuntime))(
    { ...RealTHREE, WebGLRenderer: FakeRenderer },
    win,
    document,
  )
  const api = win.SZGame3D
  if (
    !api ||
    typeof api !== 'object' ||
    !('createFullscreenScene' in api) ||
    typeof api.createFullscreenScene !== 'function' ||
    !('onKey' in api) ||
    typeof api.onKey !== 'function' ||
    !('keyDown' in api) ||
    typeof api.keyDown !== 'function' ||
    !('disposeAll' in api) ||
    typeof api.disposeAll !== 'function'
  )
    throw new Error('API ausente')
  api.createFullscreenScene('#0b1020', 'crossing')
  let pressed = 0
  api.onKey('ArrowUp', () => {
    pressed++
  })
  const forward = document.querySelector('[data-sz-kit-key="ArrowUp"]')
  if (!forward) throw new Error('O kit perdeu o controle de toque')
  forward.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 7, button: 0, bubbles: true }))
  expect(api.keyDown('ArrowUp')).toBe(true)
  expect(pressed).toBe(1)
  for (const fn of listeners.get('keydown') ?? []) fn({ code: 'ArrowUp', preventDefault() {} })
  forward.dispatchEvent(new PointerEvent('pointerup', { pointerId: 7, bubbles: true }))
  expect(api.keyDown('ArrowUp')).toBe(true) // soltar o toque não solta o teclado físico
  expect(pressed).toBe(1)
  for (const fn of listeners.get('keyup') ?? []) fn({ code: 'ArrowUp' })
  expect(api.keyDown('ArrowUp')).toBe(false)
  forward.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 8, button: 0, bubbles: true }))
  forward.dispatchEvent(new PointerEvent('pointercancel', { pointerId: 8, bubbles: true }))
  expect(api.keyDown('ArrowUp')).toBe(false)
  forward.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 9, button: 0, bubbles: true }))
  api.createFullscreenScene('#0b1020', 'race')
  expect(api.keyDown('ArrowUp')).toBe(false)
  expect(document.querySelectorAll('[data-sz-kit-controls]').length).toBe(1)
  api.disposeAll()
  expect(document.querySelectorAll('[data-sz-kit-controls]').length).toBe(0)
})
