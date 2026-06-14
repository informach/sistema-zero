import { describe, expect, it } from 'bun:test'
import { buildLoopGuardRuntime, DEFAULT_LOOP_BUDGET_MS, instrumentLoops } from '../loopGuard'

describe('instrumentLoops', () => {
  it('injeta __szLoopTick no início do corpo de while', () => {
    const out = instrumentLoops('while (true) {\n  faz()\n}')
    expect(out).toContain('__szLoopTick();')
    expect(out.indexOf('__szLoopTick();')).toBeLessThan(out.indexOf('faz()'))
  })

  it('injeta em for clássico e for-of', () => {
    expect(instrumentLoops('for (let i = 0; i < 3; i++) { x() }')).toContain('__szLoopTick();')
    expect(instrumentLoops('for (const a of lista) { x(a) }')).toContain('__szLoopTick();')
  })

  it('embrulha corpo de instrução única em bloco', () => {
    const out = instrumentLoops('while (cond) faz()')
    expect(out).toContain('{__szLoopTick();')
    expect(out).toContain('}')
    // continua válido: faz() dentro do bloco
    expect(out).toContain('faz()')
  })

  it('NÃO toca requestAnimationFrame nem setInterval (não são loops)', () => {
    const raf = 'requestAnimationFrame(function tick(){ desenha(); requestAnimationFrame(tick) })'
    expect(instrumentLoops(raf)).toBe(raf)
    const interval = 'setInterval(() => mover(), 16)'
    expect(instrumentLoops(interval)).toBe(interval)
  })

  it('não altera código sem loop', () => {
    const code = 'const a = 1\nfunction soma(x, y){ return x + y }\nconsole.log(soma(a, 2))'
    expect(instrumentLoops(code)).toBe(code)
  })

  it('preserva o número de linhas (injeção inline)', () => {
    const code = 'while (true) {\n  passo()\n}'
    const out = instrumentLoops(code)
    expect(out.split('\n').length).toBe(code.split('\n').length)
  })

  it('instrumenta loops aninhados (ambos)', () => {
    const out = instrumentLoops('for (let i=0;i<2;i++){ for (let j=0;j<2;j++){ x() } }')
    expect(out.match(/__szLoopTick\(\);/g)?.length).toBe(2)
  })

  it('degrada para o código original quando o parse falha', () => {
    const broken = 'while (true) { faz( '
    expect(instrumentLoops(broken)).toBe(broken)
  })

  it('string vazia volta vazia', () => {
    expect(instrumentLoops('')).toBe('')
  })
})

describe('buildLoopGuardRuntime', () => {
  it('define window.__szLoopTick e embute o orçamento', () => {
    const rt = buildLoopGuardRuntime(1234)
    expect(rt).toContain('window.__szLoopTick')
    expect(rt).toContain('1234')
  })

  it('usa o default quando o orçamento é inválido', () => {
    expect(buildLoopGuardRuntime(0)).toContain(String(DEFAULT_LOOP_BUDGET_MS))
    expect(buildLoopGuardRuntime(Number.NaN)).toContain(String(DEFAULT_LOOP_BUDGET_MS))
  })
})
