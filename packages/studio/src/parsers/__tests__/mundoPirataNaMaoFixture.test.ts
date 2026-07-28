import { describe, expect, it } from 'bun:test'
import { generateProjectFiles } from '#generators'
import { SZIRV2Schema } from '#ir'
import { parseProjectFilesWithDiagnostics } from '#parsers'
import { mundoPirataNaMaoExample } from '../../examples/core'

/**
 * FIXTURE-ÂNCORA do exemplo "Mundo Pirata (na mão)": a plataforma lateral estilo
 * Mario recriada SÓ com blocos do NÚCLEO Canvas 2D (sem extensão), asset-free.
 * Classes Pirata/Plataforma/Inimigo/Moeda de verdade, laço com deltaTime (clamp
 * anti-teleporte + kickoff passo(0)), gravidade + pulo, colisão POR CIMA
 * (semi-colisão), câmera por offset (obj.x - cameraX), moedas, inimigos que
 * patrulham (pisão por cima derrota, encostar do lado tira vida), 3 vidas e
 * bandeira no fim. Contrato: 0 rawJS/rawCSS/rawHTML, schema válido, o round-trip
 * do JS é FIXPOINT, e a IR embutida em core.ts não desviou do parser vivo.
 */

const HTML = '<canvas id="jogo" width="480" height="300"></canvas>'
const CSS = [
  'body { margin: 0; overflow: hidden; background: #0e2a38; display: flex; align-items: center; justify-content: center; min-height: 100vh; }',
  '#jogo { border: 3px solid #123a4a; background: #8ecae6; }',
].join('\n')

const JS = `const canvas = document.getElementById('jogo');
const ctx = canvas.getContext('2d');
canvas.width = 480;
canvas.height = 300;
ctx.font = '18px sans-serif';

class Plataforma {
    constructor(x, y, w, h){
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
    }
    draw(cam){
        ctx.fillStyle = '#8d6e63';
        ctx.fillRect(this.x - cam, this.y, this.w, this.h);
    }
}

class Moeda {
    constructor(x, y){
        this.x = x;
        this.y = y;
        this.pego = false;
    }
    draw(cam){
        if (this.pego === false){
            ctx.fillStyle = '#ffd166';
            ctx.fillRect(this.x - cam, this.y, 14, 14);
        }
    }
}

class Inimigo {
    constructor(x, y){
        this.x = x;
        this.y = y;
        this.w = 26;
        this.h = 20;
        this.vx = 0.05;
        this.esquerda = x - 70;
        this.direita = x + 70;
        this.vivo = true;
    }
    update(deltaTime){
        this.x = this.x + this.vx * deltaTime;
        if (this.x < this.esquerda){
            this.vx = 0.05;
        }
        if (this.x > this.direita){
            this.vx = -0.05;
        }
    }
    draw(cam){
        if (this.vivo === true){
            ctx.fillStyle = '#8e44ad';
            ctx.fillRect(this.x - cam, this.y, this.w, this.h);
        }
    }
}

class Pirata {
    constructor(){
        this.x = 40;
        this.y = 160;
        this.w = 26;
        this.h = 40;
        this.vx = 0;
        this.vy = 0;
        this.noChao = false;
    }
    update(deltaTime, plataformas){
        this.vy = this.vy + 0.0016 * deltaTime;
        if (this.vy > 0.4){
            this.vy = 0.4;
        }
        this.x = this.x + this.vx * deltaTime;
        this.y = this.y + this.vy * deltaTime;
        this.noChao = false;
        for (let i = 0; i < plataformas.length; i = i + 1){
            const p = plataformas[i];
            if (this.x + this.w > p.x && this.x < p.x + p.w && this.y + this.h > p.y && this.y + this.h < p.y + 22 && this.vy > 0){
                this.y = p.y - this.h;
                this.vy = 0;
                this.noChao = true;
            }
        }
    }
    jump(){
        if (this.noChao === true){
            this.vy = -0.66;
        }
    }
    draw(cam){
        ctx.fillStyle = '#c0392b';
        ctx.fillRect(this.x - cam, this.y, this.w, this.h);
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(this.x - cam - 2, this.y - 5, this.w + 4, 6);
    }
}

const plataformas = [];
plataformas.push(new Plataforma(0, 264, 340, 40));
plataformas.push(new Plataforma(420, 264, 340, 40));
plataformas.push(new Plataforma(840, 264, 700, 40));
plataformas.push(new Plataforma(280, 196, 90, 16));
plataformas.push(new Plataforma(560, 184, 90, 16));
plataformas.push(new Plataforma(1000, 196, 90, 16));
const moedas = [];
moedas.push(new Moeda(300, 168));
moedas.push(new Moeda(590, 156));
moedas.push(new Moeda(700, 224));
moedas.push(new Moeda(1030, 168));
moedas.push(new Moeda(1300, 224));
const inimigos = [];
inimigos.push(new Inimigo(500, 244));
inimigos.push(new Inimigo(950, 244));
inimigos.push(new Inimigo(1200, 244));
const pirata = new Pirata();
let cameraX = 0;
let pontos = 0;
let vidas = 3;
let rodando = true;
let ganhou = false;
let esq = false;
let dir = false;
let ultimo = 0;

document.addEventListener('keydown', (event) => {
    if (event.code === 'ArrowLeft'){
        esq = true;
    }
    if (event.code === 'ArrowRight'){
        dir = true;
    }
    if (event.code === 'ArrowUp'){
        pirata.jump();
    }
    if (event.code === 'Enter'){
        if (rodando === false){
            pirata.x = 40;
            pirata.y = 160;
            pirata.vy = 0;
            pontos = 0;
            vidas = 3;
            rodando = true;
            ganhou = false;
        }
    }
});
document.addEventListener('keyup', (event) => {
    if (event.code === 'ArrowLeft'){
        esq = false;
    }
    if (event.code === 'ArrowRight'){
        dir = false;
    }
});

function machucar(){
    vidas = vidas - 1;
    pirata.x = 40;
    pirata.y = 160;
    pirata.vy = 0;
    if (vidas < 1){
        rodando = false;
        ganhou = false;
    }
}

function passo(agora){
    let deltaTime = agora - ultimo;
    ultimo = agora;
    if (deltaTime > 50){
        deltaTime = 50;
    }
    ctx.fillStyle = '#8ecae6';
    ctx.fillRect(0, 0, 480, 300);
    if (rodando === true){
        pirata.vx = 0;
        if (esq === true){
            pirata.vx = -0.22;
        }
        if (dir === true){
            pirata.vx = 0.22;
        }
        pirata.update(deltaTime, plataformas);
        cameraX = pirata.x - 180;
        if (cameraX < 0){
            cameraX = 0;
        }
        if (cameraX > 1060){
            cameraX = 1060;
        }
        for (let i = 0; i < inimigos.length; i = i + 1){
            const bicho = inimigos[i];
            bicho.update(deltaTime);
            if (bicho.vivo === true && pirata.x + pirata.w > bicho.x && pirata.x < bicho.x + bicho.w && pirata.y + pirata.h > bicho.y && pirata.y < bicho.y + bicho.h){
                if (pirata.y + 26 < bicho.y){
                    bicho.vivo = false;
                    pirata.vy = -0.4;
                    pontos = pontos + 2;
                } else {
                    machucar();
                }
            }
        }
        for (let i = 0; i < moedas.length; i = i + 1){
            const moeda = moedas[i];
            if (moeda.pego === false && pirata.x + pirata.w > moeda.x && pirata.x < moeda.x + 14 && pirata.y + pirata.h > moeda.y && pirata.y < moeda.y + 14){
                moeda.pego = true;
                pontos = pontos + 1;
            }
        }
        if (pirata.y > 320){
            machucar();
        }
        if (pirata.x > 1500){
            rodando = false;
            ganhou = true;
        }
        for (let i = 0; i < plataformas.length; i = i + 1){
            plataformas[i].draw(cameraX);
        }
        for (let i = 0; i < moedas.length; i = i + 1){
            moedas[i].draw(cameraX);
        }
        for (let i = 0; i < inimigos.length; i = i + 1){
            inimigos[i].draw(cameraX);
        }
        ctx.fillStyle = '#ffd166';
        ctx.fillRect(1540 - cameraX, 200, 14, 64);
        pirata.draw(cameraX);
        ctx.fillStyle = '#0e2a38';
        ctx.fillText('Vidas: ' + vidas + '   Tesouro: ' + pontos, 12, 26);
    } else {
        ctx.fillStyle = '#0e2a38';
        if (ganhou === true){
            ctx.fillText('Chegou na bandeira! Tesouro: ' + pontos, 90, 140);
        } else {
            ctx.fillText('Suas vidas acabaram!', 140, 140);
        }
        ctx.fillText('Aperte Enter para jogar de novo', 90, 170);
    }
    requestAnimationFrame(passo);
}
passo(0);`

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

describe('Mundo Pirata (Clear Code) — 100% blocos do núcleo', () => {
  it('parseia os 3 arquivos SEM raw e sem diagnóstico', () => {
    const { ir, diagnostics } = parseProjectFilesWithDiagnostics(GAME_FILES)
    expect(diagnostics).toEqual([])
    const types = collectTypes(ir)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('rawCSS')).toBe(false)
    expect(types.has('rawHTML')).toBe(false)
    expect(ir.extensions).toEqual([])
    expect([...types].some((t) => t.startsWith('g2d:') || t.startsWith('g3d:'))).toBe(false)
    expect(SZIRV2Schema.safeParse(ir).success).toBe(true)
  })

  it('usa as técnicas do platformer OOP (classes, deltaTime, câmera por offset)', () => {
    const { ir } = parseProjectFilesWithDiagnostics(GAME_FILES)
    const js = generateProjectFiles({ ir, projectName: 'Mundo Pirata' })['script.js']
    for (const cls of ['class Pirata', 'class Plataforma', 'class Inimigo', 'class Moeda']) {
      expect(js).toContain(cls)
    }
    expect(js).toContain('deltaTime') // a regra de ouro do curso
    expect(js).toContain('deltaTime = 50') // o clamp anti-teleporte
    expect(js).toContain('this.noChao') // pulo só no chão
    const raw = JSON.stringify(ir)
    expect(raw).toContain('"vidas"')
    expect(raw).toContain('"cameraX"') // a câmera que rola o mundo
  })

  it('o exemplo "Mundo Pirata (na mão)" NÃO desviou do parser atual (drift guard)', () => {
    const { ir } = parseProjectFilesWithDiagnostics(GAME_FILES)
    const normalize = (value: unknown) => JSON.parse(JSON.stringify(stripIds(value)))
    expect(normalize(mundoPirataNaMaoExample.ir)).toEqual(normalize(ir))
  })

  it('round-trip textual do JS é um FIXPOINT (gen∘parse estável)', () => {
    const ir1 = parseProjectFilesWithDiagnostics(GAME_FILES).ir
    const files1 = generateProjectFiles({ ir: ir1, projectName: 'Mundo Pirata' })
    const second = parseProjectFilesWithDiagnostics(files1)
    expect(second.diagnostics).toEqual([])
    expect(collectTypes(second.ir).has('rawJS')).toBe(false)
    const files2 = generateProjectFiles({ ir: second.ir, projectName: 'Mundo Pirata' })
    expect(files2['script.js']).toBe(files1['script.js'])
  })
})
