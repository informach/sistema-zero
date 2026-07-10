import { describe, expect, it } from 'bun:test'
import { generateJS } from '../../generators/js'
import { parseJS } from '../js'

/** Nenhum rawJS em toda a árvore (statement OU aninhado em corpos). */
function collectRaw(statements: unknown[]): string[] {
  const raws: string[] = []
  const visit = (node: unknown): void => {
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node)) {
      for (const item of node) visit(item)
      return
    }
    const record = node as Record<string, unknown>
    if (record.type === 'rawJS') raws.push(String(record.code ?? ''))
    for (const value of Object.values(record)) visit(value)
  }
  visit(statements)
  return raws
}

/** gen(parse(src)) e o FIXPOINT: re-parsear o gerado produz o MESMO gerado. */
function roundtrip(src: string): { code: string; raws: string[] } {
  const ir = parseJS(src)
  const raws = collectRaw(ir)
  const code = generateJS({ statements: ir })
  const code2 = generateJS({ statements: parseJS(code) })
  expect(code2).toBe(code)
  return { code, raws }
}

describe('atribuição composta — alvos membro/this/indexado + *= /= %=', () => {
  it('this.prop ⊕= v expande para setThisProp com conta (0 rawJS)', () => {
    const src = [
      'class Jogador {',
      '  atualizar() {',
      '    this.x -= this.speed;',
      '    this.x += this.speed;',
      '    this.y += 5;',
      '    this.speedX *= -1;',
      '    this.vida /= 2;',
      '    this.passo %= 4;',
      '  }',
      '}',
    ].join('\n')
    const { code, raws } = roundtrip(src)
    expect(raws).toEqual([])
    expect(code).toContain('this.x = this.x - this.speed;')
    expect(code).toContain('this.x = this.x + this.speed;')
    expect(code).toContain('this.y = this.y + 5;')
    expect(code).toContain('this.speedX = this.speedX * -1;')
    expect(code).toContain('this.vida = this.vida / 2;')
    expect(code).toContain('this.passo = this.passo % 4;')
  })

  it('variável simples ganha os operadores novos (*=, /=, %=)', () => {
    const { code, raws } = roundtrip('let x = 10;\nx *= 3;\nx /= 2;\nx %= 4;\nx += 1;\nx -= 1;')
    expect(raws).toEqual([])
    expect(code).toContain('x = x * 3;')
    expect(code).toContain('x = x % 4;')
  })

  it('membro aninhado PURO expande (obj.prop, this.vel.x); e arr[i] também', () => {
    const src = [
      'let nave = { x: 0 };',
      'nave.x += 2;',
      'class A { mover() { this.vel.x *= 0.9; } }',
      'let placar = [1, 2];',
      'placar[0] += 10;',
    ].join('\n')
    const { code, raws } = roundtrip(src)
    expect(raws).toEqual([])
    expect(code).toContain('nave.x = nave.x + 2;')
    expect(code).toContain('this.vel.x = this.vel.x * 0.9;')
    expect(code).toContain('placar[0] = placar[0] + 10;')
  })

  it('this.prop++ e obj.prop-- também expandem', () => {
    const src = 'class A { tic() { this.frames++; this.vidas--; } }'
    const { code, raws } = roundtrip(src)
    expect(raws).toEqual([])
    expect(code).toContain('this.frames = this.frames + 1;')
    expect(code).toContain('this.vidas = this.vidas - 1;')
  })

  it('objeto IMPURO (chamada) fica em rawJS — avaliar 2x mudaria o comportamento', () => {
    const ir = parseJS('function pega() { return { x: 1 }; }\npega().x += 1;')
    const raws = collectRaw(ir)
    expect(raws).toEqual(['pega().x += 1;'])
  })

  it('menos unário sobre membro vira 0 - X (0 rawJS, fixpoint estável)', () => {
    const src = [
      'class Jogador {',
      '  ajustar() {',
      '    if (this.x < -this.width * 0.5) this.x = -this.width * 0.5;',
      '  }',
      '}',
    ].join('\n')
    const { code, raws } = roundtrip(src)
    expect(raws).toEqual([])
    expect(code).toContain('0 - this.width')
  })
})

describe('apelido do parâmetro de evento (e => event)', () => {
  it('e.key vira o bloco de tecla e regenera event.key (0 rawJS)', () => {
    const src = [
      "document.addEventListener('keydown', e => {",
      "  if (e.key === 'ArrowLeft') console.log('esquerda');",
      '});',
    ].join('\n')
    const { code, raws } = roundtrip(src)
    expect(raws).toEqual([])
    expect(code).toContain('(event) =>')
    expect(code).toContain('event.key')
    expect(code).not.toContain('e.key')
  })

  it('apelido dentro de LISTENER NO CONSTRUTOR (padrão do Space Invaders)', () => {
    const src = [
      'class Game {',
      '  constructor() {',
      '    this.keys = [];',
      "    window.addEventListener('keydown', e => {",
      '      if (this.keys.indexOf(e.key) === -1) this.keys.push(e.key);',
      '    });',
      "    window.addEventListener('keyup', e => {",
      '      const index = this.keys.indexOf(e.key);',
      '      if (index > -1) this.keys.splice(index, 1);',
      '    });',
      '  }',
      '}',
    ].join('\n')
    const { code, raws } = roundtrip(src)
    expect(raws).toEqual([])
    expect(code).toContain('event.key')
    expect(code).not.toMatch(/\be\.key\b/)
  })

  it('param já chamado event segue como sempre; sem param idem', () => {
    const { raws } = roundtrip(
      "document.addEventListener('keydown', (event) => { if (event.key === 'a') console.log('ok'); });",
    )
    expect(raws).toEqual([])
    const { raws: raws2 } = roundtrip("document.addEventListener('click', () => { alert('oi'); });")
    expect(raws2).toEqual([])
  })

  it('inseguro cai em rawJS: shadowing, escrita no param, colisão com event', () => {
    // Re-declara o nome dentro do corpo.
    const shadowed = parseJS(
      "document.addEventListener('keydown', e => { let e2 = 1; const e = e2; console.log(e); });",
    )
    expect(collectRaw(shadowed).length).toBe(1)
    // Escreve no param.
    const written = parseJS("document.addEventListener('keydown', e => { e = null; });")
    expect(collectRaw(written).length).toBe(1)
    // Corpo já usa o identificador `event` (renomear colidiria).
    const collides = parseJS(
      "document.addEventListener('keydown', e => { console.log(event); console.log(e.key); });",
    )
    expect(collectRaw(collides).length).toBe(1)
    // 2 parâmetros.
    const twoParams = parseJS("document.addEventListener('keydown', (e, extra) => { });")
    expect(collectRaw(twoParams).length).toBe(1)
  })
})

describe('loop de animação DENTRO do load não é elevado', () => {
  it('function animate + RAF dentro do load ficam dentro do load (fixpoint)', () => {
    const src = [
      "window.addEventListener('load', function () {",
      "  const canvas = document.getElementById('tela1');",
      "  const ctx = canvas.getContext('2d');",
      '  function animate() {',
      '    ctx.clearRect(0, 0, canvas.width, canvas.height);',
      '    requestAnimationFrame(animate);',
      '  }',
      '  animate();',
      '});',
    ].join('\n')
    const { code, raws } = roundtrip(src)
    expect(raws).toEqual([])
    // O loop (function frame/RAF) vive DENTRO do listener de load.
    const loadStart = code.indexOf('addEventListener("load"')
    expect(loadStart).toBeGreaterThan(-1)
    const fnIndex = code.indexOf('function ')
    expect(fnIndex).toBeGreaterThan(loadStart)
    expect(code).toContain('requestAnimationFrame')
  })

  it('loop dentro de um CLICK continua sendo elevado (comportamento histórico)', () => {
    const src = [
      "document.addEventListener('click', () => {",
      '  function girar() {',
      '    console.log(1);',
      '    requestAnimationFrame(girar);',
      '  }',
      '  girar();',
      '});',
    ].join('\n')
    const ir = parseJS(src)
    const code = generateJS({ statements: ir })
    // O hoisting move o loop para FORA do listener (top-level).
    const clickStart = code.indexOf('addEventListener("click"')
    const fnIndex = code.indexOf('function ')
    expect(clickStart).toBeGreaterThan(-1)
    expect(fnIndex).toBeGreaterThan(clickStart)
  })
})
