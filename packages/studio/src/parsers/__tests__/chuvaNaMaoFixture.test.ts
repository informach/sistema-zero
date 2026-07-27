import { describe, expect, it } from 'bun:test'
import { buildIRFromWorkspace, buildWorkspaceStateFromIR } from '#blockly'
import { generateProjectFiles } from '#generators'
import { SZIRV2Schema } from '#ir'
import { parseProjectFilesWithDiagnostics } from '#parsers'
import { chuvaDeMeteorosNaMaoExample } from '../../examples/core'

/**
 * FIXTURE REAL: o Space Shooter 2D do curso Clear Code (raylib) recriado FIEL
 * "na mão" — a família de sprites em CLASSES com herança de verdade (Sprite
 * base com posição/direção/velocidade, move com dt, culling ±300 e getCenter;
 * Player com as 4 direções NORMALIZADAS pela hipotenusa — a lição da diagonal
 * — + clamp e tiro via método do Game; Laser; Meteor com x sorteado, direção
 * diagonal uniforme, velocidade sorteada e ROTAÇÃO contínua desenhada com
 * save/translate/rotate/restore, em graus convertidos por Math.PI/180;
 * ExplosionAnimation com índice por 0.02*dt e círculos concêntricos que
 * crescem e esmaecem com globalAlpha — a animação por índice SEM assets), 30
 * estrelas sorteadas no boot e desenhadas por código, colisões LITERAIS do
 * curso (laser×meteoro = círculo×retângulo pela distância do centro ao
 * retângulo via clamp; nave×meteoro = círculo×círculo com raios reduzidos,
 * perdoador), placar por tempo + bônus por meteoro, culling por filter, spawn
 * por ACUMULAÇÃO (~0,4s como o curso), laço com deltaTime REAL CLAMPADO em
 * 50ms, blur zerando as teclas e telas de início/fim com Enter. O contrato: o
 * jogo INTEIRO vira blocos do NÚCLEO (0 rawJS/rawCSS/rawHTML, sem extensão) e
 * o round-trip é um FIXPOINT estável, textual e de blocos.
 */

const SCRIPT_JS = `const canvas = document.getElementById('canvas1');
const ctx = canvas.getContext('2d');
canvas.width = 800;
canvas.height = 500;
ctx.font = '20px sans-serif';

class Sprite {
    constructor(game, x, y, dirX, dirY, speed){
        this.game = game;
        this.x = x;
        this.y = y;
        this.dirX = dirX;
        this.dirY = dirY;
        this.speed = speed;
        this.discard = false;
    }
    move(deltaTime){
        this.x = this.x + this.dirX * this.speed * deltaTime;
        this.y = this.y + this.dirY * this.speed * deltaTime;
    }
    checkDiscard(){
        if (this.y < -300 || this.y > this.game.height + 300){
            this.discard = true;
        }
    }
    getCenterX(){
        return this.x + this.width * 0.5;
    }
    getCenterY(){
        return this.y + this.height * 0.5;
    }
    update(deltaTime){
        this.move(deltaTime);
        this.checkDiscard();
    }
}

class Player extends Sprite {
    constructor(game){
        super(game, game.width * 0.5 - 24, game.height - 120, 0, 0, 0.5);
        this.width = 48;
        this.height = 40;
        this.collisionRadius = this.height * 0.5 * 0.7;
    }
    input(){
        this.dirX = 0;
        this.dirY = 0;
        if (this.game.keys.indexOf('ArrowRight') > -1){
            this.dirX = this.dirX + 1;
        }
        if (this.game.keys.indexOf('ArrowLeft') > -1){
            this.dirX = this.dirX - 1;
        }
        if (this.game.keys.indexOf('ArrowDown') > -1){
            this.dirY = this.dirY + 1;
        }
        if (this.game.keys.indexOf('ArrowUp') > -1){
            this.dirY = this.dirY - 1;
        }
        const comprimento = Math.hypot(this.dirX, this.dirY);
        if (comprimento > 0){
            this.dirX = this.dirX / comprimento;
            this.dirY = this.dirY / comprimento;
        }
    }
    constraint(){
        this.x = Math.max(0, Math.min(this.x, this.game.width - this.width));
        this.y = Math.max(0, Math.min(this.y, this.game.height - this.height));
    }
    shoot(){
        this.game.shootLaser(this.getCenterX() - 3, this.y - 24);
    }
    update(deltaTime){
        this.input();
        this.move(deltaTime);
        this.constraint();
    }
    draw(){
        ctx.fillStyle = '#9ad1ff';
        ctx.fillRect(this.x + 18, this.y, 12, 14);
        ctx.fillStyle = '#4d7cc1';
        ctx.fillRect(this.x + 12, this.y + 12, 24, 20);
        ctx.fillRect(this.x, this.y + 22, 48, 12);
        ctx.fillStyle = '#ffb703';
        ctx.fillRect(this.x + 8, this.y + 34, 8, 6);
        ctx.fillRect(this.x + 32, this.y + 34, 8, 6);
    }
}

class Laser extends Sprite {
    constructor(game, x, y){
        super(game, x, y, 0, -1, 0.6);
        this.width = 6;
        this.height = 24;
    }
    draw(){
        ctx.fillStyle = '#7df9ff';
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}

class Meteor extends Sprite {
    constructor(game){
        super(game, Math.random() * game.width, -150 + Math.random() * 100, Math.random() - 0.5, 1, 0.3 + Math.random() * 0.1);
        this.width = 44;
        this.height = 44;
        this.collisionRadius = this.width * 0.5 * 0.9;
        this.rotation = 0;
    }
    getCenterX(){
        return this.x;
    }
    getCenterY(){
        return this.y;
    }
    update(deltaTime){
        super.update(deltaTime);
        this.rotation = this.rotation + 0.05 * deltaTime;
    }
    draw(){
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation * Math.PI / 180);
        ctx.fillStyle = '#9b7653';
        ctx.beginPath();
        ctx.arc(0, 0, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#7a5b40';
        ctx.beginPath();
        ctx.arc(-8, -6, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(9, 5, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#b08a63';
        ctx.fillRect(4, -16, 7, 5);
        ctx.restore();
    }
}

class ExplosionAnimation {
    constructor(x, y){
        this.x = x;
        this.y = y;
        this.index = 0;
        this.discard = false;
    }
    update(deltaTime){
        if (this.index < 8){
            this.index = this.index + 0.02 * deltaTime;
        } else {
            this.discard = true;
        }
    }
    draw(){
        const fase = Math.floor(this.index);
        const brilho = 1 - this.index * 0.12;
        ctx.globalAlpha = brilho;
        ctx.fillStyle = '#ffb703';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 12 + fase * 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ff5714';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 6 + fase * 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff3d6';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 3 + fase, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

class Game {
    constructor(canvas){
        this.canvas = canvas;
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        this.keys = [];
        this.stars = [];
        for (let i = 0; i < 30; i++){
            this.stars.push({ x: Math.random() * this.width, y: Math.random() * this.height, size: 0.5 + Math.random() * 1.6 });
        }
        this.player = new Player(this);
        this.lasers = [];
        this.meteors = [];
        this.explosions = [];
        this.meteorTimer = 0;
        this.meteorInterval = 400;
        this.score = 0;
        this.bonus = 0;
        this.screen = 'inicio';
        document.addEventListener('keydown', event => {
            if (this.keys.indexOf(event.key) === -1){
                this.keys.push(event.key);
            }
            if (event.key === ' ' && this.screen === 'jogando'){
                this.player.shoot();
            }
            if (event.key === 'Enter' && this.screen !== 'jogando'){
                this.restart();
            }
        });
        document.addEventListener('keyup', event => {
            const indice = this.keys.indexOf(event.key);
            if (indice > -1){
                this.keys.splice(indice, 1);
            }
        });
        window.addEventListener('blur', () => {
            this.keys = [];
        });
    }
    restart(){
        this.lasers = [];
        this.meteors = [];
        this.explosions = [];
        this.meteorTimer = 0;
        this.score = 0;
        this.bonus = 0;
        this.player.x = this.width * 0.5 - this.player.width * 0.5;
        this.player.y = this.height - 120;
        this.screen = 'jogando';
    }
    shootLaser(x, y){
        this.lasers.push(new Laser(this, x, y));
    }
    createMeteor(){
        this.meteors.push(new Meteor(this));
    }
    discardSprites(){
        this.lasers = this.lasers.filter(laser => !laser.discard);
        this.meteors = this.meteors.filter(meteor => !meteor.discard);
        this.explosions = this.explosions.filter(explosion => !explosion.discard);
    }
    checkCollisions(){
        this.lasers.forEach(laser => {
            this.meteors.forEach(meteor => {
                const px = Math.max(laser.x, Math.min(meteor.x, laser.x + laser.width));
                const py = Math.max(laser.y, Math.min(meteor.y, laser.y + laser.height));
                const dx = meteor.x - px;
                const dy = meteor.y - py;
                if (dx * dx + dy * dy < meteor.collisionRadius * meteor.collisionRadius){
                    laser.discard = true;
                    meteor.discard = true;
                    this.bonus = this.bonus + 5;
                    this.explosions.push(new ExplosionAnimation(meteor.x, meteor.y));
                }
            });
        });
        this.meteors.forEach(meteor => {
            const dx = this.player.getCenterX() - meteor.x;
            const dy = this.player.getCenterY() - meteor.y;
            const distancia = Math.hypot(dx, dy);
            if (distancia < this.player.collisionRadius + meteor.collisionRadius){
                this.screen = 'fim';
            }
        });
    }
    drawStars(){
        ctx.fillStyle = '#ffffff';
        this.stars.forEach(star => {
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            ctx.fill();
        });
    }
    drawScore(){
        const pontos = Math.floor(this.score * 0.001) + this.bonus;
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText('Pontos: ' + pontos, this.width * 0.5, 40);
        ctx.textAlign = 'left';
    }
    update(deltaTime){
        if (this.screen === 'jogando'){
            this.score = this.score + deltaTime;
            this.meteorTimer = this.meteorTimer + deltaTime;
            if (this.meteorTimer > this.meteorInterval){
                this.meteorTimer = 0;
                this.createMeteor();
            }
            this.player.update(deltaTime);
            this.lasers.forEach(laser => {
                laser.update(deltaTime);
            });
            this.meteors.forEach(meteor => {
                meteor.update(deltaTime);
            });
            this.explosions.forEach(explosion => {
                explosion.update(deltaTime);
            });
            this.checkCollisions();
            this.discardSprites();
        }
    }
    draw(){
        this.drawStars();
        if (this.screen === 'inicio'){
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.fillText('Chuva de Meteoros', this.width * 0.5, this.height * 0.5 - 16);
            ctx.fillText('Setas movem, espaço atira. Aperte Enter para começar', this.width * 0.5, this.height * 0.5 + 16);
            ctx.textAlign = 'left';
        } else {
            this.drawScore();
            this.player.draw();
            this.lasers.forEach(laser => {
                laser.draw();
            });
            this.meteors.forEach(meteor => {
                meteor.draw();
            });
            this.explosions.forEach(explosion => {
                explosion.draw();
            });
            if (this.screen === 'fim'){
                ctx.fillStyle = '#ffffff';
                ctx.textAlign = 'center';
                ctx.fillText('Fim de jogo!', this.width * 0.5, this.height * 0.5 - 16);
                ctx.fillText('Aperte Enter para tentar de novo', this.width * 0.5, this.height * 0.5 + 16);
                ctx.textAlign = 'left';
            }
        }
    }
}

const game = new Game(canvas);

let lastTime = 0;
function animate(timeStamp){
    requestAnimationFrame(animate);
    let deltaTime = timeStamp - lastTime;
    lastTime = timeStamp;
    if (deltaTime > 50){
        deltaTime = 50;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    game.update(deltaTime);
    game.draw();
}
animate(0);`

const INDEX_HTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chuva de Meteoros</title>
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
    background: #05030d;
}
#canvas1 {
    background: #0f0a19;
    border: 4px solid #4d7cc1;
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

describe('Chuva de Meteoros (Clear Code raylib 2D) — 100% blocos do núcleo', () => {
  it('parseia os 3 arquivos SEM raw e sem diagnóstico', () => {
    const { ir, diagnostics } = parseProjectFilesWithDiagnostics(GAME_FILES)
    expect(diagnostics).toEqual([])
    const types = collectTypes(ir)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('rawCSS')).toBe(false)
    expect(types.has('rawHTML')).toBe(false)
    // Núcleo puro: nenhuma extensão.
    expect(ir.extensions).toEqual([])
    expect([...types].some((t) => t.startsWith('g2d:') || t.startsWith('g3d:'))).toBe(false)
    // O IR inteiro valida contra o schema (importável/persistível).
    expect(SZIRV2Schema.safeParse(ir).success).toBe(true)
  })

  it('o exemplo do núcleo "Chuva de Meteoros (na mão)" NÃO deriva do parser atual', () => {
    // A IR embutida em examples/core.ts foi gerada por parseProjectFiles destas
    // MESMAS fontes; se o parser mudar a saída, este deep-equal aponta que o
    // exemplo precisa ser re-embutido (senão o kit abre diferente do contrato).
    // Round-trip por JSON dos DOIS lados: chaves `undefined` explícitas do parse
    // fresco (ex.: `else: undefined`) equivalem a chave ausente no embutido.
    const { ir } = parseProjectFilesWithDiagnostics(GAME_FILES)
    const normalize = (value: unknown) => JSON.parse(JSON.stringify(stripIds(value)))
    expect(normalize(chuvaDeMeteorosNaMaoExample.ir)).toEqual(normalize(ir))
  })

  it('round-trip textual é um FIXPOINT (gen∘parse estável) com os marcos do jogo', () => {
    const ir1 = parseProjectFilesWithDiagnostics(GAME_FILES).ir
    const files1 = generateProjectFiles({ ir: ir1, projectName: 'Chuva de Meteoros' })
    const second = parseProjectFilesWithDiagnostics(files1)
    expect(second.diagnostics).toEqual([])
    expect(collectTypes(second.ir).has('rawJS')).toBe(false)
    const files2 = generateProjectFiles({ ir: second.ir, projectName: 'Chuva de Meteoros' })
    expect(files2['script.js']).toBe(files1['script.js'])
    expect(files2['style.css']).toBe(files1['style.css'])
    expect(files2['index.html']).toBe(files1['index.html'])

    const js = files1['script.js']
    // A família de sprites do curso preservada, com HERANÇA de verdade.
    for (const cls of [
      'class Sprite',
      'class Player extends Sprite',
      'class Laser extends Sprite',
      'class Meteor extends Sprite',
      'class ExplosionAnimation',
      'class Game',
    ]) {
      expect(js).toContain(cls)
    }
    // Laço com TEMPO real + CLAMP de 50ms (trocar de aba não teleporta).
    expect(js).toContain('let deltaTime = timeStamp - lastTime;')
    expect(js).toContain('deltaTime = 50;')
    expect(js).toContain('requestAnimationFrame(animate)')
    // A lição da DIAGONAL: as 4 direções normalizadas pela hipotenusa.
    expect(js).toContain('const comprimento = Math.hypot(this.dirX, this.dirY);')
    expect(js).toContain('this.dirX = this.dirX / comprimento;')
    // Clamp literal do curso: max(0, min(pos, tela - tamanho)).
    expect(js).toContain('Math.max(0, Math.min(this.x, this.game.width - this.width))')
    // A ROTAÇÃO do meteoro na mão: save + translate + rotate (graus→radianos) + restore.
    expect(js).toContain('ctx.translate(this.x, this.y);')
    expect(js).toContain('ctx.rotate((this.rotation * Math.PI / 180));')
    expect(js).toContain('ctx.restore();')
    expect(js).toContain('this.rotation = this.rotation + 0.05 * deltaTime;')
    // Colisão LITERAL laser×meteoro: círculo×retângulo via clamp (a matemática à mão).
    expect(js).toContain('Math.max(laser.x, Math.min(meteor.x, laser.x + laser.width))')
    expect(js).toContain('dx * dx + dy * dy < meteor.collisionRadius * meteor.collisionRadius')
    // Colisão nave×meteoro: círculo×círculo com raios REDUZIDOS (perdoador).
    expect(js).toContain('this.collisionRadius = this.height * 0.5 * 0.7;')
    expect(js).toContain('distancia < this.player.collisionRadius + meteor.collisionRadius')
    // A animação por ÍNDICE sem assets: index += 0.02*dt, fase por Math.floor.
    expect(js).toContain('this.index = this.index + 0.02 * deltaTime;')
    expect(js).toContain('const fase = Math.floor(this.index);')
    expect(js).toContain('ctx.globalAlpha = brilho;')
    // Culling manual por filter (a lista em soquete).
    expect(js).toContain('this.lasers = this.lasers.filter((laser) => !laser.discard);')
    expect(js).toContain('this.meteors = this.meteors.filter((meteor) => !meteor.discard);')
    // Timer de spawn por ACUMULAÇÃO (~0,4s como o curso).
    expect(js).toContain('this.meteorTimer = this.meteorTimer + deltaTime;')
    // 30 estrelas sorteadas no boot (pos + tamanho), desenhadas por código.
    expect(js).toContain(
      'this.stars.push({ x: Math.random() * this.width, y: Math.random() * this.height, size: 0.5 + Math.random() * 1.6 });',
    )
    // Blur da janela zera as teclas (seta não fica presa).
    expect(js).toContain('window.addEventListener("blur"')
    // e→event no listener do construtor (normalização aceita).
    expect(js).toContain('event.key')
    expect(js).not.toMatch(/\be\.key\b/)
  })

  it('IR→blocos: NENHUM bloco raw/avançado e o round-trip de blocos regenera igual', () => {
    const ir1 = parseProjectFilesWithDiagnostics(GAME_FILES).ir
    const files1 = generateProjectFiles({ ir: ir1, projectName: 'Chuva de Meteoros' })
    const state = buildWorkspaceStateFromIR(ir1)
    const stateJson = JSON.stringify(state)
    expect(stateJson).not.toContain('"sz_adv_raw_js"')
    expect(stateJson).not.toContain('"sz_adv_raw_css"')
    expect(stateJson).not.toContain('"sz_adv_raw_html"')
    // O vocabulário de classes do núcleo aparece de fato (com herança).
    expect(stateJson).toContain('"sz_val_new"')
    expect(stateJson).toContain('"sz_val_array_filter"')
    expect(stateJson).toContain('"sz_js_super_ctor"')
    expect(stateJson).toContain('"sz_js_super_method"')
    // A receita da rotação 2D em blocos dedicados de Canvas.
    expect(stateJson).toContain('"sz_canvas_save"')
    expect(stateJson).toContain('"sz_canvas_translate"')
    expect(stateJson).toContain('"sz_canvas_rotate"')
    expect(stateJson).toContain('"sz_canvas_restore"')
    expect(stateJson).toContain('"sz_math_angle_convert"')

    // Carrega num workspace HEADLESS e reconstrói a IR pelos BLOCOS: o código
    // regenerado tem que ser o MESMO (blocos⇄código sem perda).
    const Blockly = require('blockly/core') as typeof import('blockly/core')
    const { ensureBlocklyInitialized } = require('../../blockly/setup') as {
      ensureBlocklyInitialized: () => void
    }
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
        projectName: 'Chuva de Meteoros',
      })
      expect(filesFromBlocks['script.js']).toBe(files1['script.js'])
      // CSS: comparação SEMÂNTICA (mapa seletor→declarações) — blocos dedicados
      // podem REORDENAR declarações (lossless). JS e HTML seguem byte-a-byte.
      expect(cssDeclMap(filesFromBlocks['style.css'])).toEqual(cssDeclMap(files1['style.css']))
      expect(filesFromBlocks['index.html']).toBe(files1['index.html'])
    } finally {
      ws.dispose()
    }
  })
})
