import { describe, expect, it } from 'bun:test'
import { generateProjectFiles } from '#generators'
import { SZIRV2Schema } from '#ir'
import { parseProjectFilesWithDiagnostics } from '#parsers'
import { safariDeMonstrosNaMaoExample } from '../../examples/core'

/**
 * FIXTURE-ÂNCORA do exemplo "Safári de Monstros (na mão)": o overworld de
 * captura (Monster Hunter / Python-Monsters do Clear Code) recriado SÓ com
 * blocos do NÚCLEO Canvas 2D (sem extensão), asset-free. Diferencial da trilogia
 * (contra Treinador/Batalha, que são batalha por turnos): a captura acontece NO
 * MAPA, sem tela de batalha, e o parceiro evolui.
 *
 * Ensina: classes (Sprite base + Monstro/Npc por herança), tilemap por TEXTO
 * (paredes '#', grama '"', monstro 'M', npc 'N') montado num laço data-driven,
 * câmera que segue o herói com LIMITE (Math.max/Math.min) via save + translate,
 * movimento top-down nas 4 direções com colisão AABB (overlap), captura por
 * proximidade + Math.random, e o parceiro que evolui no HUD ao juntar 3.
 *
 * Contrato: 0 rawJS/rawCSS/rawHTML, schema válido, o round-trip do JS é FIXPOINT,
 * e a IR embutida em core.ts não desviou do parser vivo.
 */

const HTML = '<canvas id="jogo" width="640" height="420"></canvas>'
const CSS = [
  'body { margin: 0; overflow: hidden; background: #12281c; display: flex; align-items: center; justify-content: center; min-height: 100vh; }',
  '#jogo { border: 4px solid #1d3a28; background: #3a7d44; }',
].join('\n')

const JS = `const canvas = document.getElementById('jogo');
const ctx = canvas.getContext('2d');
canvas.width = 640;
canvas.height = 420;
ctx.font = '20px sans-serif';

const tile = 48;
const viewWidth = 640;
const viewHeight = 420;
const mapa = [
  '####################',
  '#..................#',
  '#..N.....""M"".....#',
  '#........""""..M...#',
  '#........""""......#',
  '#....##............#',
  '#....##....M.......#',
  '#............""....#',
  '#....M"".....""....#',
  '#....""".......M...#',
  '#....""".......""..#',
  '####################',
];
const worldWidth = mapa[0].length * tile;
const worldHeight = mapa.length * tile;

const TIPOS = [
  { nome: 'Verdinho', cor: '#2f9e44' },
  { nome: 'Azulao', cor: '#2b7de0' },
  { nome: 'Flamil', cor: '#e05a2b' },
  { nome: 'Rochoso', cor: '#7f8c8d' },
  { nome: 'Sombrio', cor: '#5a3a92' },
];

function overlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

class Sprite {
  constructor(x, y, cor) {
    this.x = x;
    this.y = y;
    this.width = 32;
    this.height = 36;
    this.cor = cor;
  }
  draw() {
    ctx.fillStyle = this.cor;
    ctx.fillRect(this.x, this.y, this.width, this.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(this.x + 6, this.y + 8, 6, 6);
    ctx.fillRect(this.x + 20, this.y + 8, 6, 6);
    ctx.fillStyle = '#222222';
    ctx.fillRect(this.x + 8, this.y + 10, 2, 2);
    ctx.fillRect(this.x + 22, this.y + 10, 2, 2);
  }
}

class Npc extends Sprite {
  constructor(x, y, fala) {
    super(x, y, '#c98a3d');
    this.fala = fala;
  }
}

class Monstro extends Sprite {
  constructor(x, y, nome, cor) {
    super(x, y, cor);
    this.width = 36;
    this.height = 36;
    this.nome = nome;
    this.pego = false;
  }
  draw() {
    if (this.pego === true) {
      return;
    }
    ctx.fillStyle = this.cor;
    ctx.beginPath();
    ctx.arc(this.x + 18, this.y + 20, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(this.x + 10, this.y + 14, 6, 6);
    ctx.fillRect(this.x + 22, this.y + 14, 6, 6);
    ctx.fillStyle = '#222222';
    ctx.fillRect(this.x + 12, this.y + 16, 2, 2);
    ctx.fillRect(this.x + 24, this.y + 16, 2, 2);
  }
}

const boundaries = [];
const grama = [];
const monstros = [];
const npcs = [];
let idxMonstro = 0;

for (let r = 0; r < mapa.length; r++) {
  const row = mapa[r];
  for (let col = 0; col < row.length; col++) {
    const simbolo = row[col];
    if (simbolo === '#') {
      boundaries.push({ x: col * tile, y: r * tile, width: tile, height: tile });
    }
    if (simbolo === '"' || simbolo === 'M') {
      grama.push({ x: col * tile, y: r * tile });
    }
    if (simbolo === 'M') {
      const tipo = TIPOS[idxMonstro];
      monstros.push(new Monstro(col * tile + 6, r * tile + 6, tipo.nome, tipo.cor));
      idxMonstro = idxMonstro + 1;
    }
    if (simbolo === 'N') {
      npcs.push(new Npc(col * tile + 8, r * tile + 4, 'Sabio: chegue perto de um monstro e aperte espaco!'));
    }
  }
}

const player = new Sprite(worldWidth / 2, worldHeight / 2, '#ffd166');
const keys = { w: false, a: false, s: false, d: false };
const camera = { x: 0, y: 0 };

let tela = 'inicio';
let capturados = 0;
let evoluido = false;
let mensagem = 'Ache os monstros na grama alta!';

function tentarMover(dx, dy) {
  const nx = player.x + dx;
  const ny = player.y + dy;
  for (let i = 0; i < boundaries.length; i++) {
    const b = boundaries[i];
    if (overlap(nx, ny, player.width, player.height, b.x, b.y, b.width, b.height)) {
      return;
    }
  }
  player.x = nx;
  player.y = ny;
}

function acaoEspaco() {
  for (let i = 0; i < monstros.length; i++) {
    const m = monstros[i];
    if (m.pego === false && overlap(player.x - 8, player.y - 8, player.width + 16, player.height + 16, m.x, m.y, m.width, m.height)) {
      if (Math.random() < 0.75) {
        m.pego = true;
        capturados = capturados + 1;
        mensagem = 'Voce capturou o ' + m.nome + '! Caderno: ' + capturados;
      } else {
        mensagem = 'O ' + m.nome + ' escapou da rede! Tente de novo.';
      }
      return;
    }
  }
  for (let i = 0; i < npcs.length; i++) {
    const npc = npcs[i];
    if (overlap(player.x - 8, player.y - 8, player.width + 16, player.height + 16, npc.x, npc.y, npc.width, npc.height)) {
      mensagem = npc.fala;
      return;
    }
  }
}

function atualizarCamera() {
  camera.x = player.x + player.width / 2 - viewWidth / 2;
  camera.y = player.y + player.height / 2 - viewHeight / 2;
  camera.x = Math.max(0, Math.min(camera.x, worldWidth - viewWidth));
  camera.y = Math.max(0, Math.min(camera.y, worldHeight - viewHeight));
}

function desenharMundo() {
  ctx.save();
  ctx.translate(0 - camera.x, 0 - camera.y);
  for (let r = 0; r < mapa.length; r++) {
    const row = mapa[r];
    for (let col = 0; col < row.length; col++) {
      const simbolo = row[col];
      if (simbolo === '#') {
        ctx.fillStyle = '#5a4e42';
        ctx.fillRect(col * tile, r * tile, tile, tile);
      } else if (simbolo === '"' || simbolo === 'M') {
        ctx.fillStyle = '#2f7d32';
        ctx.fillRect(col * tile, r * tile, tile, tile);
        ctx.fillStyle = '#51cf66';
        ctx.fillRect(col * tile + 6, r * tile + 8, 8, 16);
        ctx.fillRect(col * tile + 24, r * tile + 12, 8, 16);
      } else {
        ctx.fillStyle = '#3a7d44';
        ctx.fillRect(col * tile, r * tile, tile, tile);
      }
    }
  }
  for (let i = 0; i < npcs.length; i++) {
    npcs[i].draw();
  }
  for (let i = 0; i < monstros.length; i++) {
    monstros[i].draw();
  }
  player.draw();
  ctx.restore();
}

function desenharParceiro() {
  if (evoluido === true) {
    ctx.fillStyle = '#2c78a8';
    ctx.beginPath();
    ctx.arc(600, 46, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffe066';
    ctx.fillRect(592, 40, 6, 6);
    ctx.fillRect(604, 40, 6, 6);
  } else {
    ctx.fillStyle = '#4fa3d1';
    ctx.beginPath();
    ctx.arc(602, 48, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(596, 44, 5, 5);
    ctx.fillRect(606, 44, 5, 5);
  }
}

function tecla(key) {
  if (tela === 'inicio') {
    if (key === 'Enter') {
      tela = 'mundo';
    }
  } else if (tela === 'vitoria') {
    if (key === 'Enter') {
      player.x = worldWidth / 2;
      player.y = worldHeight / 2;
      capturados = 0;
      evoluido = false;
      for (let i = 0; i < monstros.length; i++) {
        monstros[i].pego = false;
      }
      tela = 'mundo';
    }
  } else if (tela === 'mundo') {
    if (key === 'w') {
      keys.w = true;
    }
    if (key === 'a') {
      keys.a = true;
    }
    if (key === 's') {
      keys.s = true;
    }
    if (key === 'd') {
      keys.d = true;
    }
    if (key === ' ') {
      acaoEspaco();
    }
  }
}

function soltar(key) {
  if (key === 'w') {
    keys.w = false;
  }
  if (key === 'a') {
    keys.a = false;
  }
  if (key === 's') {
    keys.s = false;
  }
  if (key === 'd') {
    keys.d = false;
  }
}

document.addEventListener('keydown', (event) => {
  tecla(event.key);
});
document.addEventListener('keyup', (event) => {
  soltar(event.key);
});

function animate() {
  requestAnimationFrame(animate);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (tela === 'inicio') {
    ctx.fillStyle = '#eafff2';
    ctx.textAlign = 'center';
    ctx.font = '34px sans-serif';
    ctx.fillText('Safari de Monstros', canvas.width * 0.5, 160);
    ctx.font = '18px sans-serif';
    ctx.fillText('WASD anda, espaco joga a rede na grama alta', canvas.width * 0.5, 220);
    ctx.fillText('Capture 5 e o parceiro evolui. Enter para comecar', canvas.width * 0.5, 250);
    ctx.textAlign = 'left';
  } else if (tela === 'mundo') {
    if (keys.w) {
      tentarMover(0, 0 - 3);
    } else if (keys.s) {
      tentarMover(0, 3);
    } else if (keys.a) {
      tentarMover(0 - 3, 0);
    } else if (keys.d) {
      tentarMover(3, 0);
    }
    if (capturados >= 3) {
      evoluido = true;
    }
    if (capturados >= 5) {
      tela = 'vitoria';
    }
    atualizarCamera();
    desenharMundo();
    desenharParceiro();
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Caderno: ' + capturados + ' / 5', 20, 32);
    ctx.fillStyle = '#10241a';
    ctx.fillRect(20, 380, 600, 30);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(mensagem, 34, 401);
  } else if (tela === 'vitoria') {
    ctx.fillStyle = '#eafff2';
    ctx.textAlign = 'center';
    ctx.font = '34px sans-serif';
    ctx.fillText('Safari completo!', canvas.width * 0.5, 170);
    ctx.font = '18px sans-serif';
    ctx.fillText('Voce capturou 5 monstros e evoluiu o parceiro', canvas.width * 0.5, 220);
    ctx.fillText('Aperte Enter para jogar de novo', canvas.width * 0.5, 250);
    ctx.textAlign = 'left';
  }
}
animate();`

const GAME_FILES = { 'index.html': HTML, 'style.css': CSS, 'script.js': JS }

function collectTypes(value: unknown, out: Set<string> = new Set()): Set<string> {
  if (Array.isArray(value)) for (const item of value) collectTypes(item, out)
  else if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    if (typeof obj.type === 'string') out.add(obj.type)
    for (const v of Object.values(obj)) collectTypes(v, out)
  }
  return out
}

function stripIds(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripIds)
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (k === '__id' || k === '__declIds') continue
      out[k] = stripIds(v)
    }
    return out
  }
  return value
}

describe('Safári de Monstros (Clear Code) — 100% blocos do núcleo', () => {
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
    // As técnicas do overworld top-down: herança de classes, tilemap por texto,
    // câmera com save/translate e AABB.
    for (const t of [
      'classDecl',
      'superCall', // Monstro/Npc estendem Sprite
      'funcDecl',
      'forRange',
      'if',
      'requestFrame',
      'canvasSetup',
      'canvasSave',
      'canvasTranslate',
      'canvasRestore',
      'newInstance',
      'newExpr',
      'arrayPush',
      'randomFloat', // a captura tem chance (Math.random)
      'event',
    ]) {
      expect(types.has(t)).toBe(true)
    }
  })

  it('usa as técnicas do overworld de captura (câmera clamp, captura, evolução)', () => {
    const { ir } = parseProjectFilesWithDiagnostics(GAME_FILES)
    const js = generateProjectFiles({ ir, projectName: 'Safári de Monstros' })['script.js']
    for (const cls of ['class Sprite', 'class Npc extends Sprite', 'class Monstro extends Sprite']) {
      expect(js).toContain(cls)
    }
    expect(js).toContain('super(x, y, cor);') // herança
    // tilemap por texto data-driven + câmera com LIMITE.
    expect(js).toContain('boundaries.push({ x: col * tile, y: r * tile, width: tile, height: tile });')
    expect(js).toContain('camera.x = Math.max(0, Math.min(camera.x, worldWidth - viewWidth));')
    expect(js).toContain('ctx.translate(0 - camera.x, 0 - camera.y);')
    // a captura acontece NO mapa (chance) e conta no caderno.
    expect(js).toContain('Math.random() < 0.75')
    const raw = JSON.stringify(ir)
    expect(raw).toContain('"capturados"')
    expect(raw).toContain('"evoluido"') // o parceiro evolui
    expect(raw).toContain('"camera"')
  })

  it('o exemplo "Safári de Monstros (na mão)" NÃO desviou do parser atual (drift guard)', () => {
    const { ir } = parseProjectFilesWithDiagnostics(GAME_FILES)
    const normalize = (value: unknown) => JSON.parse(JSON.stringify(stripIds(value)))
    expect(normalize(safariDeMonstrosNaMaoExample.ir)).toEqual(normalize(ir))
  })

  it('round-trip textual do JS é um FIXPOINT (gen∘parse estável)', () => {
    const ir1 = parseProjectFilesWithDiagnostics(GAME_FILES).ir
    const files1 = generateProjectFiles({ ir: ir1, projectName: 'Safári de Monstros' })
    const second = parseProjectFilesWithDiagnostics(files1)
    expect(second.diagnostics).toEqual([])
    expect(collectTypes(second.ir).has('rawJS')).toBe(false)
    const files2 = generateProjectFiles({ ir: second.ir, projectName: 'Safári de Monstros' })
    expect(files2['script.js']).toBe(files1['script.js'])
  })
})
