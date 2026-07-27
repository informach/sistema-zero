import { describe, expect, it } from 'bun:test'
import { buildIRFromWorkspace, buildWorkspaceStateFromIR } from '#blockly'
import { generateProjectFiles } from '#generators'
import { SZIRV2Schema } from '#ir'
import { parseProjectFilesWithDiagnostics } from '#parsers'
import { aventuraNaMaoExample } from '../../examples/core'

/**
 * FIXTURE REAL: a aventura estilo Zelda do curso recriada FIEL "na mão" —
 * mundo MAIOR que a tela (1600×1200) com CÂMERA por ctx.translate (HUD fica
 * FORA do translate), COLISÃO POR EIXO (mover X → resolver → mover Y →
 * resolver = wall-slide), espada como retângulo temporário na direção olhada
 * (timer de quadros), espada × inimigo = dano + KNOCKBACK (vetor invertido por
 * alguns quadros), espada × mato = destrói + partículas (quadradinhos que
 * somem), FSM do inimigo por distância (parado/perseguir/atacar em string +
 * ifs), i-frames com piscada por Math.floor(...) % 2 e Y-SORT em DUAS PASSADAS
 * (quem tem a base acima do herói desenha atrás; .sort(fn) não round-tripa).
 * Laço com TEMPO real (timestamp + deltaTime, velocidades por ms) e telas de
 * início/vitória/derrota com Enter. O contrato: o jogo INTEIRO vira blocos do
 * NÚCLEO (0 rawJS/rawCSS/rawHTML, sem extensão) e o round-trip é um FIXPOINT
 * estável, textual e de blocos.
 */

const SCRIPT_JS = `const canvas = document.getElementById('canvas1');
const ctx = canvas.getContext('2d');
canvas.width = 800;
canvas.height = 500;
ctx.font = '20px sans-serif';

class Player {
    constructor(game){
        this.game = game;
        this.width = 30;
        this.height = 34;
        this.x = 785;
        this.y = 583;
        this.speed = 0.22;
        this.vx = 0;
        this.vy = 0;
        this.direcao = 'baixo';
        this.vidas = 3;
        this.ataqueTimer = 0;
        this.invencivel = 0;
        this.kbx = 0;
        this.kby = 0;
        this.kbTimer = 0;
        this.espada = { x: 0, y: 0, width: 0, height: 0 };
    }
    update(deltaTime){
        if (this.kbTimer > 0){
            this.kbTimer = this.kbTimer - 1;
            this.vx = this.kbx;
            this.vy = this.kby;
        } else {
            this.vx = 0;
            this.vy = 0;
            if (this.game.keys.indexOf('ArrowLeft') > -1){
                this.vx = 0 - this.speed;
                this.direcao = 'esquerda';
            }
            if (this.game.keys.indexOf('ArrowRight') > -1){
                this.vx = this.speed;
                this.direcao = 'direita';
            }
            if (this.game.keys.indexOf('ArrowUp') > -1){
                this.vy = 0 - this.speed;
                this.direcao = 'cima';
            }
            if (this.game.keys.indexOf('ArrowDown') > -1){
                this.vy = this.speed;
                this.direcao = 'baixo';
            }
        }
        this.x = this.x + this.vx * deltaTime;
        this.resolverX();
        this.y = this.y + this.vy * deltaTime;
        this.resolverY();
        if (this.ataqueTimer > 0){
            this.ataqueTimer = this.ataqueTimer - 1;
        }
        this.atualizarEspada();
        if (this.invencivel > 0){
            this.invencivel = this.invencivel - 1;
        }
    }
    resolverX(){
        this.game.obstaculos.forEach(obs => {
            if (this.game.checkCollision(this, obs)){
                if (this.vx > 0){
                    this.x = obs.x - this.width;
                }
                if (this.vx < 0){
                    this.x = obs.x + obs.width;
                }
            }
        });
    }
    resolverY(){
        this.game.obstaculos.forEach(obs => {
            if (this.game.checkCollision(this, obs)){
                if (this.vy > 0){
                    this.y = obs.y - this.height;
                }
                if (this.vy < 0){
                    this.y = obs.y + obs.height;
                }
            }
        });
    }
    atacar(){
        if (this.ataqueTimer === 0){
            this.ataqueTimer = 15;
        }
    }
    atualizarEspada(){
        this.espada.width = 0;
        this.espada.height = 0;
        if (this.ataqueTimer > 0){
            if (this.direcao === 'direita'){
                this.espada.x = this.x + this.width;
                this.espada.y = this.y + 10;
                this.espada.width = 34;
                this.espada.height = 14;
            }
            if (this.direcao === 'esquerda'){
                this.espada.x = this.x - 34;
                this.espada.y = this.y + 10;
                this.espada.width = 34;
                this.espada.height = 14;
            }
            if (this.direcao === 'cima'){
                this.espada.x = this.x + 8;
                this.espada.y = this.y - 34;
                this.espada.width = 14;
                this.espada.height = 34;
            }
            if (this.direcao === 'baixo'){
                this.espada.x = this.x + 8;
                this.espada.y = this.y + this.height;
                this.espada.width = 14;
                this.espada.height = 34;
            }
        }
    }
    draw(){
        if (this.invencivel === 0 || Math.floor(this.invencivel / 4) % 2 === 0){
            ctx.fillStyle = '#2e7d32';
            ctx.fillRect(this.x, this.y + 12, this.width, this.height - 12);
            ctx.fillStyle = '#ffcc99';
            ctx.fillRect(this.x + 5, this.y + 2, 20, 12);
            ctx.fillStyle = '#1b5e20';
            ctx.fillRect(this.x + 3, this.y - 4, 24, 7);
        }
        if (this.ataqueTimer > 0){
            ctx.fillStyle = '#cfd8dc';
            ctx.fillRect(this.espada.x, this.espada.y, this.espada.width, this.espada.height);
        }
    }
}

class Enemy {
    constructor(game, x, y){
        this.game = game;
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 30;
        this.speed = 0.12;
        this.vida = 3;
        this.state = 'parado';
        this.invencivel = 0;
        this.kbx = 0;
        this.kby = 0;
        this.kbTimer = 0;
        this.markedForDeletion = false;
    }
    update(deltaTime){
        if (this.invencivel > 0){
            this.invencivel = this.invencivel - 1;
        }
        if (this.kbTimer > 0){
            this.kbTimer = this.kbTimer - 1;
            this.x = this.x + this.kbx * deltaTime;
            this.y = this.y + this.kby * deltaTime;
        } else {
            const dx = this.game.player.x - this.x;
            const dy = this.game.player.y - this.y;
            const distancia = Math.hypot(dx, dy);
            if (distancia > 240){
                this.state = 'parado';
            } else if (distancia > 46){
                this.state = 'perseguir';
            } else {
                this.state = 'atacar';
            }
            if (this.state === 'perseguir'){
                this.x = this.x + dx / distancia * this.speed * deltaTime;
                this.y = this.y + dy / distancia * this.speed * deltaTime;
            }
            if (this.state === 'atacar'){
                this.game.machucarHeroi(this);
            }
        }
    }
    draw(){
        if (this.invencivel === 0 || Math.floor(this.invencivel / 4) % 2 === 0){
            ctx.fillStyle = '#8e3ddb';
            ctx.fillRect(this.x, this.y, this.width, this.height);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(this.x + 6, this.y + 8, 6, 6);
            ctx.fillRect(this.x + 18, this.y + 8, 6, 6);
            if (this.state === 'atacar'){
                ctx.fillStyle = '#ff5252';
                ctx.fillRect(this.x + 6, this.y + 20, 18, 4);
            }
        }
    }
}

class Grass {
    constructor(x, y){
        this.x = x;
        this.y = y;
        this.width = 22;
        this.height = 22;
        this.markedForDeletion = false;
    }
    draw(){
        ctx.fillStyle = '#66bb6a';
        ctx.fillRect(this.x, this.y + 8, this.width, this.height - 8);
        ctx.fillRect(this.x + 3, this.y, 4, 10);
        ctx.fillRect(this.x + 9, this.y + 2, 4, 8);
        ctx.fillRect(this.x + 15, this.y, 4, 10);
    }
}

class Game {
    constructor(canvas){
        this.canvas = canvas;
        this.width = 1600;
        this.height = 1200;
        this.telaLargura = this.canvas.width;
        this.telaAltura = this.canvas.height;
        this.keys = [];
        this.tela = 'inicio';
        this.player = new Player(this);
        this.obstaculos = [];
        this.inimigos = [];
        this.matos = [];
        this.particulas = [];
        this.cameraX = 0;
        this.cameraY = 0;
        this.montarMundo();
        document.addEventListener('keydown', event => {
            if (this.keys.indexOf(event.key) === -1){
                this.keys.push(event.key);
            }
            if (event.key === ' '){
                this.player.atacar();
            }
            if (event.key === 'Enter' && this.tela !== 'jogando'){
                this.recomecar();
            }
        });
        document.addEventListener('keyup', event => {
            const indice = this.keys.indexOf(event.key);
            if (indice > -1){
                this.keys.splice(indice, 1);
            }
        });
    }
    montarMundo(){
        this.obstaculos = [];
        this.obstaculos.push({ x: 0, y: 0, width: this.width, height: 40 });
        this.obstaculos.push({ x: 0, y: this.height - 40, width: this.width, height: 40 });
        this.obstaculos.push({ x: 0, y: 0, width: 40, height: this.height });
        this.obstaculos.push({ x: this.width - 40, y: 0, width: 40, height: this.height });
        this.obstaculos.push({ x: 520, y: 720, width: 300, height: 40 });
        this.obstaculos.push({ x: 1020, y: 320, width: 40, height: 300 });
        for (let i = 0; i < 6; i++){
            this.obstaculos.push({ x: 200 + i * 230, y: 420, width: 48, height: 48 });
        }
        for (let i = 0; i < 5; i++){
            this.obstaculos.push({ x: 320 + i * 230, y: 900, width: 48, height: 48 });
        }
        this.matos = [];
        for (let linha = 0; linha < 4; linha++){
            for (let coluna = 0; coluna < 6; coluna++){
                this.matos.push(new Grass(220 + coluna * 26, 620 + linha * 26));
            }
        }
        for (let linha = 0; linha < 3; linha++){
            for (let coluna = 0; coluna < 5; coluna++){
                this.matos.push(new Grass(1150 + coluna * 26, 520 + linha * 26));
            }
        }
        this.inimigos = [];
        this.inimigos.push(new Enemy(this, 400, 300));
        this.inimigos.push(new Enemy(this, 1200, 900));
        this.inimigos.push(new Enemy(this, 1320, 240));
        this.inimigos.push(new Enemy(this, 300, 980));
        this.particulas = [];
    }
    recomecar(){
        this.montarMundo();
        this.player.x = 785;
        this.player.y = 583;
        this.player.vidas = 3;
        this.player.invencivel = 0;
        this.player.ataqueTimer = 0;
        this.player.kbTimer = 0;
        this.tela = 'jogando';
    }
    checkCollision(a, b){
        return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
    }
    machucarHeroi(inimigo){
        if (this.player.invencivel === 0 && this.checkCollision(inimigo, this.player)){
            this.player.vidas = this.player.vidas - 1;
            this.player.invencivel = 60;
            this.empurrar(this.player, inimigo, 0.5);
            if (this.player.vidas < 1){
                this.tela = 'derrota';
            }
        }
    }
    empurrar(quem, dequem, forca){
        const dx = quem.x - dequem.x;
        const dy = quem.y - dequem.y;
        let distancia = Math.hypot(dx, dy);
        if (distancia < 1){
            distancia = 1;
        }
        quem.kbx = dx / distancia * forca;
        quem.kby = dy / distancia * forca;
        quem.kbTimer = 10;
    }
    golpesDeEspada(){
        if (this.player.ataqueTimer > 0){
            this.inimigos.forEach(inimigo => {
                if (inimigo.invencivel === 0 && this.checkCollision(this.player.espada, inimigo)){
                    inimigo.vida = inimigo.vida - 1;
                    inimigo.invencivel = 20;
                    this.empurrar(inimigo, this.player, 0.6);
                    if (inimigo.vida < 1){
                        inimigo.markedForDeletion = true;
                        this.soltarParticulas(inimigo.x + 15, inimigo.y + 15, '#b388ff');
                    }
                }
            });
            this.matos.forEach(mato => {
                if (this.checkCollision(this.player.espada, mato)){
                    mato.markedForDeletion = true;
                    this.soltarParticulas(mato.x + 11, mato.y + 11, '#81c784');
                }
            });
            this.inimigos = this.inimigos.filter(inimigo => !inimigo.markedForDeletion);
            this.matos = this.matos.filter(mato => !mato.markedForDeletion);
        }
    }
    soltarParticulas(px, py, cor){
        for (let i = 0; i < 8; i++){
            this.particulas.push({ x: px, y: py, vx: Math.random() * 0.3 - 0.15, vy: Math.random() * 0.3 - 0.15, vida: 300, cor: cor });
        }
    }
    atualizarParticulas(deltaTime){
        this.particulas.forEach(pedaco => {
            pedaco.x = pedaco.x + pedaco.vx * deltaTime;
            pedaco.y = pedaco.y + pedaco.vy * deltaTime;
            pedaco.vida = pedaco.vida - deltaTime;
        });
        this.particulas = this.particulas.filter(pedaco => pedaco.vida > 0);
    }
    atualizarCamera(){
        this.cameraX = this.player.x + this.player.width * 0.5 - this.telaLargura * 0.5;
        this.cameraY = this.player.y + this.player.height * 0.5 - this.telaAltura * 0.5;
        if (this.cameraX < 0){
            this.cameraX = 0;
        }
        if (this.cameraX > this.width - this.telaLargura){
            this.cameraX = this.width - this.telaLargura;
        }
        if (this.cameraY < 0){
            this.cameraY = 0;
        }
        if (this.cameraY > this.height - this.telaAltura){
            this.cameraY = this.height - this.telaAltura;
        }
    }
    update(deltaTime){
        if (this.tela === 'jogando'){
            this.player.update(deltaTime);
            this.inimigos.forEach(inimigo => {
                inimigo.update(deltaTime);
            });
            this.golpesDeEspada();
            this.atualizarParticulas(deltaTime);
            this.atualizarCamera();
            if (this.inimigos.length === 0){
                this.tela = 'vitoria';
            }
        }
    }
    drawChao(){
        ctx.fillStyle = '#a5d6a7';
        ctx.fillRect(0, 0, this.width, this.height);
        this.obstaculos.forEach(obs => {
            ctx.fillStyle = '#7a5230';
            ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
        });
    }
    drawHUD(){
        for (let i = 0; i < this.player.vidas; i++){
            ctx.fillStyle = '#e53935';
            ctx.beginPath();
            ctx.arc(28 + 36 * i, 26, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(40 + 36 * i, 26, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillRect(21 + 36 * i, 27, 26, 11);
        }
        ctx.fillStyle = '#1b5e20';
        ctx.fillText('Inimigos: ' + this.inimigos.length, 20, 70);
    }
    draw(){
        if (this.tela === 'inicio'){
            ctx.textAlign = 'center';
            ctx.fillStyle = '#1b5e20';
            ctx.font = '34px sans-serif';
            ctx.fillText('Aventura do Herói', canvas.width * 0.5, 170);
            ctx.font = '20px sans-serif';
            ctx.fillText('Setas andam, espaço golpeia com a espada', canvas.width * 0.5, 240);
            ctx.fillText('Corte o mato e derrote os 4 inimigos!', canvas.width * 0.5, 275);
            ctx.fillText('Aperte Enter para começar', canvas.width * 0.5, 330);
            ctx.textAlign = 'left';
        } else if (this.tela === 'vitoria'){
            ctx.textAlign = 'center';
            ctx.fillStyle = '#1b5e20';
            ctx.font = '34px sans-serif';
            ctx.fillText('Você venceu!', canvas.width * 0.5, 220);
            ctx.font = '20px sans-serif';
            ctx.fillText('Aperte Enter para jogar de novo', canvas.width * 0.5, 280);
            ctx.textAlign = 'left';
        } else if (this.tela === 'derrota'){
            ctx.textAlign = 'center';
            ctx.fillStyle = '#1b5e20';
            ctx.font = '34px sans-serif';
            ctx.fillText('Fim de jogo...', canvas.width * 0.5, 220);
            ctx.font = '20px sans-serif';
            ctx.fillText('Aperte Enter para tentar de novo', canvas.width * 0.5, 280);
            ctx.textAlign = 'left';
        } else {
            ctx.save();
            ctx.translate(0 - this.cameraX, 0 - this.cameraY);
            this.drawChao();
            const baseHeroi = this.player.y + this.player.height;
            this.matos.forEach(mato => {
                if (mato.y + mato.height <= baseHeroi){
                    mato.draw();
                }
            });
            this.inimigos.forEach(inimigo => {
                if (inimigo.y + inimigo.height <= baseHeroi){
                    inimigo.draw();
                }
            });
            this.player.draw();
            this.matos.forEach(mato => {
                if (mato.y + mato.height > baseHeroi){
                    mato.draw();
                }
            });
            this.inimigos.forEach(inimigo => {
                if (inimigo.y + inimigo.height > baseHeroi){
                    inimigo.draw();
                }
            });
            this.particulas.forEach(pedaco => {
                ctx.fillStyle = pedaco.cor;
                ctx.fillRect(pedaco.x, pedaco.y, 5, 5);
            });
            ctx.restore();
            this.drawHUD();
        }
    }
}

const game = new Game(canvas);

let lastTime = 0;
function animate(timeStamp){
    requestAnimationFrame(animate);
    const deltaTime = timeStamp - lastTime;
    lastTime = timeStamp;
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
    <title>Aventura do Herói</title>
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
    background: #1b3a1d;
}
#canvas1 {
    background: #a5d6a7;
    border: 4px solid #10240f;
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

describe('Aventura do Herói (curso) — 100% blocos do núcleo', () => {
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

  it('o exemplo do núcleo "Aventura do Herói (na mão)" NÃO deriva do parser atual', () => {
    // A IR embutida em examples/core.ts foi gerada por parseProjectFiles destas
    // MESMAS fontes; se o parser mudar a saída, este deep-equal aponta que o
    // exemplo precisa ser re-embutido (senão o kit abre diferente do contrato).
    const { ir } = parseProjectFilesWithDiagnostics(GAME_FILES)
    const normalize = (value: unknown) => JSON.parse(JSON.stringify(stripIds(value)))
    expect(normalize(aventuraNaMaoExample.ir)).toEqual(normalize(ir))
  })

  it('round-trip textual é um FIXPOINT (gen∘parse estável) com os marcos do jogo', () => {
    const ir1 = parseProjectFilesWithDiagnostics(GAME_FILES).ir
    const files1 = generateProjectFiles({ ir: ir1, projectName: 'Aventura do Herói' })
    const second = parseProjectFilesWithDiagnostics(files1)
    expect(second.diagnostics).toEqual([])
    expect(collectTypes(second.ir).has('rawJS')).toBe(false)
    const files2 = generateProjectFiles({ ir: second.ir, projectName: 'Aventura do Herói' })
    expect(files2['script.js']).toBe(files1['script.js'])
    expect(files2['style.css']).toBe(files1['style.css'])
    expect(files2['index.html']).toBe(files1['index.html'])

    const js = files1['script.js']
    // As 4 classes do jogo preservadas.
    for (const cls of ['class Player', 'class Enemy', 'class Grass', 'class Game']) {
      expect(js).toContain(cls)
    }
    // CÂMERA na mão: o mundo desloca pro lado contrário; HUD fica fora.
    expect(js).toContain('ctx.translate(0 - this.cameraX, 0 - this.cameraY)')
    // COLISÃO POR EIXO (wall-slide): mover X → resolver → mover Y → resolver.
    expect(js).toContain('this.x = this.x + this.vx * deltaTime;')
    expect(js).toContain('this.resolverX();')
    expect(js).toContain('this.y = this.y + this.vy * deltaTime;')
    expect(js).toContain('this.resolverY();')
    // KNOCKBACK: vetor normalizado a partir de quem bateu.
    expect(js).toContain('quem.kbx = dx / distancia * forca;')
    // i-frames com PISCADA por quadros.
    expect(js).toContain('Math.floor(this.invencivel / 4) % 2 === 0')
    // FSM do inimigo por DISTÂNCIA (estado em string + ifs).
    expect(js).toContain('Math.hypot(dx, dy)')
    expect(js).toContain('this.state = "perseguir";')
    // Y-SORT em duas passadas pela BASE (sem .sort(fn), que não round-tripa).
    expect(js).toContain('mato.y + mato.height <= baseHeroi')
    expect(js).toContain('inimigo.y + inimigo.height > baseHeroi')
    // Mato destrutível com culling por filter.
    expect(js).toContain('this.matos = this.matos.filter((mato) => !mato.markedForDeletion);')
    // Laço com TEMPO real (velocidades por milissegundo × dt).
    expect(js).toContain('const deltaTime = timeStamp - lastTime;')
  })

  it('IR→blocos: NENHUM bloco raw/avançado e o round-trip de blocos regenera igual', () => {
    const ir1 = parseProjectFilesWithDiagnostics(GAME_FILES).ir
    const files1 = generateProjectFiles({ ir: ir1, projectName: 'Aventura do Herói' })
    const state = buildWorkspaceStateFromIR(ir1)
    const stateJson = JSON.stringify(state)
    expect(stateJson).not.toContain('"sz_adv_raw_js"')
    expect(stateJson).not.toContain('"sz_adv_raw_css"')
    expect(stateJson).not.toContain('"sz_adv_raw_html"')
    // O vocabulário do lote aparece de fato (câmera + culling).
    expect(stateJson).toContain('"sz_canvas_translate"')
    expect(stateJson).toContain('"sz_val_array_filter"')

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
        projectName: 'Aventura do Herói',
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
