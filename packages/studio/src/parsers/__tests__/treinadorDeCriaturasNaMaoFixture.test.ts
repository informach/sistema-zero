import { describe, expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import { generateProjectFiles } from '#generators'
import { SZIRV2Schema } from '#ir'
import 'blockly/blocks'
import { buildIRFromWorkspace } from '../../blockly/buildIR'
import { ensureBlocklyInitialized } from '../../blockly/setup'
import { buildWorkspaceStateFromIR } from '../../blockly/workspaceState'
import { treinadorDeCriaturasNaMaoExample } from '../../examples/core'
import { parseProjectFilesWithDiagnostics } from '../index'

/**
 * FIXTURE REAL: o pokemon-style-game (Chris Courses, ~3928 linhas com gsap,
 * DOM e spritesheets) recriado FIEL e COMPLETO "na mão" — 100% blocos do
 * NÚCLEO, SEM extensão, asset-free (formas e cores, nenhum PNG). É o MAIOR
 * exemplo do projeto: as DUAS cenas do original com uma variável de ESTADO
 * compartilhada (battle.initiated) decidindo qual cena anima.
 *
 * CENA 1 — Exploração (top-down): um mapa MAIOR que a tela montado por texto
 * (paredes '#', grama '"', casa 'C', o NPC 'N'), a câmera que SEGUE o herói
 * com limite (Math.max/Math.min) via save + translate, movimento nas 4
 * direções com colisão contra Boundaries, um NPC com caixa de diálogo e as
 * ZONAS DE BATALHA (a grama): ao andar por cima há chance (Math.random) de a
 * batalha começar, com um FLASH de transição.
 *
 * CENA 2 — Batalha por turnos (a lição-estrela): a FILA DE AÇÕES (queue) — o
 * jogador escolhe o golpe, o dano é aplicado com uma pequena animação de
 * impacto, a barra de vida atualiza, o inimigo REVIDA (empurrado na fila com
 * atraso), checa-se o desmaio e volta-se ao mapa. Golpes com dano, tipos e
 * cores; telas de vitória e derrota.
 *
 * As classes usam herança (Monster/Character estendem Sprite, como no
 * original) e parâmetros simples (o parser recusa `constructor({...})`
 * desestruturado). A fila é um array com push/shift; a máquina de cena é uma
 * variável de estado + ifs; a câmera é save/translate; o laço é
 * requestAnimationFrame nomeado. A prova é a mesma dos outros fixtures na mão:
 * 0 raw + fixpoint textual + round-trip por blocos + a IR embutida na vitrine
 * bate com a que o parser gera.
 */

const SCRIPT_JS = `const canvas = document.getElementById('canvas1');
const ctx = canvas.getContext('2d');
canvas.width = 640;
canvas.height = 400;
ctx.font = '20px sans-serif';

const tile = 48;
const viewWidth = 640;
const viewHeight = 400;
const mapa = [
  '####################',
  '#..................#',
  '#..CC....""""......#',
  '#..CC....""""...N..#',
  '#........""""......#',
  '#.....##.........."#',
  '#.....##..........."',
  '#............##....#',
  '#....""".....##....#',
  '#....""".......""..#',
  '#....""".......""..#',
  '#.................."',
  '####################',
];
const worldWidth = mapa[0].length * tile;
const worldHeight = mapa.length * tile;

const CORES = {
  fogo: '#e0533d',
  agua: '#3d7be0',
  planta: '#4caf50',
  normal: '#9aa0b5'
};
const GOLPES = {
  Investida: { tipo: 'normal', dano: 12, cor: '#dcdcdc' },
  Brasa: { tipo: 'fogo', dano: 25, cor: '#ff5a3c' }
};

function overlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

class Sprite {
  constructor(x, y, cor) {
    this.x = x;
    this.y = y;
    this.width = 32;
    this.height = 40;
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

class Character extends Sprite {
  constructor(x, y, cor, fala) {
    super(x, y, cor);
    this.fala = fala;
  }
}

class Monster extends Sprite {
  constructor(nome, elemento, x, y, golpes) {
    super(x, y, CORES[elemento]);
    this.nome = nome;
    this.elemento = elemento;
    this.vida = 100;
    this.golpes = golpes;
    this.tremor = 0;
    this.width = 90;
    this.height = 70;
  }
  aplicar(dano) {
    this.vida = this.vida - dano;
    if (this.vida < 0) {
      this.vida = 0;
    }
    this.tremor = 8;
  }
  desenhar(px, py) {
    let dx = px;
    if (this.tremor > 0) {
      dx = px + this.tremor;
      this.tremor = 0 - this.tremor;
      this.tremor = this.tremor + 1;
    }
    ctx.fillStyle = CORES[this.elemento];
    ctx.fillRect(dx, py + 30, 90, 44);
    ctx.beginPath();
    ctx.arc(dx + 45, py + 26, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(dx + 33, py + 22, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(dx + 57, py + 22, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#222222';
    ctx.beginPath();
    ctx.arc(dx + 35, py + 23, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(dx + 59, py + 23, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  barra(bx, by, direita) {
    ctx.fillStyle = '#28304a';
    ctx.fillRect(bx, by, 220, 60);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(this.nome, bx + 12, by + 26);
    ctx.fillStyle = '#4a5578';
    ctx.fillRect(bx + 12, by + 36, 196, 12);
    ctx.fillStyle = '#5fce5f';
    ctx.fillRect(bx + 12, by + 36, 196 * (this.vida / 100), 12);
  }
}

const boundaries = [];
const battleZones = [];
const characters = [];

for (let r = 0; r < mapa.length; r++) {
  const row = mapa[r];
  for (let col = 0; col < row.length; col++) {
    const simbolo = row[col];
    if (simbolo === '#' || simbolo === 'C') {
      boundaries.push({ x: col * tile, y: r * tile, width: tile, height: tile });
    }
    if (simbolo === '"') {
      battleZones.push({ x: col * tile, y: r * tile, width: tile, height: tile });
    }
    if (simbolo === 'N') {
      characters.push(new Character(col * tile + 8, r * tile + 4, '#c98a3d', 'Olá! Cuidado com a grama alta.'));
    }
  }
}

const player = new Sprite(worldWidth / 2, worldHeight / 2, '#e8d24a');
const keys = { w: false, a: false, s: false, d: false };
const camera = { x: 0, y: 0 };

const battle = { initiated: false };
let tela = 'inicio';
let flash = 0;
let dialogo = '';
let mensagem = '';
let fase = 'menu';
let menuCursor = 0;
let queue = [];
let esperando = 0;

const meu = new Monster('Fogorim', 'fogo', 130, 250, ['Investida', 'Brasa']);
const inimigo = new Monster('Draguito', 'agua', 400, 70, ['Investida', 'Brasa']);

function iniciarBatalha() {
  battle.initiated = true;
  meu.vida = 100;
  inimigo.vida = 100;
  fase = 'menu';
  menuCursor = 0;
  queue = [];
  esperando = 0;
  mensagem = 'O que ' + meu.nome + ' vai fazer?';
  tela = 'batalha';
}

function usarGolpe(atacante, alvo, nome) {
  const golpe = GOLPES[nome];
  let dano = golpe.dano;
  if (golpe.tipo === alvo.elemento) {
    dano = Math.floor(dano * 0.5);
  }
  alvo.aplicar(dano);
  mensagem = atacante.nome + ' usou ' + nome + '!';
}

function jogadorAtaca() {
  const nome = meu.golpes[menuCursor];
  usarGolpe(meu, inimigo, nome);
  fase = 'espera';
  esperando = 45;
  queue.push('checarInimigo');
  queue.push('inimigoAtaca');
  queue.push('checarJogador');
  queue.push('voltarMenu');
}

function passo() {
  if (queue.length === 0) {
    return;
  }
  const acao = queue[0];
  queue.shift();
  if (acao === 'checarInimigo') {
    if (inimigo.vida === 0) {
      tela = 'vitoria';
      queue = [];
    }
  } else if (acao === 'inimigoAtaca') {
    const sorteio = Math.floor(Math.random() * inimigo.golpes.length);
    usarGolpe(inimigo, meu, inimigo.golpes[sorteio]);
  } else if (acao === 'checarJogador') {
    if (meu.vida === 0) {
      tela = 'derrota';
      queue = [];
    }
  } else if (acao === 'voltarMenu') {
    fase = 'menu';
    menuCursor = 0;
    mensagem = 'O que ' + meu.nome + ' vai fazer?';
  }
}

function tentarBatalha() {
  for (let i = 0; i < battleZones.length; i++) {
    const zona = battleZones[i];
    if (overlap(player.x, player.y, player.width, player.height, zona.x, zona.y, zona.width, zona.height) && Math.random() < 0.02) {
      flash = 20;
      iniciarBatalha();
    }
  }
}

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

function falarComNpc() {
  for (let i = 0; i < characters.length; i++) {
    const npc = characters[i];
    if (overlap(player.x - 6, player.y - 6, player.width + 12, player.height + 12, npc.x, npc.y, npc.width, npc.height)) {
      dialogo = npc.fala;
      return;
    }
  }
  dialogo = '';
}

function atualizarCamera() {
  camera.x = player.x + player.width / 2 - viewWidth / 2;
  camera.y = player.y + player.height / 2 - viewHeight / 2;
  camera.x = Math.max(0, Math.min(camera.x, worldWidth - viewWidth));
  camera.y = Math.max(0, Math.min(camera.y, worldHeight - viewHeight));
}

function desenharMapa() {
  ctx.save();
  ctx.translate(0 - camera.x, 0 - camera.y);
  for (let r = 0; r < mapa.length; r++) {
    const row = mapa[r];
    for (let col = 0; col < row.length; col++) {
      const simbolo = row[col];
      if (simbolo === '#') {
        ctx.fillStyle = '#7a6a55';
        ctx.fillRect(col * tile, r * tile, tile, tile);
      } else if (simbolo === 'C') {
        ctx.fillStyle = '#b45a3c';
        ctx.fillRect(col * tile, r * tile, tile, tile);
      } else if (simbolo === '"') {
        ctx.fillStyle = '#3f7a3f';
        ctx.fillRect(col * tile, r * tile, tile, tile);
        ctx.fillStyle = '#4f9a4f';
        ctx.fillRect(col * tile + 6, r * tile + 6, 8, 14);
        ctx.fillRect(col * tile + 22, r * tile + 10, 8, 14);
      } else {
        ctx.fillStyle = '#6fae5a';
        ctx.fillRect(col * tile, r * tile, tile, tile);
      }
    }
  }
  for (let i = 0; i < characters.length; i++) {
    characters[i].draw();
  }
  player.draw();
  ctx.restore();
}

function desenharBatalha() {
  ctx.fillStyle = '#d7e8c8';
  ctx.fillRect(0, 0, canvas.width, 300);
  ctx.fillStyle = '#c8d8ee';
  ctx.fillRect(0, 0, canvas.width, 120);
  inimigo.desenhar(430, 40);
  meu.desenhar(90, 190);
  inimigo.barra(30, 30, false);
  meu.barra(390, 210, true);
  ctx.fillStyle = '#28304a';
  ctx.fillRect(20, 320, 600, 64);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(mensagem, 40, 358);
  if (fase === 'menu') {
    ctx.fillStyle = '#10142b';
    ctx.fillRect(360, 320, 260, 64);
    for (let i = 0; i < meu.golpes.length; i++) {
      ctx.fillStyle = '#ffffff';
      if (i === menuCursor) {
        ctx.fillText('>', 374, 344 + 26 * i);
      }
      ctx.fillText(meu.golpes[i], 396, 344 + 26 * i);
    }
  }
}

function tecla(key) {
  if (tela === 'inicio') {
    if (key === 'Enter') {
      tela = 'mapa';
    }
  } else if (tela === 'vitoria' || tela === 'derrota') {
    if (key === 'Enter') {
      battle.initiated = false;
      dialogo = '';
      tela = 'mapa';
    }
  } else if (tela === 'mapa') {
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
      falarComNpc();
    }
  } else if (tela === 'batalha') {
    if (queue.length > 0 || esperando > 0) {
      return;
    }
    if (fase === 'menu') {
      if (key === 'ArrowUp') {
        menuCursor = menuCursor - 1;
        if (menuCursor < 0) {
          menuCursor = meu.golpes.length - 1;
        }
      }
      if (key === 'ArrowDown') {
        menuCursor = menuCursor + 1;
        if (menuCursor >= meu.golpes.length) {
          menuCursor = 0;
        }
      }
      if (key === 'Enter') {
        jogadorAtaca();
      }
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

document.addEventListener('keydown', event => {
  tecla(event.key);
});
document.addEventListener('keyup', event => {
  soltar(event.key);
});

function animate() {
  requestAnimationFrame(animate);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (tela === 'inicio') {
    ctx.fillStyle = '#28304a';
    ctx.textAlign = 'center';
    ctx.font = '34px sans-serif';
    ctx.fillText('Treinador de Criaturas', canvas.width * 0.5, 150);
    ctx.font = '20px sans-serif';
    ctx.fillText('WASD anda, espaço fala, a grama alta esconde criaturas', canvas.width * 0.5, 220);
    ctx.fillText('Aperte Enter para começar', canvas.width * 0.5, 260);
    ctx.textAlign = 'left';
  } else if (tela === 'mapa') {
    if (keys.w) {
      tentarMover(0, 0 - 3);
    } else if (keys.s) {
      tentarMover(0, 3);
    } else if (keys.a) {
      tentarMover(0 - 3, 0);
    } else if (keys.d) {
      tentarMover(3, 0);
    }
    if (keys.w || keys.a || keys.s || keys.d) {
      tentarBatalha();
    }
    atualizarCamera();
    desenharMapa();
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Ache a criatura selvagem na grama', 20, 32);
    if (dialogo !== '') {
      ctx.fillStyle = '#10142b';
      ctx.fillRect(20, 330, 600, 54);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(dialogo, 40, 364);
    }
  } else if (tela === 'batalha') {
    if (esperando > 0) {
      esperando = esperando - 1;
      if (esperando === 0) {
        passo();
        if (queue.length > 0) {
          esperando = 45;
        }
      }
    }
    desenharBatalha();
  } else if (tela === 'vitoria') {
    ctx.fillStyle = '#28304a';
    ctx.textAlign = 'center';
    ctx.font = '34px sans-serif';
    ctx.fillText('Você venceu!', canvas.width * 0.5, 180);
    ctx.font = '20px sans-serif';
    ctx.fillText('Aperte Enter para voltar ao mapa', canvas.width * 0.5, 240);
    ctx.textAlign = 'left';
  } else if (tela === 'derrota') {
    ctx.fillStyle = '#28304a';
    ctx.textAlign = 'center';
    ctx.font = '34px sans-serif';
    ctx.fillText('Sua criatura desmaiou...', canvas.width * 0.5, 180);
    ctx.font = '20px sans-serif';
    ctx.fillText('Aperte Enter para tentar de novo', canvas.width * 0.5, 240);
    ctx.textAlign = 'left';
  }

  if (flash > 0) {
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = flash / 20;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1;
    flash = flash - 1;
  }
}
animate();`

const INDEX_HTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Treinador de Criaturas</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <canvas id="canvas1"></canvas>

    <script src="script.js"></script>
</body>
</html>`

const STYLE_CSS = `body {
    margin: 0;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #10142b;
}
#canvas1 {
    background: #6fae5a;
    border: 4px solid #10142b;
    border-radius: 10px;
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

/** Mapa seletor→declarações (funde regras do mesmo seletor) — para comparar CSS
 * sem depender da ORDEM das declarações (reordenar é lossless). */
function cssDeclMap(css: string): Record<string, Record<string, string>> {
  const map: Record<string, Record<string, string>> = {}
  for (const m of css.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    const sel = (m[1] ?? '').trim()
    const decls: Record<string, string> = map[sel] ?? {}
    map[sel] = decls
    for (const d of (m[2] ?? '').split(';')) {
      const i = d.indexOf(':')
      if (i > 0) decls[d.slice(0, i).trim()] = d.slice(i + 1).trim()
    }
  }
  return map
}

/** Remove chaves internas de identidade (variam por parse) p/ comparar IRs. */
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

describe('Treinador de Criaturas (na mão) — pokemon FIEL 100% núcleo', () => {
  it('parseia os 3 arquivos SEM raw e sem diagnóstico', () => {
    const { ir, diagnostics } = parseProjectFilesWithDiagnostics(GAME_FILES)
    expect(diagnostics).toEqual([])
    const types = collectTypes(ir)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('rawCSS')).toBe(false)
    expect(types.has('rawHTML')).toBe(false)
    // Núcleo puro: nenhuma extensão.
    expect(ir.extensions).toEqual([])
    expect(
      [...types].some((t) => t.startsWith('g2d:') || t.startsWith('g3d:') || t.startsWith('gk:')),
    ).toBe(false)
    // O IR inteiro valida contra o schema (importável/persistível).
    expect(SZIRV2Schema.safeParse(ir).success).toBe(true)
    // a mecânica de ensino aparece: herança de classes, colisão AABB, tilemap
    // por texto, câmera com save/translate, a fila de ações e os sorteios.
    for (const t of [
      'classDecl',
      'funcDecl',
      'forRange',
      'if',
      'requestFrame',
      'canvasSetup',
      'canvasFillRect',
      'canvasSave',
      'canvasTranslate',
      'canvasRestore',
      'newInstance',
      'newExpr',
      'superCall', // herança: Monster/Character estendem Sprite (super(...))
      'setThisProp',
      'arrayPush',
      'arrayRemove', // a fila de ações consome com queue.shift()
      'mathBinary',
      'mathUnary',
      'randomFloat',
      'event',
    ]) {
      expect(types.has(t)).toBe(true)
    }
  })

  it('o exemplo do núcleo "Treinador de Criaturas (na mão)" NÃO deriva do parser atual', () => {
    // A IR embutida em examples/core.ts foi gerada por parseProjectFiles destas
    // MESMAS fontes; se o parser mudar a saída, este deep-equal aponta que o
    // exemplo precisa ser re-embutido (senão o kit abre diferente do contrato).
    const { ir } = parseProjectFilesWithDiagnostics(GAME_FILES)
    const normalize = (value: unknown) => JSON.parse(JSON.stringify(stripIds(value)))
    expect(normalize(treinadorDeCriaturasNaMaoExample.ir)).toEqual(normalize(ir))
  })

  it('round-trip textual é um FIXPOINT (gen∘parse estável) com os marcos das 2 cenas', () => {
    const ir1 = parseProjectFilesWithDiagnostics(GAME_FILES).ir
    const files1 = generateProjectFiles({ ir: ir1, projectName: 'Treinador de Criaturas' })
    const second = parseProjectFilesWithDiagnostics(files1)
    expect(second.diagnostics).toEqual([])
    expect(collectTypes(second.ir).has('rawJS')).toBe(false)
    const files2 = generateProjectFiles({ ir: second.ir, projectName: 'Treinador de Criaturas' })
    expect(files2['script.js']).toBe(files1['script.js'])
    expect(files2['index.html']).toBe(files1['index.html'])

    const js = files1['script.js']
    // As 3 classes com HERANÇA do original preservadas.
    for (const cls of [
      'class Sprite',
      'class Character extends Sprite',
      'class Monster extends Sprite',
    ]) {
      expect(js).toContain(cls)
    }
    expect(js).toContain('super(x, y, cor);')
    // CENA 1 — o tilemap por texto é MAIOR que a tela e nasce data-driven.
    expect(js).toContain(
      'boundaries.push({ x: col * tile, y: r * tile, width: tile, height: tile });',
    )
    expect(js).toContain(
      'battleZones.push({ x: col * tile, y: r * tile, width: tile, height: tile });',
    )
    // a câmera SEGUE o herói com LIMITE (clamp) via save + translate.
    expect(js).toContain('camera.x = Math.max(0, Math.min(camera.x, worldWidth - viewWidth));')
    expect(js).toContain('ctx.translate(0 - camera.x, 0 - camera.y);')
    // a ZONA DE BATALHA: pisar na grama tem CHANCE de iniciar (Math.random).
    expect(js).toContain('Math.random() < 0.02')
    // CENA 2 — a FILA DE AÇÕES: push para enfileirar, shift para consumir.
    expect(js).toContain('queue.push("checarInimigo");')
    expect(js).toContain('queue.push("inimigoAtaca");')
    expect(js).toContain('queue.shift();')
    // o inimigo SORTEIA o golpe da própria lista (revida).
    expect(js).toContain('Math.floor(Math.random() * inimigo.golpes.length)')
    // dano aplicado na barra de vida; desmaio checado na fila.
    expect(js).toContain('alvo.aplicar(dano);')
    expect(js).toContain('this.vida = this.vida - dano;')
    // ESTADO COMPARTILHADO entre as cenas: qual cena anima.
    expect(js).toContain('battle.initiated = true;')
    expect(js).toContain('battle.initiated = false;')
    // o laço é um requestAnimationFrame nomeado.
    expect(js).toContain('requestAnimationFrame(animate)')
  })

  it('round-trip por BLOCOS: IR → workspace → IR → código byte-igual, sem bloco raw', () => {
    const ir1 = parseProjectFilesWithDiagnostics(GAME_FILES).ir
    const files1 = generateProjectFiles({ ir: ir1, projectName: 'Treinador de Criaturas' })
    const state = buildWorkspaceStateFromIR(ir1)
    const stateJson = JSON.stringify(state)
    expect(stateJson).not.toContain('"sz_adv_raw_js"')
    expect(stateJson).not.toContain('"sz_adv_raw_css"')
    expect(stateJson).not.toContain('"sz_adv_raw_html"')

    ensureBlocklyInitialized()
    const ws = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
      // Os blocos não representam a CASCA do documento — o app preserva
      // `htmlShell` do IR vigente em TODO regenerate (ver
      // BlocklyPanel.regenerateFromBlocks). O teste espelha o produto.
      const irFromBlocks = { ...buildIRFromWorkspace(ws), htmlShell: ir1.htmlShell }
      const filesFromBlocks = generateProjectFiles({
        ir: irFromBlocks,
        projectName: 'Treinador de Criaturas',
      })
      expect(filesFromBlocks['script.js']).toBe(files1['script.js'])
      // CSS: comparação SEMÂNTICA (blocos dedicados podem REORDENAR declarações).
      expect(cssDeclMap(filesFromBlocks['style.css'])).toEqual(cssDeclMap(files1['style.css']))
      expect(filesFromBlocks['index.html']).toBe(files1['index.html'])
    } finally {
      ws.dispose()
    }
  })
})
