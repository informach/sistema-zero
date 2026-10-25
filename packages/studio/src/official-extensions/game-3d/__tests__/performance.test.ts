import { afterEach, describe, expect, it } from 'bun:test'
import * as RealTHREE from 'three'
import { generateProjectFiles } from '../../../generators/project'
import { makeCountingThree, mathAllocations } from '../../__tests__/three3d/countingThree'
import { corridaInfinitaExample, pegaEstrelasExample } from '../examples'
import { gameThreeDRuntime } from '../runtime'

/**
 * Travas de DESEMPENHO do Jogo 3D (lote 14 do review 3D). Roda exemplos de verdade (o JS
 * gerado da IR embutida) sobre o runtime real, com o THREE CONTADOR
 * (`__tests__/three3d/countingThree.ts`) e um renderer falso que conta `render`.
 *
 * - Zero alocação de matemática por quadro: depois de 30 quadros de aquecimento, 120 quadros
 *   jogando não constroem Vector3/Box3/Matrix4/Raycaster/Quaternion.
 * - `scene.updateMatrixWorld`: no máximo 1 chamada do RUNTIME por quadro (o renderer falso
 *   não chama nenhuma; o de verdade chama uma no render).
 */

class FakeRenderer {
  static created: FakeRenderer[] = []
  shadowMap = { enabled: false, type: 0 }
  loop: ((time: number) => void) | null = null
  pixelRatio = 1
  sizes: [number, number][] = []
  renders = 0
  capabilities = { maxTextureSize: 4096, isWebGL2: true }
  constructor() {
    FakeRenderer.created.push(this)
  }
  setPixelRatio(n: number) {
    this.pixelRatio = n
  }
  setSize(w: number, h: number) {
    this.sizes.push([w, h])
  }
  setAnimationLoop(loop: ((time: number) => void) | null) {
    this.loop = loop
  }
  render() {
    this.renders++
  }
  dispose() {}
  forceContextLoss() {}
}

type Api = Record<string, (...args: unknown[]) => unknown>

function boot(source: string) {
  FakeRenderer.created = []
  const listeners = new Map<string, Set<(e: unknown) => void>>()
  const win: Record<string, unknown> = {
    devicePixelRatio: 1,
    innerWidth: 800,
    innerHeight: 600,
    SZGame3D: undefined,
    addEventListener(name: string, fn: (e: unknown) => void) {
      const set = listeners.get(name) ?? new Set()
      set.add(fn)
      listeners.set(name, set)
    },
    removeEventListener(name: string, fn: (e: unknown) => void) {
      listeners.get(name)?.delete(fn)
    },
  }
  const counting = makeCountingThree({ ...RealTHREE, WebGLRenderer: FakeRenderer })
  const body = gameThreeDRuntime.replace(/^import \* as THREE from 'three';\n/, '')
  new Function('THREE', 'window', 'document', body)(counting.THREE, win, document)
  const api = win.SZGame3D as Api
  new Function('window', 'SZGame3D', source)(win, api)
  let t = 0
  const frame = (n = 1) => {
    for (let i = 0; i < n; i++) {
      t += 16
      FakeRenderer.created.at(-1)?.loop?.(t)
    }
  }
  const fire = (name: string, event: Record<string, unknown>) => {
    for (const fn of listeners.get(name) ?? []) fn({ preventDefault() {}, ...event })
  }
  return { api, win, counting, frame, fire }
}

function exampleScript(example: { ir: unknown; name: string }) {
  return generateProjectFiles({
    ir: example.ir as Parameters<typeof generateProjectFiles>[0]['ir'],
    projectName: example.name,
  })['script.js'] as string
}

function startButton() {
  return document.querySelector('.szr-screen button') as HTMLButtonElement | null
}

afterEach(() => {
  document.body.innerHTML = ''
})

/** Aquece 30 quadros, zera e mede 120 com as teclas dadas apertadas. */
function measure(example: { ir: unknown; name: string }, keys: string[]) {
  const { counting, frame, fire } = boot(exampleScript(example))
  frame()
  startButton()?.click()
  for (const code of keys) fire('keydown', { code, key: code, repeat: false })
  frame(30)
  counting.reset()
  frame(120)
  return { counts: { ...counting.counts }, renderer: FakeRenderer.created.at(-1) }
}

describe('Jogo 3D — zero alocação por quadro', () => {
  it('Pega-Estrelas: 120 quadros andando e pulando não constroem matemática nova', () => {
    const { counts, renderer } = measure(pegaEstrelasExample, ['ArrowRight', 'ArrowUp', 'Space'])
    expect(renderer?.renders).toBeGreaterThan(120)
    expect(mathAllocations(counts)).toBe(0)
    // O runtime sincroniza as matrizes no máximo uma vez por quadro.
    expect(counts.sceneUpdateMatrixWorld).toBeLessThanOrEqual(120)
  })

  it('Corrida Infinita: 120 quadros correndo não constroem matemática nova', () => {
    const { counts, renderer } = measure(corridaInfinitaExample, ['ArrowLeft', 'Space'])
    expect(renderer?.renders).toBeGreaterThan(120)
    expect(mathAllocations(counts)).toBe(0)
    expect(counts.sceneUpdateMatrixWorld).toBeLessThanOrEqual(120)
  })
})

/** Roda um script do aluno escrito à mão (as APIs que as travas querem exercitar). */
function bootScript(source: string) {
  return boot(source)
}

describe('Jogo 3D — consultas sem lixo e sem varrer a cena', () => {
  const SCRIPT = `
const cena = SZGame3D.createFullscreenScene("#0b1020");
const chao = SZGame3D.createPlane(cena, { width: 40, depth: 40, color: "#3a7" });
SZGame3D.setSolid(chao);
const heroi = SZGame3D.createBox(cena, { size: 1, color: "#fff" });
SZGame3D.setPosition(heroi, 0, 2, 0);
SZGame3D.body(heroi, 36);
const molde = SZGame3D.createBox(cena, { size: 1, color: "#f00" });
SZGame3D.setPosition(molde, 0, 50, 0);
const inimigos = SZGame3D.createGroup();
for (let i = 0; i < 20; i++) SZGame3D.spawnCopy(inimigos, molde, i * 2 - 20, 0.5, 6);
let pontos = 0;
SZGame3D.onTouchGroup(heroi, inimigos, () => { pontos++; });
SZGame3D.animate(cena, () => {
  SZGame3D.moveForward(heroi, 2);
  SZGame3D.stepBody(heroi, cena);
  SZGame3D.forEachHit(heroi, "pes", () => {});
  if (SZGame3D.onGround(cena, heroi)) pontos += 0;
  SZGame3D.aimAhead(cena, heroi, 30);
  SZGame3D.pickAtMouse(cena);
  SZGame3D.hitAny(heroi, inimigos);
  SZGame3D.groundHeight(cena, heroi);
});
`.trim()

  it('120 quadros de mira, chão, clique e encostar: 0 construções e 1 sincronização por quadro', () => {
    const { counting, frame } = bootScript(SCRIPT)
    frame(30)
    // O contador funciona: o aquecimento criou os temporários (uma vez só).
    counting.reset()
    frame(120)
    const c = counting.counts
    expect(mathAllocations(c)).toBe(0)
    expect(c.sceneUpdateMatrixWorld).toBeLessThanOrEqual(120)
    expect(c.sceneUpdateMatrixWorld).toBeGreaterThan(0)
    // Cada raycast olha a lista de quem pode ser mirado (chão, herói, molde e as 20 cópias),
    // nunca a cena inteira (luzes, câmera, grupos dos kits).
    expect(c.intersectLists.length).toBeGreaterThan(0)
    expect(new Set(c.intersectLists)).toEqual(new Set([23]))
  })

  it('o contador enxerga construções (anti-vácuo)', () => {
    const { counting, api } = bootScript('')
    counting.reset()
    const cena = api.createFullscreenScene?.('#000') as unknown
    const caixa = api.createBox?.(cena, { size: 1 })
    api.moveForward?.(caixa, 1)
    api.onGround?.(cena, caixa)
    expect(counting.counts.Vector3).toBeGreaterThan(0)
    expect(counting.counts.Raycaster).toBe(1)
  })
})

type Obj = RealTHREE.Mesh<RealTHREE.BufferGeometry, RealTHREE.MeshStandardMaterial>

describe('Jogo 3D — geometria e material compartilhados', () => {
  it('caixas iguais dividem UMA geometria; a última a sair é quem a descarta', () => {
    const { api } = bootScript('')
    const cena = api.createFullscreenScene?.('#000')
    const a = api.createBox?.(cena, { size: 1 }) as Obj
    const b = api.createBox?.(cena, { size: 1 }) as Obj
    const c = api.createBox?.(cena, { size: 2 }) as Obj
    expect(a.geometry).toBe(b.geometry)
    expect(c.geometry).not.toBe(a.geometry)
    let disposed = 0
    a.geometry.addEventListener('dispose', () => disposed++)
    api.remove?.(cena, a)
    expect(disposed).toBe(0)
    api.remove?.(cena, b)
    expect(disposed).toBe(1)
    // Depois de descartada, uma caixa nova do mesmo tamanho ganha geometria nova.
    const d = api.createBox?.(cena, { size: 1 }) as Obj
    expect(d.geometry).not.toBe(a.geometry)
  })

  it('cópias do grupo usam o material do molde até serem pintadas (copy-on-write)', () => {
    const { api } = bootScript('')
    const cena = api.createFullscreenScene?.('#000')
    const molde = api.createBox?.(cena, { size: 1, color: '#ff0000' }) as Obj
    const grupo = api.createGroup?.() as Obj[]
    const c1 = api.spawnCopy?.(grupo, molde, 1, 0, 0) as Obj
    const c2 = api.spawnCopy?.(grupo, molde, 2, 0, 0) as Obj
    expect(c1.material).toBe(molde.material)
    expect(c2.material).toBe(molde.material)
    // Pintar uma cópia não mexe nas outras nem no molde.
    api.setColor?.(c1, '#00ff00')
    expect(c1.material).not.toBe(molde.material)
    expect(c1.material.color.getHexString()).toBe('00ff00')
    expect(molde.material.color.getHexString()).toBe('ff0000')
    expect(c2.material).toBe(molde.material)
    // Pintar o molde também não mexe na cópia que ainda usa o material de antes.
    const antigo = molde.material
    api.setOpacity?.(molde, 0.5)
    expect(molde.material).not.toBe(antigo)
    expect(c2.material).toBe(antigo)
    expect(c2.material.opacity).toBe(1)
    // O material emprestado só é descartado quando a última cópia sai.
    let disposed = 0
    antigo.addEventListener('dispose', () => disposed++)
    api.removeFromGroup?.(grupo, c2)
    api.remove?.(cena, c2)
    expect(disposed).toBe(1)
  })
})

describe('Jogo 3D — luzes e sombras', () => {
  it('luz pontual nasce SEM sombra; "com sombra" vale para uma por cena e a 2ª avisa', () => {
    const { api } = bootScript('')
    const cena = api.createFullscreenScene?.('#000')
    const warns: string[] = []
    const original = console.warn
    console.warn = (...args: unknown[]) => warns.push(args.map(String).join(' '))
    try {
      const comum = api.addPointLight?.(cena, '#fff', 1, 0, 2, 0) as RealTHREE.PointLight
      expect(comum.castShadow).toBe(false)
      const primeira = api.addPointLight?.(
        cena,
        '#fff',
        1,
        0,
        2,
        0,
        'com-sombra',
      ) as RealTHREE.PointLight
      expect(primeira.castShadow).toBe(true)
      const segunda = api.addPointLight?.(
        cena,
        '#fff',
        1,
        0,
        2,
        0,
        'com-sombra',
      ) as RealTHREE.PointLight
      expect(segunda.castShadow).toBe(false)
    } finally {
      console.warn = original
    }
    expect(warns.some((w) => w.includes('UMA luz pontual'))).toBe(true)
  })

  it('"Adicionar sol" não liga uma 2ª sombra quando a cena já tem o sol padrão', () => {
    const { api } = bootScript('')
    const cena = api.createFullscreenScene?.('#000') as { scene: RealTHREE.Scene }
    const sol = api.addSunLight?.(cena, '#fff', 1) as RealTHREE.DirectionalLight
    expect(sol.castShadow).toBe(false)
    const comSombra = cena.scene.children.filter(
      (o) => (o as RealTHREE.DirectionalLight).isDirectionalLight && o.castShadow,
    ) as RealTHREE.DirectionalLight[]
    expect(comSombra).toHaveLength(1)
    // O sol padrão segue o orçamento: mapa 2048 no nível alta.
    expect(comSombra[0]?.shadow.mapSize.x).toBe(2048)
  })
})

describe('Kit Plataforma — peças da fase compartilham geometria e material', () => {
  // Decisão do lote 14: CACHE de geometria + material por tipo de peça, sem InstancedMesh
  // (o streaming por coluna, o tijolo que quebra, a surpresa que vira pedra e a troca de
  // tema seguem com uma malha por peça). A trava é: centenas de peças, poucos tipos.
  const SCRIPT = `
const jogo = SZGame3D.createPlatformScene("tela");
window.__jogo = jogo;
const heroi = SZGame3D.createHero(jogo, "#e03010");
SZGame3D.loadStage(jogo, FASE);
SZGame3D.animate(jogo, () => {
  SZGame3D.classicPlatformer(heroi, jogo, 5.4, 13.2);
  SZGame3D.stageStep(jogo, heroi);
  SZGame3D.sideCamera(jogo, heroi);
});
`.trim()

  function bootStage() {
    const canvas = document.createElement('canvas')
    canvas.id = 'tela'
    document.body.appendChild(canvas)
    // Uma fase de ~300 blocos: chão longo, uma fileira de tijolos e surpresas, colunas
    // sólidas e moedas (sem inimigos: o herói corre até o fim).
    const cols = Array.from({ length: 300 }, (_, i) => i + 3)
    const map = [
      'chao=0-320',
      `tijolo=${cols
        .filter((c) => c % 3)
        .map((c) => `${c}:5`)
        .join(',')}`,
      `surpresa=${cols
        .filter((c) => c % 3 === 0)
        .map((c) => `${c}:5:moeda`)
        .join(',')}`,
      `solido=${cols
        .filter((c) => c % 40 === 0)
        .map((c) => `${c}:10-11`)
        .join(',')}`,
      `moeda=${cols
        .filter((c) => c % 2)
        .map((c) => `${c}:8`)
        .join(',')}`,
    ].join(';')
    const booted = bootScript(`const FASE = ${JSON.stringify(map)};\n${SCRIPT}`)
    const stage = () => (booted.win.__jogo as { _stage: { meshes: Obj[] } })._stage
    return { ...booted, stage }
  }

  it('correr uma fase de ~300 blocos: centenas de peças, poucos tipos de geometria e material, 0 alocação', () => {
    const { counting, frame, fire, stage } = bootStage()
    fire('keydown', { code: 'ArrowRight', key: 'ArrowRight', repeat: false })
    const geometries = new Set<unknown>()
    const materials = new Set<unknown>()
    const seen = new Set<unknown>()
    const collect = () => {
      for (const mesh of stage().meshes) {
        if (seen.has(mesh)) continue
        seen.add(mesh)
        geometries.add(mesh.geometry)
        materials.add(mesh.material)
      }
    }
    frame(30)
    counting.reset()
    for (let f = 0; f < 120; f++) {
      frame(1)
      collect()
    }
    expect(mathAllocations(counting.counts)).toBe(0)
    for (let f = 0; f < 3600; f++) {
      frame(1)
      collect()
    }
    // Ao longo da corrida o streaming materializou centenas de peças...
    expect(seen.size).toBeGreaterThan(300)
    // ...com poucos tipos: cada tipo de peça é UMA geometria e UM material.
    expect(geometries.size).toBeLessThanOrEqual(24)
    expect(materials.size).toBeLessThanOrEqual(24)
  })
})

describe('Jogo 3D — "Criar cópia" não serializa o userData do molde', () => {
  it('userData com ciclo e com malha: a cópia nasce, leva só os dados simples e o molde fica igual', () => {
    const { api } = bootScript('')
    const cena = api.createFullscreenScene?.('#000')
    const molde = api.createBox?.(cena, { size: 1, color: '#ff0000' }) as Obj
    const outro = api.createBox?.(cena, { size: 2, color: '#00ff00' }) as Obj
    const grupo = api.createGroup?.() as Obj[]
    const ciclo: Record<string, unknown> = { nome: 'chefe', vida: 3 }
    ciclo.eu = ciclo
    molde.userData.ficha = ciclo
    molde.userData.alvo = outro
    // O three faria JSON.stringify do userData: com o ciclo, lança; com a malha, serializa tudo.
    expect(() => molde.clone()).toThrow()
    const stringify = JSON.stringify
    const serialized: string[] = []
    JSON.stringify = ((...args: Parameters<typeof stringify>) => {
      const out = stringify(...args)
      serialized.push(out)
      return out
    }) as typeof stringify
    let copia: Obj
    try {
      copia = api.spawnCopy?.(grupo, molde, 1, 0, 0) as Obj
    } finally {
      JSON.stringify = stringify
    }
    // O clone do three ainda passa pelo JSON, mas só com o userData vazio.
    expect(serialized.every((text) => text === '{}')).toBe(true)
    expect(copia).toBeTruthy()
    expect(grupo).toContain(copia)
    expect(copia.userData.ficha).toEqual({ nome: 'chefe', vida: 3 })
    expect(copia.userData.alvo).toBeUndefined()
    expect(copia.userData.szCopy).toBe(true)
    // O molde continua com os PRÓPRIOS objetos (nada foi trocado nem copiado por cima).
    expect(molde.userData.ficha).toBe(ciclo)
    expect(molde.userData.alvo).toBe(outro)
    expect((molde.userData.sz as { hw: number }).hw).toBe(0.5)
    expect((copia.userData.sz as { hw: number }).hw).toBe(0.5)
  })
})

describe('Jogo 3D — remover uma luz devolve a vaga', () => {
  it('com o teto de 16 cheio, tirar uma luz deixa acender outra', () => {
    const { api } = bootScript('')
    const cena = api.createFullscreenScene?.('#000')
    const warns: string[] = []
    const original = console.warn
    console.warn = (...args: unknown[]) => warns.push(args.map(String).join(' '))
    try {
      // A cena nasce com 2 luzes (ambiente + sol): cabem mais 14.
      const luzes: unknown[] = []
      for (let i = 0; i < 14; i++) luzes.push(api.addPointLight?.(cena, '#fff', 1, i, 2, 0))
      expect(luzes.every(Boolean)).toBe(true)
      expect(api.addPointLight?.(cena, '#fff', 1, 0, 2, 0)).toBeNull()
      api.remove?.(cena, luzes[0])
      api.remove?.(cena, luzes[1])
      expect(api.addPointLight?.(cena, '#fff', 1, 0, 2, 0)).toBeTruthy()
      expect(api.addAmbientLight?.(cena, '#fff', 0.2)).toBeTruthy()
      expect(api.addPointLight?.(cena, '#fff', 1, 0, 2, 0)).toBeNull()
    } finally {
      console.warn = original
    }
  })
})

describe('Jogo 3D — as batidas do stepBody reaproveitam os registros', () => {
  it('120 quadros batendo no chão e na parede: os registros são sempre os mesmos objetos', () => {
    const { api } = bootScript('')
    const cena = api.createFullscreenScene?.('#000')
    const chao = api.createPlane?.(cena, { width: 40, depth: 40, color: '#3a7' })
    api.setSolid?.(chao)
    const parede = api.createBox?.(cena, { size: 1, color: '#fff' })
    api.setPosition?.(parede, 1.2, 0.5, 0)
    api.setSolid?.(parede)
    const heroi = api.createBox?.(cena, { size: 1, color: '#f00' }) as Obj
    api.setPosition?.(heroi, 0, 0.6, 0)
    const sz = () => heroi.userData.sz as { hits: object[]; vx: number }
    const registros = new Set<object>()
    let maior = 0
    let comBatida = 0
    for (let f = 0; f < 120; f++) {
      sz().vx = 0.05
      api.stepBody?.(heroi, cena)
      for (const hit of sz().hits) registros.add(hit)
      maior = Math.max(maior, sz().hits.length)
      if (sz().hits.length) comBatida++
    }
    expect(comBatida).toBeGreaterThan(60)
    expect(maior).toBeGreaterThanOrEqual(2)
    // Um registro por vaga, não um por batida por quadro.
    expect(registros.size).toBe(maior)
    // E o "para cada batida" continua vendo quem foi batido neste quadro.
    const vistos: unknown[] = []
    api.forEachHit?.(heroi, 'qualquer', (hit: { other: unknown }) => vistos.push(hit.other))
    expect(vistos.length).toBe(sz().hits.length)
    expect(vistos.every((o) => o === chao || o === parede)).toBe(true)
  })
})

describe('Jogo 3D — erro dentro do "para cada objeto do grupo" aparece', () => {
  it('o item que falha não para os outros e o erro vai ao console', () => {
    const { api } = bootScript('')
    const cena = api.createFullscreenScene?.('#000')
    const molde = api.createBox?.(cena, { size: 1, color: '#ff0000' }) as Obj
    const grupo = api.createGroup?.() as Obj[]
    for (let i = 0; i < 3; i++) api.spawnCopy?.(grupo, molde, i, 0, 0)
    const errors: unknown[][] = []
    const original = console.error
    console.error = (...args: unknown[]) => errors.push(args)
    let visitados = 0
    try {
      api.forEachInGroup?.(grupo, () => {
        visitados++
        throw new Error('ops')
      })
    } finally {
      console.error = original
    }
    expect(visitados).toBe(3)
    expect(errors).toHaveLength(1)
    expect(String(errors[0]?.[0])).toContain('para cada objeto do grupo')
    expect(String(errors[0]?.[1])).toContain('ops')
  })
})
