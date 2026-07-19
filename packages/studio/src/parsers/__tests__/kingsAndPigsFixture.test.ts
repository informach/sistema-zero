import { describe, expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import { generateProjectFiles } from '#generators'
import { SZIRV2Schema } from '#ir'
import 'blockly/blocks'
import { buildIRFromWorkspace } from '../../blockly/buildIR'
import { ensureBlocklyInitialized } from '../../blockly/setup'
import { buildWorkspaceStateFromIR } from '../../blockly/workspaceState'
import { portasDoCasteloNaMaoExample } from '../../examples/core'
import { parseProjectFilesWithDiagnostics } from '../index'

/**
 * ⭐ "na mão" — o platformer kings-and-pigs do Chris Courses (Downloads/Platformer/
 * kings-and-pigs) reescrito 100% com blocos do NÚCLEO, sem extensão. Além da
 * física (gravidade + colisão AABB), o que ele ENSINA de novo é a passagem de
 * FASE: chegar na porta dispara um fade preto na mão (o overlay que sobe e desce
 * de opacidade quadro a quadro) — o "na mão" no lugar do gsap.to(overlay) do
 * original — carrega a próxima fase e volta o fade. Asset-free (retângulos),
 * construtores com parâmetros simples, canvas dedicado por ctx.
 */

const SCRIPT_JS = `const canvas = document.getElementById('canvas1');
const ctx = canvas.getContext('2d');
canvas.width = 640;
canvas.height = 360;

const gravity = 0.5;

class Block {
  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }
  draw() {
    ctx.fillStyle = '#4b3f2f';
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }
}

function overlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 20;
    this.height = 30;
    this.vx = 0;
    this.vy = 0;
    this.onGround = false;
  }
  draw() {
    ctx.fillStyle = '#e8c07d';
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }
  moveX(blocks) {
    this.x = this.x + this.vx;
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      if (overlap(this.x, this.y, this.width, this.height, b.x, b.y, b.width, b.height)) {
        if (this.vx > 0) {
          this.x = b.x - this.width - 0.01;
          this.vx = 0;
        } else if (this.vx < 0) {
          this.x = b.x + b.width + 0.01;
          this.vx = 0;
        }
      }
    }
  }
  moveY(blocks) {
    this.vy = this.vy + gravity;
    this.y = this.y + this.vy;
    this.onGround = false;
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      if (overlap(this.x, this.y, this.width, this.height, b.x, b.y, b.width, b.height)) {
        if (this.vy > 0) {
          this.y = b.y - this.height - 0.01;
          this.vy = 0;
          this.onGround = true;
        } else if (this.vy < 0) {
          this.y = b.y + b.height + 0.01;
          this.vy = 0;
        }
      }
    }
  }
}

const player = new Player(40, 240);
let blocks = [];
let doorX = 0;
let doorY = 0;

function loadLevel(n) {
  blocks = [];
  blocks.push(new Block(0, 320, 640, 40));
  if (n === 1) {
    blocks.push(new Block(200, 250, 90, 20));
    blocks.push(new Block(400, 190, 90, 20));
    doorX = 560;
    doorY = 280;
    player.x = 40;
    player.y = 240;
  } else {
    blocks.push(new Block(120, 240, 90, 20));
    blocks.push(new Block(340, 180, 90, 20));
    doorX = 40;
    doorY = 280;
    player.x = 560;
    player.y = 240;
  }
  player.vx = 0;
  player.vy = 0;
}

const keys = { a: false, d: false };
let level = 1;
let nextLevel = 1;
let fade = 0;
let fadeDir = 0;

function animate() {
  requestAnimationFrame(animate);
  ctx.fillStyle = '#2b2b3a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (fadeDir === 1) {
    fade = fade + 0.04;
    if (fade >= 1) {
      fade = 1;
      loadLevel(nextLevel);
      fadeDir = -1;
    }
  } else if (fadeDir === -1) {
    fade = fade - 0.04;
    if (fade <= 0) {
      fade = 0;
      fadeDir = 0;
    }
  }

  if (fadeDir === 0) {
    player.vx = 0;
    if (keys.d) player.vx = 3;
    if (keys.a) player.vx = -3;
    player.moveX(blocks);
    player.moveY(blocks);
    if (overlap(player.x, player.y, player.width, player.height, doorX, doorY, 26, 40)) {
      nextLevel = level + 1;
      if (nextLevel > 2) nextLevel = 1;
      level = nextLevel;
      fadeDir = 1;
    }
  }

  for (let i = 0; i < blocks.length; i++) {
    blocks[i].draw();
  }
  ctx.fillStyle = '#8b5a2b';
  ctx.fillRect(doorX, doorY, 26, 40);
  player.draw();

  ctx.globalAlpha = fade;
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.globalAlpha = 1;
}

loadLevel(1);
animate();

window.addEventListener('keydown', (event) => {
  if (event.key === 'a') keys.a = true;
  if (event.key === 'd') keys.d = true;
  if (event.key === 'w' && player.onGround) {
    player.vy = -10;
    player.onGround = false;
  }
});

window.addEventListener('keyup', (event) => {
  if (event.key === 'a') keys.a = false;
  if (event.key === 'd') keys.d = false;
});
`

const INDEX_HTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Portas do Castelo</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <canvas id="canvas1"></canvas>

    <script src="script.js"></script>
</body>
</html>`

const STYLE_CSS = `body {
    margin: 0;
    background: #14141f;
}

canvas {
    display: block;
}`

const GAME_FILES = {
  'index.html': INDEX_HTML,
  'style.css': STYLE_CSS,
  'script.js': SCRIPT_JS,
}

function collectTypes(value: unknown, out: Set<string> = new Set()): Set<string> {
  if (Array.isArray(value)) for (const item of value) collectTypes(item, out)
  else if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    if (typeof obj.type === 'string') out.add(obj.type)
    for (const v of Object.values(obj)) collectTypes(v, out)
  }
  return out
}

function stripIds<T>(value: T): T {
  if (Array.isArray(value)) return value.map(stripIds) as unknown as T
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (k === '__id' || k === '__declIds') continue
      out[k] = stripIds(v)
    }
    return out as T
  }
  return value
}

describe('parsers — portas do castelo "na mão" (núcleo, sem extensão)', () => {
  it('parseia os 3 arquivos SEM raw e sem diagnóstico', () => {
    const { ir, diagnostics } = parseProjectFilesWithDiagnostics(GAME_FILES)
    expect(diagnostics).toEqual([])
    const types = collectTypes(ir)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('rawCSS')).toBe(false)
    expect(types.has('rawHTML')).toBe(false)
    expect(ir.extensions).toEqual([])
    expect(
      [...types].some((t) => t.startsWith('g2d:') || t.startsWith('g3d:') || t.startsWith('gk:')),
    ).toBe(false)
    expect(SZIRV2Schema.safeParse(ir).success).toBe(true)
    // a mecânica de ensino: física + a passagem de fase com fade na mão (globalAlpha)
    for (const t of [
      'classDecl',
      'funcDecl',
      'forRange',
      'if',
      'requestFrame',
      'canvasSetup',
      'canvasFillRect',
      'canvasGlobalAlpha',
      'newInstance',
    ]) {
      expect(types.has(t)).toBe(true)
    }
  })

  it('drift: a IR embutida no exemplo da vitrine é EXATAMENTE a que o parser gera', () => {
    const { ir } = parseProjectFilesWithDiagnostics(GAME_FILES)
    const normalize = (value: unknown) => JSON.parse(JSON.stringify(stripIds(value)))
    expect(normalize(portasDoCasteloNaMaoExample.ir)).toEqual(normalize(ir))
  })

  it('fixpoint textual: gerar → parsear → gerar é byte-estável', () => {
    const ir1 = parseProjectFilesWithDiagnostics(GAME_FILES).ir
    const files1 = generateProjectFiles({ ir: ir1, projectName: 'Portas do Castelo' })
    const second = parseProjectFilesWithDiagnostics(files1)
    expect(second.diagnostics).toEqual([])
    expect(collectTypes(second.ir).has('rawJS')).toBe(false)
    const files2 = generateProjectFiles({ ir: second.ir, projectName: 'Portas do Castelo' })
    expect(files2['script.js']).toBe(files1['script.js'])
    // marcos: a máquina de fade e a troca de fase sobrevivem à ida e volta
    expect(files1['script.js']).toContain('ctx.globalAlpha = fade')
    expect(files1['script.js']).toContain('loadLevel(nextLevel)')
    expect(files1['script.js']).toContain('requestAnimationFrame(animate)')
  })

  it('round-trip por BLOCOS: IR → workspace → IR → código byte-igual', () => {
    const ir1 = parseProjectFilesWithDiagnostics(GAME_FILES).ir
    const files1 = generateProjectFiles({ ir: ir1, projectName: 'Portas do Castelo' })
    const state = buildWorkspaceStateFromIR(ir1)
    expect(JSON.stringify(state)).not.toContain('"sz_adv_raw_js"')
    ensureBlocklyInitialized()
    const ws = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
      const irFromBlocks = { ...buildIRFromWorkspace(ws), htmlShell: ir1.htmlShell }
      const filesFromBlocks = generateProjectFiles({
        ir: irFromBlocks,
        projectName: 'Portas do Castelo',
      })
      expect(filesFromBlocks['script.js']).toBe(files1['script.js'])
    } finally {
      ws.dispose()
    }
  })
})
