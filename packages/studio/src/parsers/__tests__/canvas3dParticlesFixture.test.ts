import { describe, expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import 'blockly/blocks'
import { buildIRFromWorkspace } from '../../blockly/buildIR'
import { ensureBlocklyInitialized } from '../../blockly/setup'
import { buildWorkspaceStateFromIR } from '../../blockly/workspaceState'
import { generateJS } from '../../generators/js'
import { behaviorStatements } from '../../ir/behavior'
import type { JSStatement, SZIR } from '../../ir/schema'
import { parseJS } from '../js'

/**
 * Rodada 2 do Canvas 3D — 2º macro de efeito: PARTÍCULAS ✨. UM bloco cria uma
 * nuvem de pontos (BufferGeometry com posições aleatórias + PointsMaterial +
 * Points) na grafia ATUAL (0.180). Forward-only, como o Brilho.
 *
 * Provas:
 *   (1) o código gerado é 100% buildável (0 rawJS) — todo idioma do sistema de
 *       partículas (laço, push, BufferGeometry, Float32BufferAttribute, Points)
 *       round-trippa no núcleo;
 *   (2) o MACRO (`particlesSetup`) expande a receita certa e sobrevive
 *       block→IR→block (byte-idêntico via o nó dedicado).
 *
 * ⚠️ NÃO exige fixpoint TEXTUAL: `geometria.setAttribute(...)` num var é roteado
 * pelo parser ao nó DOM `setAttribute`, que reemite `?.setAttribute` (optional
 * chaining defensivo) — um comportamento PRÉ-EXISTENTE do parser, não do macro. O
 * `?.` é inócuo (a geometria nunca é nula) e só apareceria se a criança editasse o
 * código na Ponte; o bloco em si (fonte da verdade no blocksState) regenera limpo.
 */

function collectTypes(value: unknown, out: Set<string> = new Set()): Set<string> {
  if (Array.isArray(value)) for (const item of value) collectTypes(item, out)
  else if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    if (typeof obj.type === 'string') out.add(obj.type)
    for (const v of Object.values(obj)) collectTypes(v, out)
  }
  return out
}

/** IR → blocos → IR → código. */
function fromIR(js: JSStatement[]): { code: string; state: string } {
  ensureBlocklyInitialized()
  const irObj: SZIR = { html: [], css: [], js, extensions: [] }
  const state = buildWorkspaceStateFromIR(irObj)
  const ws = new Blockly.Workspace()
  try {
    Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
    return {
      code: generateJS({ statements: behaviorStatements(buildIRFromWorkspace(ws)) }),
      state: JSON.stringify(state),
    }
  } finally {
    ws.dispose()
  }
}

const particles: JSStatement = {
  type: 'particlesSetup',
  particles: 'estrelas',
  scene: 'scene',
  count: { type: 'num', value: 500 },
  size: { type: 'num', value: 0.1 },
  spread: { type: 'num', value: 20 },
  color: { type: 'color', value: '#ffffff' },
}

describe('Canvas 3D — macro Partículas ✨ (bloco sz_t3d_particles)', () => {
  it('expande a receita do sistema de pontos na grafia ATUAL do three.js', () => {
    const code = generateJS({
      statements: [{ type: 'importStar', name: 'THREE', module: 'three' }, particles],
    })
    expect(code).toContain(
      'const estrelasQuantidade = Math.max(0, Math.min(20000, Math.round(Number(500) || 0)));',
    )
    expect(code).toContain('const estrelasPosicoes = [];')
    expect(code).toContain(
      'for (let estrelasIndice = 0; estrelasIndice < estrelasQuantidade; estrelasIndice++) {',
    )
    expect(code).toContain('estrelasPosicoes.push((Math.random() - 0.5) * estrelasArea);')
    expect(code).toContain('const estrelasGeometria = new THREE.BufferGeometry();')
    expect(code).toContain(
      'estrelasGeometria.setAttribute("position", new THREE.Float32BufferAttribute(estrelasPosicoes, 3));',
    )
    expect(code).toContain(
      'const estrelas = new THREE.Points(estrelasGeometria, new THREE.PointsMaterial({ color: "#ffffff", size: estrelasTamanho, sizeAttenuation: true }));',
    )
    expect(code).toContain('scene.add(estrelas);')
  })

  it('o código gerado é 100% buildável (0 rawJS no reverse)', () => {
    const code = generateJS({
      statements: [{ type: 'importStar', name: 'THREE', module: 'three' }, particles],
    })
    expect(collectTypes(parseJS(code)).has('rawJS')).toBe(false)
  })

  it('block→IR→block preserva o macro (sz_t3d_particles) e regenera igual', () => {
    const direct = generateJS({
      statements: [{ type: 'importStar', name: 'THREE', module: 'three' }, particles],
    })
    const { code, state } = fromIR([
      { type: 'importStar', name: 'THREE', module: 'three' },
      particles,
    ])
    expect(state).toContain('"sz_t3d_particles"')
    expect(code).toBe(direct)
  })
})
