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

  it('trava __szLoopTick: reatribuir não desliga o orçamento (#15)', () => {
    // Executa o runtime contra um `window` isolado (não mexe no global do teste)
    // com um relógio controlado, depois tenta SABOTAR a guarda reatribuindo
    // window.__szLoopTick e prova que o orçamento ainda corta o laço.
    let clock = 0
    const fakeWindow: Record<string, unknown> = {
      setTimeout: () => 0, // pump no-op: o orçamento nunca reseta no teste
    }
    const ctx = {
      window: fakeWindow,
      performance: { now: () => clock },
      setTimeout: () => 0,
    }
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    new Function('window', 'performance', 'setTimeout', buildLoopGuardRuntime(100))(
      ctx.window,
      ctx.performance,
      ctx.setTimeout,
    )

    // O tick foi instalado e está travado (writable:false/configurable:false).
    const tick = fakeWindow.__szLoopTick as () => void
    expect(typeof tick).toBe('function')
    const desc = Object.getOwnPropertyDescriptor(fakeWindow, '__szLoopTick')
    expect(desc?.writable).toBe(false)
    expect(desc?.configurable).toBe(false)

    // Sabotagem: o aluno tenta neutralizar a guarda. Em strict mode lançaria;
    // em sloppy mode a atribuição é silenciosamente ignorada. Em ambos, o tick
    // permanece o original.
    try {
      ;(fakeWindow as { __szLoopTick: unknown }).__szLoopTick = () => {}
    } catch {
      // strict mode: atribuição em propriedade não-gravável lança — esperado.
    }
    expect(fakeWindow.__szLoopTick).toBe(tick)

    // O orçamento continua valendo: 1º tick fixa o início, e um tick após estourar
    // o orçamento (sem o pump rodar) lança o erro marcado com __szLoopGuard.
    const guarded = fakeWindow.__szLoopTick as () => void
    clock = 0
    guarded() // start = 0
    clock = 500 // 500 > BUDGET(100)
    let thrown: unknown
    try {
      guarded()
    } catch (e) {
      thrown = e
    }
    expect((thrown as { __szLoopGuard?: boolean })?.__szLoopGuard).toBe(true)
  })
})
