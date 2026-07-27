import { describe, expect, it } from 'bun:test'
import { buildIRFromWorkspace, buildWorkspaceStateFromIR } from '#blockly'
import { generateProjectFiles } from '#generators'
import { SZIRV2Schema } from '#ir'
import { parseProjectFilesWithDiagnostics } from '#parsers'
import { batalhaNaMaoExample } from '../../examples/core'

/**
 * FIXTURE REAL: a batalha de monstrinhos do curso (estilo Pokemon) recriada
 * FIEL "na mão" — a lição "programa = DADOS + REGRAS": tabelas de golpes e
 * fichas em objetos/arrays, MATRIZ DE VANTAGEM como objeto aninhado lida por
 * chave (VANTAGEM[tipo][elemento]), dano = força × multiplicador, CURA = dano
 * negativo na MESMA função de aplicar (clamp da vida em [0, max]), menus com
 * cursor por setas + Enter desenhados no canvas, BANCO DE RESERVAS com a vida
 * LEMBRADA de quem sai, turno do inimigo com atraso por setTimeout encadeado
 * (sorteia o golpe) e telas de início/vitória/derrota com Enter. O contrato: o
 * jogo INTEIRO vira blocos do NÚCLEO (0 rawJS/rawCSS/rawHTML, sem extensão) e
 * o round-trip é um FIXPOINT estável, textual e de blocos.
 */

const SCRIPT_JS = `const canvas = document.getElementById('canvas1');
const ctx = canvas.getContext('2d');
canvas.width = 800;
canvas.height = 500;
ctx.font = '20px sans-serif';

const VANTAGEM = {
    fogo: { fogo: 1, agua: 0.5, planta: 2 },
    agua: { fogo: 2, agua: 1, planta: 0.5 },
    planta: { fogo: 0.5, agua: 2, planta: 1 }
};
const GOLPES = {
    Brasa: { tipo: 'fogo', forca: 12 },
    Labareda: { tipo: 'fogo', forca: 18 },
    Jato: { tipo: 'agua', forca: 12 },
    Onda: { tipo: 'agua', forca: 18 },
    Folha: { tipo: 'planta', forca: 12 },
    Vinha: { tipo: 'planta', forca: 18 },
    Curar: { tipo: 'planta', forca: -16 }
};
const FICHAS = [
    { nome: 'Fogorim', elemento: 'fogo', vidaMax: 42, golpes: ['Brasa', 'Labareda', 'Curar'] },
    { nome: 'Gotinha', elemento: 'agua', vidaMax: 48, golpes: ['Jato', 'Onda', 'Curar'] },
    { nome: 'Brotinho', elemento: 'planta', vidaMax: 52, golpes: ['Folha', 'Vinha', 'Curar'] },
    { nome: 'Reizado', elemento: 'agua', vidaMax: 95, golpes: ['Jato', 'Onda', 'Folha'] }
];
const CORES = { fogo: '#e0533d', agua: '#3d7be0', planta: '#4caf50' };

class Monster {
    constructor(ficha, x, y){
        this.nome = ficha.nome;
        this.elemento = ficha.elemento;
        this.vidaMax = ficha.vidaMax;
        this.vida = ficha.vidaMax;
        this.golpes = ficha.golpes;
        this.x = x;
        this.y = y;
    }
    aplicar(dano){
        this.vida = this.vida - dano;
        if (this.vida > this.vidaMax){
            this.vida = this.vidaMax;
        }
        if (this.vida < 0){
            this.vida = 0;
        }
    }
    draw(){
        ctx.fillStyle = CORES[this.elemento];
        ctx.fillRect(this.x, this.y + 34, 70, 46);
        ctx.beginPath();
        ctx.arc(this.x + 35, this.y + 22, 24, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(this.x + 26, this.y + 18, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(this.x + 44, this.y + 18, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#222222';
        ctx.beginPath();
        ctx.arc(this.x + 27, this.y + 19, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(this.x + 45, this.y + 19, 2, 0, Math.PI * 2);
        ctx.fill();
    }
    drawBarra(bx, by){
        ctx.fillStyle = '#28304a';
        ctx.fillRect(bx, by, 200, 62);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(this.nome, bx + 12, by + 26);
        ctx.fillText(this.vida + '/' + this.vidaMax, bx + 118, by + 26);
        ctx.fillStyle = '#4a5578';
        ctx.fillRect(bx + 12, by + 38, 176, 12);
        ctx.fillStyle = '#4caf50';
        ctx.fillRect(bx + 12, by + 38, 176 * (this.vida / this.vidaMax), 12);
    }
}

class Menu {
    constructor(x, y){
        this.x = x;
        this.y = y;
        this.opcoes = [];
        this.cursor = 0;
    }
    mover(delta){
        this.cursor = this.cursor + delta;
        if (this.cursor < 0){
            this.cursor = this.opcoes.length - 1;
        }
        if (this.cursor >= this.opcoes.length){
            this.cursor = 0;
        }
    }
    escolha(){
        return this.opcoes[this.cursor];
    }
    draw(){
        ctx.fillStyle = '#28304a';
        ctx.fillRect(this.x, this.y, 250, 14 + 32 * this.opcoes.length);
        ctx.fillStyle = '#ffffff';
        this.opcoes.forEach((opcao, i) => {
            if (i === this.cursor){
                ctx.fillText('>', this.x + 14, this.y + 36 + 32 * i);
            }
            ctx.fillText(opcao, this.x + 40, this.y + 36 + 32 * i);
        });
    }
}

class Game {
    constructor(){
        this.menuAcoes = new Menu(520, 240);
        this.menuGolpes = new Menu(520, 240);
        this.menuTrocar = new Menu(520, 240);
        this.tela = 'inicio';
        this.montar();
        document.addEventListener('keydown', event => {
            this.tecla(event.key);
        });
    }
    montar(){
        this.time = [new Monster(FICHAS[0], 130, 268), new Monster(FICHAS[1], 130, 268), new Monster(FICHAS[2], 130, 268)];
        this.ativo = 0;
        this.inimigo = new Monster(FICHAS[3], 560, 96);
        this.fase = 'acoes';
        this.mensagem = 'O que Fogorim vai fazer?';
        this.menuAcoes.opcoes = ['Lutar', 'Trocar'];
        this.menuAcoes.cursor = 0;
    }
    meuMonstro(){
        return this.time[this.ativo];
    }
    menuAtual(){
        if (this.fase === 'golpes'){
            return this.menuGolpes;
        }
        if (this.fase === 'trocar'){
            return this.menuTrocar;
        }
        return this.menuAcoes;
    }
    tecla(key){
        if (this.tela === 'inicio'){
            if (key === 'Enter'){
                this.tela = 'batalha';
            }
        } else if (this.tela === 'vitoria' || this.tela === 'derrota'){
            if (key === 'Enter'){
                this.montar();
                this.tela = 'batalha';
            }
        } else if (this.fase !== 'espera'){
            const menu = this.menuAtual();
            if (key === 'ArrowUp'){
                menu.mover(-1);
            }
            if (key === 'ArrowDown'){
                menu.mover(1);
            }
            if (key === 'Enter'){
                this.confirmar();
            }
            if (key === 'Escape' && this.fase !== 'acoes' && this.meuMonstro().vida > 0){
                this.abrirAcoes();
            }
        }
    }
    confirmar(){
        if (this.fase === 'acoes'){
            const acao = this.menuAcoes.escolha();
            if (acao === 'Lutar'){
                this.abrirGolpes();
            } else {
                this.abrirTrocar();
            }
        } else if (this.fase === 'golpes'){
            this.jogadorAtaca();
        } else if (this.fase === 'trocar'){
            this.trocarPara(this.menuTrocar.cursor);
        }
    }
    abrirAcoes(){
        this.fase = 'acoes';
        this.menuAcoes.cursor = 0;
        this.mensagem = 'O que ' + this.meuMonstro().nome + ' vai fazer?';
    }
    abrirGolpes(){
        this.fase = 'golpes';
        this.menuGolpes.opcoes = this.meuMonstro().golpes;
        this.menuGolpes.cursor = 0;
    }
    abrirTrocar(){
        this.fase = 'trocar';
        this.menuTrocar.opcoes = [];
        this.time.forEach(monstro => {
            this.menuTrocar.opcoes.push(monstro.nome + ' (' + monstro.vida + ')');
        });
        this.menuTrocar.cursor = 0;
    }
    trocarPara(indice){
        const alvo = this.time[indice];
        if (alvo.vida > 0 && indice !== this.ativo){
            this.ativo = indice;
            this.mensagem = 'Vai, ' + alvo.nome + '!';
            this.esperarInimigo();
        } else {
            this.mensagem = alvo.nome + ' não pode entrar!';
        }
    }
    jogadorAtaca(){
        this.usarGolpe(this.meuMonstro(), this.inimigo, this.menuGolpes.escolha());
        this.esperarInimigo();
    }
    usarGolpe(atacante, alvo, nome){
        const golpe = GOLPES[nome];
        if (golpe.forca < 0){
            atacante.aplicar(golpe.forca);
            this.mensagem = atacante.nome + ' usou ' + nome + ' e se curou!';
        } else {
            const mult = VANTAGEM[golpe.tipo][alvo.elemento];
            alvo.aplicar(golpe.forca * mult);
            if (mult > 1){
                this.mensagem = atacante.nome + ' usou ' + nome + '. Super efetivo!';
            } else if (mult < 1){
                this.mensagem = atacante.nome + ' usou ' + nome + '. Pouco efetivo...';
            } else {
                this.mensagem = atacante.nome + ' usou ' + nome + '!';
            }
        }
    }
    esperarInimigo(){
        this.fase = 'espera';
        setTimeout(() => {
            this.turnoInimigo();
        }, 1200);
    }
    turnoInimigo(){
        if (this.inimigo.vida === 0){
            this.tela = 'vitoria';
        } else {
            const sorteio = Math.floor(Math.random() * this.inimigo.golpes.length);
            this.usarGolpe(this.inimigo, this.meuMonstro(), this.inimigo.golpes[sorteio]);
            setTimeout(() => {
                this.fimDoTurno();
            }, 1200);
        }
    }
    fimDoTurno(){
        if (this.meuMonstro().vida === 0){
            if (this.temReserva()){
                this.abrirTrocar();
                this.mensagem = this.meuMonstro().nome + ' desmaiou! Escolha outro.';
            } else {
                this.tela = 'derrota';
            }
        } else {
            this.abrirAcoes();
        }
    }
    temReserva(){
        let vivos = 0;
        this.time.forEach(monstro => {
            if (monstro.vida > 0){
                vivos = vivos + 1;
            }
        });
        return vivos > 0;
    }
    draw(){
        if (this.tela === 'inicio'){
            ctx.textAlign = 'center';
            ctx.fillStyle = '#28304a';
            ctx.font = '34px sans-serif';
            ctx.fillText('Batalha de Monstrinhos', canvas.width * 0.5, 180);
            ctx.font = '20px sans-serif';
            ctx.fillText('Setas movem o cursor, Enter confirma, Esc volta', canvas.width * 0.5, 260);
            ctx.fillText('Aperte Enter para começar', canvas.width * 0.5, 300);
            ctx.textAlign = 'left';
        } else if (this.tela === 'vitoria'){
            ctx.textAlign = 'center';
            ctx.fillStyle = '#28304a';
            ctx.font = '34px sans-serif';
            ctx.fillText('Você venceu!', canvas.width * 0.5, 220);
            ctx.font = '20px sans-serif';
            ctx.fillText('Aperte Enter para jogar de novo', canvas.width * 0.5, 280);
            ctx.textAlign = 'left';
        } else if (this.tela === 'derrota'){
            ctx.textAlign = 'center';
            ctx.fillStyle = '#28304a';
            ctx.font = '34px sans-serif';
            ctx.fillText('Seu time desmaiou...', canvas.width * 0.5, 220);
            ctx.font = '20px sans-serif';
            ctx.fillText('Aperte Enter para tentar de novo', canvas.width * 0.5, 280);
            ctx.textAlign = 'left';
        } else {
            ctx.fillStyle = '#d7e8c8';
            ctx.fillRect(90, 348, 220, 16);
            ctx.fillRect(530, 176, 220, 16);
            this.meuMonstro().draw();
            this.inimigo.draw();
            this.inimigo.drawBarra(60, 50);
            this.meuMonstro().drawBarra(60, 290);
            ctx.fillStyle = '#28304a';
            ctx.fillRect(30, 400, 740, 70);
            ctx.fillStyle = '#ffffff';
            ctx.fillText(this.mensagem, 50, 442);
            if (this.fase !== 'espera'){
                this.menuAtual().draw();
            }
        }
    }
}

const game = new Game();

function animate(){
    requestAnimationFrame(animate);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    game.draw();
}
animate();`

const INDEX_HTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Batalha de Monstrinhos</title>
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
    background: #28304a;
}
#canvas1 {
    background: #f4f9ec;
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

describe('Batalha de Monstrinhos (curso) — 100% blocos do núcleo', () => {
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

  it('o exemplo do núcleo "Batalha de Monstrinhos (na mão)" NÃO deriva do parser atual', () => {
    // A IR embutida em examples/core.ts foi gerada por parseProjectFiles destas
    // MESMAS fontes; se o parser mudar a saída, este deep-equal aponta que o
    // exemplo precisa ser re-embutido (senão o kit abre diferente do contrato).
    const { ir } = parseProjectFilesWithDiagnostics(GAME_FILES)
    const normalize = (value: unknown) => JSON.parse(JSON.stringify(stripIds(value)))
    expect(normalize(batalhaNaMaoExample.ir)).toEqual(normalize(ir))
  })

  it('round-trip textual é um FIXPOINT (gen∘parse estável) com os marcos do jogo', () => {
    const ir1 = parseProjectFilesWithDiagnostics(GAME_FILES).ir
    const files1 = generateProjectFiles({ ir: ir1, projectName: 'Batalha de Monstrinhos' })
    const second = parseProjectFilesWithDiagnostics(files1)
    expect(second.diagnostics).toEqual([])
    expect(collectTypes(second.ir).has('rawJS')).toBe(false)
    const files2 = generateProjectFiles({ ir: second.ir, projectName: 'Batalha de Monstrinhos' })
    expect(files2['script.js']).toBe(files1['script.js'])
    expect(files2['style.css']).toBe(files1['style.css'])
    expect(files2['index.html']).toBe(files1['index.html'])

    const js = files1['script.js']
    // As 3 classes do jogo preservadas.
    for (const cls of ['class Monster', 'class Menu', 'class Game']) {
      expect(js).toContain(cls)
    }
    // A lição "programa = dados + regras": a MATRIZ DE VANTAGEM lida por chave.
    expect(js).toContain('VANTAGEM[golpe.tipo][alvo.elemento]')
    // Dano = força × multiplicador; CURA = dano negativo na MESMA função.
    expect(js).toContain('alvo.aplicar(golpe.forca * mult)')
    expect(js).toContain('atacante.aplicar(golpe.forca)')
    // Clamp da vida em [0, max] dentro de aplicar().
    expect(js).toContain('this.vida = this.vida - dano;')
    // Turno do inimigo com ATRASO: setTimeout encadeado devolve o turno.
    expect(js).toContain('setTimeout(() => {')
    expect(js).toContain('}, 1200);')
    // O inimigo SORTEIA o golpe da própria lista.
    expect(js).toContain('Math.floor(Math.random() * this.inimigo.golpes.length)')
    // Banco de reservas: a vida de quem sai fica LEMBRADA no objeto (menu mostra).
    expect(js).toContain('" (" + monstro.vida + ")"')
    // Menu com cursor por índice e wrap por if (sem módulo).
    expect(js).toContain('this.cursor = this.cursor + delta;')
  })

  it('IR→blocos: NENHUM bloco raw/avançado e o round-trip de blocos regenera igual', () => {
    const ir1 = parseProjectFilesWithDiagnostics(GAME_FILES).ir
    const files1 = generateProjectFiles({ ir: ir1, projectName: 'Batalha de Monstrinhos' })
    const state = buildWorkspaceStateFromIR(ir1)
    const stateJson = JSON.stringify(state)
    expect(stateJson).not.toContain('"sz_adv_raw_js"')
    expect(stateJson).not.toContain('"sz_adv_raw_css"')
    expect(stateJson).not.toContain('"sz_adv_raw_html"')
    // O vocabulário do lote aparece de fato (tabelas + acesso por chave + turno).
    expect(stateJson).toContain('"sz_val_new"')
    expect(stateJson).toContain('"sz_js_set_timeout"')

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
        projectName: 'Batalha de Monstrinhos',
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
