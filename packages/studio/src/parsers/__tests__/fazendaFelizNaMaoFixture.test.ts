import { describe, expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import { generateProjectFiles } from '#generators'
import { SZIRV2Schema } from '#ir'
import 'blockly/blocks'
import { buildIRFromWorkspace } from '../../blockly/buildIR'
import { ensureBlocklyInitialized } from '../../blockly/setup'
import { buildWorkspaceStateFromIR } from '../../blockly/workspaceState'
import { fazendaFelizNaMaoExample } from '../../examples/core'
import { parseProjectFilesWithDiagnostics } from '../index'

/**
 * FIXTURE REAL: a fazendinha (Stardew do Clear Code) recriada FIEL "na mão" —
 * 100% blocos do NÚCLEO, SEM extensão. Ensina o mesmo que o curso: uma GRADE de
 * canteiros numa lista (cada canteiro é um número de estágio + um flag "molhado"),
 * a câmera que SEGUE o fazendeiro com limite (Math.max/Math.min) via save + scale
 * + translate, FERRAMENTAS que se trocam, o CICLO DO DIA (só cresce quem foi
 * regado e o dia passa quando você dorme) e a colheita vendida por moedas. A
 * fidelidade é da MECÂNICA, não do pixel: fazendeiro e canteiros são retângulos
 * (asset-free) e os construtores usam parâmetros simples. O laço usa passo fixo.
 * A prova é a dos outros fixtures: 0 raw + fixpoint + round-trip por blocos + a
 * IR embutida na vitrine bate com a que o parser gera.
 */

const SCRIPT_JS = `const canvas = document.getElementById('canvas1');
const ctx = canvas.getContext('2d');
canvas.width = 640;
canvas.height = 480;
ctx.font = '20px sans-serif';

const scale = 2;
const viewWidth = 320;
const viewHeight = 240;
const cols = 5;
const linhas = 4;
const tam = 90;
const inicioX = 50;
const inicioY = 50;
const worldWidth = 550;
const worldHeight = 460;

const plotX = [];
const plotY = [];
const plotStage = [];
const plotWet = [];
for (let i = 0; i < 20; i++) {
  plotX.push(inicioX + (i % cols) * tam);
  plotY.push(inicioY + Math.floor(i / cols) * tam);
  plotStage.push(0);
  plotWet.push(0);
}

class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 22;
    this.height = 24;
    this.vx = 0;
    this.vy = 0;
  }
  move() {
    this.x = this.x + this.vx;
    this.y = this.y + this.vy;
    if (this.x < 0) {
      this.x = 0;
    }
    if (this.y < 0) {
      this.y = 0;
    }
    if (this.x > worldWidth - this.width) {
      this.x = worldWidth - this.width;
    }
    if (this.y > worldHeight - this.height) {
      this.y = worldHeight - this.height;
    }
  }
  draw() {
    ctx.fillStyle = '#8a5a2b';
    ctx.fillRect(this.x, this.y - 4, this.width, 5);
    ctx.fillStyle = '#f7c8a2';
    ctx.fillRect(this.x + 5, this.y + 2, 12, 10);
    ctx.fillStyle = '#d98c40';
    ctx.fillRect(this.x + 3, this.y + 12, 16, 12);
  }
}

const player = new Player(264, 218);
const ferramentas = ['enxada', 'semente', 'regador'];
const keys = { a: false, d: false, w: false, s: false };
const camera = { x: 0, y: 0 };
let ferramenta = 0;
let moedas = 0;
let colheita = 0;
let dia = 1;
let state = 'inicio';

function updateCamera() {
  camera.x = player.x + player.width / 2 - viewWidth / 2;
  camera.y = player.y + player.height / 2 - viewHeight / 2;
  camera.x = Math.max(0, Math.min(camera.x, worldWidth - viewWidth));
  camera.y = Math.max(0, Math.min(camera.y, worldHeight - viewHeight));
}

function usarFerramenta() {
  const cx = player.x + player.width / 2;
  const cy = player.y + player.height / 2;
  for (let i = 0; i < 20; i++) {
    if (cx >= plotX[i] && cx < plotX[i] + tam && cy >= plotY[i] && cy < plotY[i] + tam) {
      if (ferramenta === 0 && plotStage[i] === 0) {
        plotStage[i] = 1;
      }
      if (ferramenta === 1 && plotStage[i] === 1) {
        plotStage[i] = 2;
      }
      if (ferramenta === 2 && plotStage[i] === 2) {
        plotWet[i] = 1;
      }
    }
  }
}

function dormir() {
  dia = dia + 1;
  for (let i = 0; i < 20; i++) {
    if (plotStage[i] === 2 && plotWet[i] === 1) {
      plotStage[i] = 3;
      plotWet[i] = 0;
    }
  }
}

function vender() {
  moedas = moedas + colheita * 3;
  colheita = 0;
}

function restart() {
  player.x = 264;
  player.y = 218;
  for (let i = 0; i < 20; i++) {
    plotStage[i] = 0;
    plotWet[i] = 0;
  }
  moedas = 0;
  colheita = 0;
  dia = 1;
  ferramenta = 0;
  state = 'jogando';
}

function animate(timeStamp) {
  requestAnimationFrame(animate);

  ctx.fillStyle = '#22331a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (state === 'jogando') {
    player.vx = 0;
    player.vy = 0;
    if (keys.d) {
      player.vx = 2.5;
    }
    if (keys.a) {
      player.vx = 0 - 2.5;
    }
    if (keys.w) {
      player.vy = 0 - 2.5;
    }
    if (keys.s) {
      player.vy = 2.5;
    }
    player.move();

    const cx = player.x + player.width / 2;
    const cy = player.y + player.height / 2;
    for (let i = 0; i < 20; i++) {
      if (plotStage[i] === 3 && cx >= plotX[i] && cx < plotX[i] + tam && cy >= plotY[i] && cy < plotY[i] + tam) {
        plotStage[i] = 0;
        colheita = colheita + 1;
      }
    }
    if (moedas >= 40) {
      state = 'venceu';
    }
  }
  updateCamera();

  ctx.save();
  ctx.scale(scale, scale);
  ctx.translate(0 - camera.x, 0 - camera.y);
  ctx.fillStyle = '#3a5a2a';
  ctx.fillRect(0, 0, worldWidth, worldHeight);
  for (let i = 0; i < 20; i++) {
    ctx.fillStyle = '#6b4a2b';
    ctx.fillRect(plotX[i], plotY[i], tam - 8, tam - 8);
    if (plotWet[i] === 1) {
      ctx.fillStyle = '#4a3320';
    } else {
      ctx.fillStyle = '#7a5636';
    }
    ctx.fillRect(plotX[i] + 6, plotY[i] + 6, tam - 20, tam - 20);
    if (plotStage[i] === 2) {
      ctx.fillStyle = '#4fae3a';
      ctx.fillRect(plotX[i] + 30, plotY[i] + 34, 18, 18);
    }
    if (plotStage[i] === 3) {
      ctx.fillStyle = '#ffd24a';
      ctx.fillRect(plotX[i] + 24, plotY[i] + 24, 28, 28);
    }
  }
  player.draw();
  ctx.restore();

  ctx.fillStyle = '#fff8e1';
  ctx.fillText('Ferramenta: ' + ferramentas[ferramenta], 20, 30);
  ctx.fillText('Moedas: ' + moedas, 20, 56);
  ctx.fillText('Colheita: ' + colheita, 20, 82);
  ctx.fillText('Dia: ' + dia, 520, 30);

  if (state === 'inicio') {
    ctx.fillStyle = '#000000';
    ctx.globalAlpha = 0.55;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText('Fazenda Feliz', canvas.width / 2, canvas.height / 2 - 14);
    ctx.fillText('Aperte Enter para comecar', canvas.width / 2, canvas.height / 2 + 16);
    ctx.textAlign = 'left';
  }
  if (state === 'venceu') {
    ctx.fillStyle = '#000000';
    ctx.globalAlpha = 0.55;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ffe066';
    ctx.textAlign = 'center';
    ctx.fillText('Que colheita!', canvas.width / 2, canvas.height / 2 - 14);
    ctx.fillText('Aperte Enter para plantar de novo', canvas.width / 2, canvas.height / 2 + 16);
    ctx.textAlign = 'left';
  }
}
animate(0);

window.addEventListener('keydown', (event) => {
  if (event.key === 'a' || event.key === 'ArrowLeft') {
    keys.a = true;
  }
  if (event.key === 'd' || event.key === 'ArrowRight') {
    keys.d = true;
  }
  if (event.key === 'w' || event.key === 'ArrowUp') {
    keys.w = true;
  }
  if (event.key === 's' || event.key === 'ArrowDown') {
    keys.s = true;
  }
  if (event.key === 'q' && state === 'jogando') {
    ferramenta = (ferramenta + 1) % 3;
  }
  if (event.key === ' ' && state === 'jogando') {
    usarFerramenta();
  }
  if (event.key === 'c' && state === 'jogando') {
    dormir();
  }
  if (event.key === 'v' && state === 'jogando') {
    vender();
  }
  if (event.key === 'Enter' && state !== 'jogando') {
    restart();
  }
});

window.addEventListener('keyup', (event) => {
  if (event.key === 'a' || event.key === 'ArrowLeft') {
    keys.a = false;
  }
  if (event.key === 'd' || event.key === 'ArrowRight') {
    keys.d = false;
  }
  if (event.key === 'w' || event.key === 'ArrowUp') {
    keys.w = false;
  }
  if (event.key === 's' || event.key === 'ArrowDown') {
    keys.s = false;
  }
});
`

const INDEX_HTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Fazenda Feliz</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <canvas id="canvas1"></canvas>

    <script src="script.js"></script>
</body>
</html>`

const STYLE_CSS = `body {
    margin: 0;
    background: #14210e;
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

describe('parsers — fazenda feliz "na mão" (farming top-down, núcleo)', () => {
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
      'forRange',
      'if',
      'requestFrame',
      'canvasSetup',
      'canvasFillRect',
      'canvasSave',
      'canvasScale',
      'canvasTranslate',
      'canvasRestore',
      'newInstance',
      'setThisProp',
      'arrayPush',
      'index',
      'indexSet',
      'mathUnary',
      'event',
    ]) {
      expect(types.has(t)).toBe(true)
    }
  })

  it('drift: a IR embutida no exemplo da vitrine é EXATAMENTE a que o parser gera', () => {
    const { ir } = parseProjectFilesWithDiagnostics(GAME_FILES)
    const normalize = (value: unknown) => JSON.parse(JSON.stringify(stripIds(value)))
    expect(normalize(fazendaFelizNaMaoExample.ir)).toEqual(normalize(ir))
  })

  it('fixpoint textual: gerar → parsear → gerar é byte-estável', () => {
    const ir1 = parseProjectFilesWithDiagnostics(GAME_FILES).ir
    const files1 = generateProjectFiles({ ir: ir1, projectName: 'Fazenda Feliz' })
    const second = parseProjectFilesWithDiagnostics(files1)
    expect(second.diagnostics).toEqual([])
    expect(collectTypes(second.ir).has('rawJS')).toBe(false)
    const files2 = generateProjectFiles({ ir: second.ir, projectName: 'Fazenda Feliz' })
    expect(files2['script.js']).toBe(files1['script.js'])
    expect(files1['script.js']).toContain('Math.max(0, Math.min(camera.x, worldWidth - viewWidth))')
    expect(files1['script.js']).toContain('ctx.scale(scale, scale)')
    expect(files1['script.js']).toContain('ferramenta = (ferramenta + 1) % 3;')
  })

  it('round-trip por BLOCOS: IR → workspace → IR → código byte-igual', () => {
    const ir1 = parseProjectFilesWithDiagnostics(GAME_FILES).ir
    const files1 = generateProjectFiles({ ir: ir1, projectName: 'Fazenda Feliz' })
    const state = buildWorkspaceStateFromIR(ir1)
    expect(JSON.stringify(state)).not.toContain('"sz_adv_raw_js"')
    ensureBlocklyInitialized()
    const ws = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
      const irFromBlocks = { ...buildIRFromWorkspace(ws), htmlShell: ir1.htmlShell }
      const filesFromBlocks = generateProjectFiles({
        ir: irFromBlocks,
        projectName: 'Fazenda Feliz',
      })
      expect(filesFromBlocks['script.js']).toBe(files1['script.js'])
    } finally {
      ws.dispose()
    }
  })
})
