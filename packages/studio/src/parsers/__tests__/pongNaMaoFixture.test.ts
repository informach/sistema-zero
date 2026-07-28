import { describe, expect, it } from 'bun:test'
import { generateProjectFiles } from '#generators'
import { SZIRV2Schema } from '#ir'
import { parseProjectFilesWithDiagnostics } from '#parsers'
import { pongNaMaoExample } from '../../examples/core'

/**
 * FIXTURE-ÂNCORA do exemplo "Pong (na mão)": o Pong clássico recriado SÓ com
 * blocos do NÚCLEO Canvas 2D (sem extensão), asset-free. Classes Paddle e Ball
 * de verdade, laço de animação com deltaTime (velocidades por milissegundo),
 * rebote com ÂNGULO pelo ponto de contato + guarda de direção (`bola.vx < 0`
 * para não grudar na raquete), IA da raquete do computador seguindo a bola e
 * placar até 5 com Enter para recomeçar. Contrato: 0 rawJS/rawCSS/rawHTML,
 * schema válido, o round-trip é FIXPOINT byte-estável, e a IR embutida em
 * examples/core.ts não desviou do parser vivo.
 */

const HTML = '<canvas id="jogo" width="480" height="320"></canvas>'
const CSS = [
  'body { margin: 0; overflow: hidden; background: #0b1020; display: flex; align-items: center; justify-content: center; min-height: 100vh; }',
  '#jogo { border: 2px solid #22d3ee; background: #11172a; }',
].join('\n')

const JS = `const canvas = document.getElementById('jogo');
const ctx = canvas.getContext('2d');
canvas.width = 480;
canvas.height = 320;
ctx.font = '20px sans-serif';

class Paddle {
    constructor(x){
        this.x = x;
        this.y = 130;
        this.width = 12;
        this.height = 60;
        this.speed = 0.32;
    }
    clamp(altura){
        if (this.y < 0){
            this.y = 0;
        }
        if (this.y + this.height > altura){
            this.y = altura - this.height;
        }
    }
    draw(cor){
        ctx.fillStyle = cor;
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}

class Ball {
    constructor(){
        this.size = 12;
        this.x = 234;
        this.y = 154;
        this.vx = 0.28;
        this.vy = 0.16;
    }
    reset(direcao){
        this.x = 234;
        this.y = 154;
        this.vx = 0.28 * direcao;
        this.vy = 0.16;
    }
    update(deltaTime){
        this.x = this.x + this.vx * deltaTime;
        this.y = this.y + this.vy * deltaTime;
    }
    draw(){
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(this.x, this.y, this.size, this.size);
    }
}

const jogador = new Paddle(24);
const computador = new Paddle(444);
const bola = new Ball();
let pontos = 0;
let pontosCpu = 0;
let cima = false;
let baixo = false;
let rodando = true;
let ultimo = 0;

document.addEventListener('keydown', (event) => {
    if (event.code === 'ArrowUp'){
        cima = true;
    }
    if (event.code === 'ArrowDown'){
        baixo = true;
    }
    if (event.code === 'Enter'){
        if (rodando === false){
            pontos = 0;
            pontosCpu = 0;
            bola.reset(1);
            rodando = true;
        }
    }
});
document.addEventListener('keyup', (event) => {
    if (event.code === 'ArrowUp'){
        cima = false;
    }
    if (event.code === 'ArrowDown'){
        baixo = false;
    }
});

function passo(agora){
    const deltaTime = agora - ultimo;
    ultimo = agora;
    ctx.fillStyle = '#11172a';
    ctx.fillRect(0, 0, 480, 320);
    if (rodando === true){
        if (cima === true){
            jogador.y = jogador.y - jogador.speed * deltaTime;
        }
        if (baixo === true){
            jogador.y = jogador.y + jogador.speed * deltaTime;
        }
        jogador.clamp(320);
        if (bola.y > computador.y + 24){
            computador.y = computador.y + 0.24 * deltaTime;
        }
        if (bola.y < computador.y + 12){
            computador.y = computador.y - 0.24 * deltaTime;
        }
        computador.clamp(320);
        bola.update(deltaTime);
        if (bola.y <= 0){
            bola.vy = Math.abs(bola.vy);
        }
        if (bola.y + bola.size >= 320){
            bola.vy = 0 - Math.abs(bola.vy);
        }
        if (bola.x < jogador.x + jogador.width && bola.x + bola.size > jogador.x && bola.y + bola.size > jogador.y && bola.y < jogador.y + jogador.height && bola.vx < 0){
            bola.vx = Math.abs(bola.vx) + 0.01;
            bola.vy = bola.vy + (bola.y - jogador.y - 24) * 0.004;
        }
        if (bola.x + bola.size > computador.x && bola.x < computador.x + computador.width && bola.y + bola.size > computador.y && bola.y < computador.y + computador.height && bola.vx > 0){
            bola.vx = 0 - Math.abs(bola.vx) - 0.01;
            bola.vy = bola.vy + (bola.y - computador.y - 24) * 0.004;
        }
        if (bola.x < 0){
            pontosCpu = pontosCpu + 1;
            bola.reset(1);
        }
        if (bola.x > 480){
            pontos = pontos + 1;
            bola.reset(-1);
        }
        jogador.draw('#22d3ee');
        computador.draw('#f472b6');
        bola.draw();
        ctx.fillStyle = '#e5e7eb';
        ctx.fillText('Voce ' + pontos + '  x  ' + pontosCpu + ' PC', 160, 28);
        if (pontos >= 5){
            rodando = false;
        }
        if (pontosCpu >= 5){
            rodando = false;
        }
    } else {
        ctx.fillStyle = '#e5e7eb';
        ctx.fillText('Fim! Voce ' + pontos + ' x ' + pontosCpu + ' PC', 130, 150);
        ctx.fillText('Aperte Enter para jogar de novo', 90, 180);
    }
    requestAnimationFrame(passo);
}
requestAnimationFrame(passo);`

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

describe('Pong (Clear Code) — 100% blocos do núcleo', () => {
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

  it('usa as técnicas do Pong OOP (classes Paddle/Ball, laço com deltaTime, teclado)', () => {
    const { ir } = parseProjectFilesWithDiagnostics(GAME_FILES)
    const types = collectTypes(ir)
    const raw = JSON.stringify(ir)
    expect(types.has('classDecl')).toBe(true) // as classes de verdade
    expect(types.has('animationLoop')).toBe(true) // requestAnimationFrame com o tempo
    expect(types.has('event')).toBe(true) // keydown/keyup
    expect(raw).toContain('"Paddle"')
    expect(raw).toContain('"Ball"')
    expect(raw).toContain('deltaTime') // o tempo do quadro (a regra de ouro do curso)
    expect(raw).toContain('"pontos"')
    expect(raw).toContain('"pontosCpu"')
  })

  it('o exemplo "Pong (na mão)" NÃO desviou do parser atual (drift guard)', () => {
    const { ir } = parseProjectFilesWithDiagnostics(GAME_FILES)
    const normalize = (value: unknown) => JSON.parse(JSON.stringify(stripIds(value)))
    expect(normalize(pongNaMaoExample.ir)).toEqual(normalize(ir))
  })

  it('round-trip textual do JS é um FIXPOINT (gen∘parse estável)', () => {
    // Como o cartão declara só o <canvas> (o resto do index.html é montado pelo
    // gerador), o fixpoint que importa é o do CÓDIGO do jogo — o `script.js`.
    const ir1 = parseProjectFilesWithDiagnostics(GAME_FILES).ir
    const files1 = generateProjectFiles({ ir: ir1, projectName: 'Pong' })
    const second = parseProjectFilesWithDiagnostics(files1)
    expect(second.diagnostics).toEqual([])
    expect(collectTypes(second.ir).has('rawJS')).toBe(false)
    const files2 = generateProjectFiles({ ir: second.ir, projectName: 'Pong' })
    expect(files2['script.js']).toBe(files1['script.js'])
  })
})
