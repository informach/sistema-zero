import { describe, expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import { generateProjectFiles } from '#generators'
import { SZIRV2Schema } from '#ir'
import 'blockly/blocks'
import { buildIRFromWorkspace } from '../../blockly/buildIR'
import { ensureBlocklyInitialized } from '../../blockly/setup'
import { buildWorkspaceStateFromIR } from '../../blockly/workspaceState'
import { dueloDeHeroisNaMaoExample } from '../../examples/core'
import { parseProjectFilesWithDiagnostics } from '../index'

/**
 * ⭐ "na mão" — o fighting-game do Chris Courses (Downloads/Games 2D/
 * fighting-game-main: classes Fighter/Sprite) reescrito 100% com blocos do
 * NÚCLEO, sem extensão. Dois lutadores no MESMO teclado, gravidade + chão,
 * golpe com CAIXA DE GOLPE à frente (o overlap tira 15 de vida), barras de
 * vida DESENHADAS no canvas (o "na mão" no lugar do gsap.to('#health')),
 * cronômetro regressivo e a tela de vencedor. Asset-free (retângulos), dt REAL
 * clampado em 50ms.
 *
 * ⚠️ JOGABILIDADE CORRIGIDA contra o fixture antigo (que "não funcionava
 * direito"):
 *  - O golpe agora tem RECUO e uma JANELA ATIVA (o dano só sai no meio do
 *    golpe, como o `framesCurrent === 4` do original), então dá para desviar em
 *    vez de o dano sair no primeiro quadro de encostar.
 *  - A direção do golpe é TRAVADA quando o golpe começa (`attackFace`) — antes
 *    o `faceRight` mudava todo quadro e a caixa de golpe "teleportava" para trás
 *    do lutador se o outro passasse por ele no meio do golpe.
 *  - Um nocaute (vida no zero) encerra a luta NA HORA com o nome certo.
 *  - O golpe respeita um RECARGA (cooldown) inteiro, então segurar a tecla não
 *    "metralha" o golpe.
 */

const SCRIPT_JS = `const canvas = document.getElementById('canvas1');
const ctx = canvas.getContext('2d');
canvas.width = 640;
canvas.height = 320;
ctx.font = '24px sans-serif';

const gravity = 0.6;
const groundY = 280;

function overlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

class Fighter {
  constructor(x, color, faceRight) {
    this.x = x;
    this.y = 200;
    this.width = 40;
    this.height = 80;
    this.vx = 0;
    this.vy = 0;
    this.color = color;
    this.faceRight = faceRight;
    this.attackFace = faceRight;
    this.health = 100;
    this.attacking = false;
    this.attackTimer = 0;
    this.cooldown = 0;
    this.hitDone = false;
  }
  attackX() {
    if (this.attackFace) {
      return this.x + this.width;
    }
    return this.x - 50;
  }
  active() {
    return this.attacking && this.attackTimer <= 14 && this.attackTimer >= 8;
  }
  update() {
    this.vy = this.vy + gravity;
    this.y = this.y + this.vy;
    if (this.y + this.height >= groundY) {
      this.y = groundY - this.height;
      this.vy = 0;
    }
    this.x = this.x + this.vx;
    if (this.x < 0) {
      this.x = 0;
    }
    if (this.x + this.width > canvas.width) {
      this.x = canvas.width - this.width;
    }
    if (this.cooldown > 0) {
      this.cooldown = this.cooldown - 1;
    }
    if (this.attackTimer > 0) {
      this.attackTimer = this.attackTimer - 1;
      if (this.attackTimer === 0) {
        this.attacking = false;
        this.hitDone = false;
      }
    }
  }
  attack() {
    if (this.cooldown <= 0) {
      this.attacking = true;
      this.attackTimer = 20;
      this.cooldown = 40;
      this.hitDone = false;
      this.attackFace = this.faceRight;
    }
  }
  draw() {
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.width, this.height);
    if (this.active()) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(this.attackX(), this.y + 20, 50, 16);
    }
  }
}

const p1 = new Fighter(120, '#4a9eff', true);
const p2 = new Fighter(480, '#e0526a', false);
const keys = { a: false, d: false, left: false, right: false };
let timer = 60;
let timerFrames = 0;
let over = false;
let winner = '';

function drawHealthBar(x, health, right) {
  ctx.fillStyle = '#333333';
  ctx.fillRect(x, 20, 200, 24);
  ctx.fillStyle = '#5fdd5f';
  const w = (200 * health) / 100;
  if (right) {
    ctx.fillRect(x + 200 - w, 20, w, 24);
  } else {
    ctx.fillRect(x, 20, w, 24);
  }
}

function finish() {
  over = true;
  if (p1.health > p2.health) {
    winner = 'Azul venceu!';
  } else if (p2.health > p1.health) {
    winner = 'Vermelho venceu!';
  } else {
    winner = 'Empate!';
  }
}

function animate() {
  requestAnimationFrame(animate);
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#2b2b3a';
  ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);

  if (!over) {
    p1.vx = 0;
    if (keys.a) p1.vx = -3;
    if (keys.d) p1.vx = 3;
    p2.vx = 0;
    if (keys.left) p2.vx = -3;
    if (keys.right) p2.vx = 3;
    p1.faceRight = p2.x > p1.x;
    p2.faceRight = p1.x > p2.x;
    p1.update();
    p2.update();
    if (
      p1.active() &&
      !p1.hitDone &&
      overlap(p1.attackX(), p1.y + 20, 50, 16, p2.x, p2.y, p2.width, p2.height)
    ) {
      p2.health = p2.health - 15;
      p1.hitDone = true;
      if (p2.health < 0) {
        p2.health = 0;
      }
    }
    if (
      p2.active() &&
      !p2.hitDone &&
      overlap(p2.attackX(), p2.y + 20, 50, 16, p1.x, p1.y, p1.width, p1.height)
    ) {
      p1.health = p1.health - 15;
      p2.hitDone = true;
      if (p1.health < 0) {
        p1.health = 0;
      }
    }
    timerFrames = timerFrames + 1;
    if (timerFrames >= 60) {
      timerFrames = 0;
      if (timer > 0) {
        timer = timer - 1;
      }
    }
    if (p1.health <= 0 || p2.health <= 0 || timer <= 0) {
      finish();
    }
  }

  p1.draw();
  p2.draw();
  drawHealthBar(20, p1.health, false);
  drawHealthBar(420, p2.health, true);
  ctx.fillStyle = '#ffffff';
  ctx.fillText('Tempo: ' + timer, 280, 44);

  if (over) {
    ctx.fillStyle = '#ffd166';
    ctx.fillText(winner, 250, 160);
    ctx.fillText('Aperte Enter para jogar de novo', 130, 200);
  }
}
animate();

function reset() {
  p1.x = 120;
  p1.y = 200;
  p1.vx = 0;
  p1.vy = 0;
  p1.health = 100;
  p1.attacking = false;
  p1.attackTimer = 0;
  p1.cooldown = 0;
  p2.x = 480;
  p2.y = 200;
  p2.vx = 0;
  p2.vy = 0;
  p2.health = 100;
  p2.attacking = false;
  p2.attackTimer = 0;
  p2.cooldown = 0;
  timer = 60;
  timerFrames = 0;
  over = false;
  winner = '';
}

window.addEventListener('keydown', (event) => {
  if (event.key === 'a') keys.a = true;
  if (event.key === 'd') keys.d = true;
  if (event.key === 'w' && p1.y + p1.height >= groundY) p1.vy = -12;
  if (event.key === 'f') p1.attack();
  if (event.key === 'ArrowLeft') keys.left = true;
  if (event.key === 'ArrowRight') keys.right = true;
  if (event.key === 'ArrowUp' && p2.y + p2.height >= groundY) p2.vy = -12;
  if (event.key === 'Enter') p2.attack();
  if (event.key === 'Enter' && over) reset();
});

window.addEventListener('keyup', (event) => {
  if (event.key === 'a') keys.a = false;
  if (event.key === 'd') keys.d = false;
  if (event.key === 'ArrowLeft') keys.left = false;
  if (event.key === 'ArrowRight') keys.right = false;
});
`

const INDEX_HTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Duelo de Heróis</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <canvas id="canvas1"></canvas>

    <script src="script.js"></script>
</body>
</html>`

const STYLE_CSS = `body {
    margin: 0;
    background: #0f0f18;
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

describe('parsers — duelo de heróis "na mão" (fighting-game, núcleo)', () => {
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
    for (const t of [
      'classDecl',
      'funcDecl',
      'if',
      'requestFrame',
      'canvasSetup',
      'canvasFillRect',
      'canvasFillText',
      'event',
      'newInstance',
    ]) {
      expect(types.has(t)).toBe(true)
    }
  })

  it('drift: a IR embutida no exemplo da vitrine é EXATAMENTE a que o parser gera', () => {
    const { ir } = parseProjectFilesWithDiagnostics(GAME_FILES)
    const normalize = (value: unknown) => JSON.parse(JSON.stringify(stripIds(value)))
    expect(normalize(dueloDeHeroisNaMaoExample.ir)).toEqual(normalize(ir))
  })

  it('fixpoint textual: gerar → parsear → gerar é byte-estável', () => {
    const ir1 = parseProjectFilesWithDiagnostics(GAME_FILES).ir
    const files1 = generateProjectFiles({ ir: ir1, projectName: 'Duelo de Heróis' })
    const second = parseProjectFilesWithDiagnostics(files1)
    expect(second.diagnostics).toEqual([])
    expect(collectTypes(second.ir).has('rawJS')).toBe(false)
    const files2 = generateProjectFiles({ ir: second.ir, projectName: 'Duelo de Heróis' })
    expect(files2['script.js']).toBe(files1['script.js'])
    // marcos: o dano, a janela ativa do golpe e o laço sobrevivem à ida e volta
    expect(files1['script.js']).toContain('p2.health = p2.health - 15')
    expect(files1['script.js']).toContain('this.attackFace = this.faceRight;')
    expect(files1['script.js']).toContain('requestAnimationFrame(animate)')
  })

  it('round-trip por BLOCOS: IR → workspace → IR → código byte-igual', () => {
    const ir1 = parseProjectFilesWithDiagnostics(GAME_FILES).ir
    const files1 = generateProjectFiles({ ir: ir1, projectName: 'Duelo de Heróis' })
    const state = buildWorkspaceStateFromIR(ir1)
    expect(JSON.stringify(state)).not.toContain('"sz_adv_raw_js"')
    ensureBlocklyInitialized()
    const ws = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
      const irFromBlocks = { ...buildIRFromWorkspace(ws), htmlShell: ir1.htmlShell }
      const filesFromBlocks = generateProjectFiles({
        ir: irFromBlocks,
        projectName: 'Duelo de Heróis',
      })
      expect(filesFromBlocks['script.js']).toBe(files1['script.js'])
    } finally {
      ws.dispose()
    }
  })
})
