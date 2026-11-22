import { expect, type Page, test } from '@playwright/test'
import type {} from '../../../experiments/studio-python-runtime/providerHost'

test.beforeEach(async ({ page, request }, testInfo) => {
  await testInfo.attach('runtime-distribution', {
    body: await (await request.get('/distribution')).body(),
    contentType: 'application/json',
  })
  await page.goto('/provider')
  await page.waitForFunction(() => !!globalThis.providerProbe)
})
async function prepare(page: Page, slot: string, fixture: string) {
  await page.evaluate(({ slot, fixture }) => globalThis.providerProbe.prepare(slot, fixture), {
    slot,
    fixture,
  })
  expect(await page.evaluate((slot) => globalThis.providerProbe.read(slot).status, slot)).toBe(
    'ready',
  )
}
async function completed(page: Page, slot: string) {
  await page.waitForFunction(
    (slot) => ['completed', 'failed'].includes(globalThis.providerProbe.read(slot).status),
    slot,
  )
  expect(await page.evaluate((slot) => globalThis.providerProbe.read(slot).status, slot)).toBe(
    'completed',
  )
}

for (const fixture of ['portable', 'turtleDrawing'])
  test(`${fixture}: prepares and executes under strict CSP without validation eval probes`, async ({
    page,
  }, info) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(String(error)))
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text())
    })
    const failures: unknown[] = []
    try {
      await prepare(page, 'csp-validation', fixture)
      await page.evaluate(() => globalThis.providerProbe.run('csp-validation'))
      await completed(page, 'csp-validation')
    } catch (error) {
      failures.push(error)
    }
    try {
      await info.attach('strict-csp-validation', {
        body: JSON.stringify({
          fixture,
          errors,
          state: await page.evaluate(() => globalThis.providerProbe.read('csp-validation')),
        }),
        contentType: 'application/json',
      })
    } catch (error) {
      failures.push(error)
    }
    try {
      await page.evaluate(() => globalThis.providerProbe.dispose('csp-validation'))
      expect(errors).toEqual([])
    } catch (error) {
      failures.push(error)
    }
    if (failures.length)
      throw new AggregateError(
        failures,
        failures
          .map((error) => (error instanceof Error ? error.message : String(error)))
          .join('\n'),
      )
  })

for (const fixture of ['turtleDrawing', 'classic-turtleDrawing'])
  test(`${fixture}: captures presented pixels with the current revision and refuses capture after Stop`, async ({
    page,
  }, testInfo) => {
    await prepare(page, 'capture', fixture)
    expect(await page.evaluate(() => globalThis.providerProbe.capture('capture'))).toBeNull()
    await page.evaluate(() => globalThis.providerProbe.run('capture'))
    await page.waitForFunction(() =>
      globalThis.providerProbe
        .read('capture')
        .events.some((event) => event.type === 'console' && event.text.includes('drawing-ready')),
    )
    const snapshot = await page.evaluate(() => globalThis.providerProbe.capture('capture'))
    expect(snapshot).not.toBeNull()
    expect(snapshot!.identity).toEqual(
      await page.evaluate(() => globalThis.providerProbe.read('capture').events[0]!.identity),
    )
    expect(snapshot!.width).toBe(400)
    expect(snapshot!.height).toBe(300)
    expect(snapshot!.frameSequence).toBeGreaterThan(0)
    const pixel = await page.evaluate(async (dataUrl) => {
      const image = new Image()
      image.src = dataUrl
      await image.decode()
      const canvas = document.createElement('canvas')
      canvas.width = image.width
      canvas.height = image.height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(image, 0, 0)
      return [...ctx.getImageData(250, 150, 1, 1).data]
    }, snapshot!.dataUrl)
    expect(pixel).toEqual([255, 0, 0, 255])
    await testInfo.attach('captured-turtle', {
      body: Buffer.from(snapshot!.dataUrl.split(',')[1]!, 'base64'),
      contentType: 'image/png',
    })
    await page.evaluate(() => globalThis.providerProbe.stop('capture'))
    const stopped = await page.evaluate(async () => {
      try {
        await globalThis.providerProbe.capture('capture')
        return false
      } catch {
        return true
      }
    })
    expect(stopped).toBe(true)
    await prepare(page, 'capture', 'portable')
    await page.evaluate(() => globalThis.providerProbe.run('capture'))
    await completed(page, 'capture')
    expect(await page.evaluate(() => globalThis.providerProbe.capture('capture'))).toBeNull()
    await page.evaluate(() => globalThis.providerProbe.dispose('capture'))
  })
test('Stop cancels a capture while the browser is still encoding it', async ({ page }) => {
  await prepare(page, 'capture', 'turtleDrawing')
  await page.evaluate(() => globalThis.providerProbe.run('capture'))
  await page.waitForFunction(() =>
    globalThis.providerProbe
      .read('capture')
      .events.some((event) => event.type === 'console' && event.text.includes('drawing-ready')),
  )
  const frame = page.frames().find((candidate) => candidate.url().includes('/frame.html'))!
  await frame.evaluate(() => {
    const original = HTMLCanvasElement.prototype.toBlob
    HTMLCanvasElement.prototype.toBlob = function (callback, ...options) {
      performance.mark('encoding-started')
      // Delay only completion of a real native encode to make the lifecycle race deterministic.
      return original.call(this, (blob) => setTimeout(() => callback(blob), 500), ...options)
    }
  })
  const pending = page.evaluate(async () => {
    try {
      await globalThis.providerProbe.capture('capture')
      return 'accepted'
    } catch {
      return 'cancelled'
    }
  })
  await frame.waitForFunction(() => performance.getEntriesByName('encoding-started').length === 1)
  const elapsed = await page.evaluate(async () => {
    const start = performance.now()
    await globalThis.providerProbe.stop('capture')
    return performance.now() - start
  })
  expect(elapsed).toBeLessThanOrEqual(250)
  expect(await pending).toBe('cancelled')
  const events = await page.evaluate(() => globalThis.providerProbe.read('capture').events)
  expect(events.at(-1)).toMatchObject({ type: 'state', state: 'stopped' })
  await prepare(page, 'capture', 'portable')
  await page.evaluate(() => globalThis.providerProbe.run('capture'))
  await completed(page, 'capture')
  const next = await page.evaluate(() => globalThis.providerProbe.read('capture').events)
  expect(next.every((event) => event.identity.runId !== events[0]!.identity.runId)).toBe(true)
  await page.evaluate(() => globalThis.providerProbe.dispose('capture'))
})

test('the provider binds snapshots and runs independent sessions with separate REPL state', async ({
  page,
}) => {
  await prepare(page, 'first', 'portable')
  await prepare(page, 'second', 'portable')
  await page.evaluate(() =>
    Promise.all([globalThis.providerProbe.run('first'), globalThis.providerProbe.run('second')]),
  )
  await completed(page, 'first')
  await completed(page, 'second')
  await page.evaluate(() =>
    globalThis.providerProbe.evaluate('first', 'change', 'value = 99\ncurrent()'),
  )
  await page.waitForFunction(() =>
    globalThis.providerProbe.read('first').events.some((event) => event.type === 'repl-result'),
  )
  await page.evaluate(() => globalThis.providerProbe.evaluate('second', 'read', 'current()'))
  await page.waitForFunction(() =>
    globalThis.providerProbe.read('second').events.some((event) => event.type === 'repl-result'),
  )
  const [first, second] = await page.evaluate(() => [
    globalThis.providerProbe.read('first'),
    globalThis.providerProbe.read('second'),
  ])
  expect(first!.events.find((event) => event.type === 'repl-result')).toMatchObject({ text: '99' })
  expect(second!.events.find((event) => event.type === 'repl-result')).toMatchObject({ text: '7' })
  expect(first!.events[0]!.identity.runId).not.toBe(second!.events[0]!.identity.runId)
  expect(first!.events.map((event) => event.sequence)).toEqual(
    // Sequence belongs to the session, including ready before subscribe.
    first!.events.map((_, index) => index + first!.events[0]!.sequence),
  )
  await page.evaluate(() =>
    Promise.all([
      globalThis.providerProbe.dispose('first'),
      globalThis.providerProbe.dispose('second'),
    ]),
  )
})
test('stop revokes host events and restart creates a fresh generation', async ({ page }) => {
  await prepare(page, 'game', 'loop')
  await page.evaluate(() => globalThis.providerProbe.run('game'))
  await page.waitForFunction(() =>
    globalThis.providerProbe
      .read('game')
      .events.some((event) => event.type === 'console' && event.text === 'loop-started'),
  )
  const stopped = await page.evaluate(async () => {
    const start = performance.now()
    await Promise.all([
      globalThis.providerProbe.stop('game'),
      globalThis.providerProbe.stop('game'),
    ])
    return { ms: performance.now() - start, state: globalThis.providerProbe.read('game') }
  })
  expect(stopped.ms).toBeLessThanOrEqual(250)
  expect(stopped.state.events.at(-1)).toMatchObject({ type: 'state', state: 'stopped' })
  const oldRun = stopped.state.events[0]!.identity.runId
  await prepare(page, 'game', 'portable')
  await page.evaluate(() => globalThis.providerProbe.run('game'))
  await completed(page, 'game')
  const next = await page.evaluate(() => globalThis.providerProbe.read('game'))
  expect(next.events.every((event) => event.identity.runId !== oldRun)).toBe(true)
  await page.evaluate(() => globalThis.providerProbe.dispose('game'))
})
test('abort during prepare never returns a usable session', async ({ page }) => {
  await page.evaluate(() => {
    void globalThis.providerProbe.prepare('cancelled', 'portable')
  })
  await page.waitForFunction(() =>
    globalThis.providerProbe.read('cancelled').frameURL.includes('/v1/runtimes/'),
  )
  expect(await page.evaluate(() => globalThis.providerProbe.read('cancelled').status)).toBe(
    'loading',
  )
  await page.evaluate(() => globalThis.providerProbe.cancel('cancelled'))
  await page.waitForFunction(() => globalThis.providerProbe.read('cancelled').status === 'failed')
  expect(await page.evaluate(() => globalThis.providerProbe.read('cancelled').events)).toEqual([])
  await page.evaluate(() => globalThis.providerProbe.dispose('cancelled'))
})
test('provider rejects mismatched content before starting a frame', async ({ page }) => {
  await page.evaluate(() => globalThis.providerProbe.prepare('mismatch', 'portable', true))
  const state = await page.evaluate(() => globalThis.providerProbe.read('mismatch'))
  expect(state.status).toBe('failed')
  expect(state.error).toContain('mudou')
  expect(state.events).toEqual([])
  expect(state.frameURL).toBe('')
})
test('overlapping reuse of a frame is rejected without disturbing its owner', async ({ page }) => {
  await prepare(page, 'owner', 'portable')
  expect(await page.evaluate(() => globalThis.providerProbe.overlap('owner'))).toContain('Encerre')
  await page.evaluate(() => globalThis.providerProbe.run('owner'))
  await completed(page, 'owner')
  await page.evaluate(() => globalThis.providerProbe.dispose('owner'))
})
test('abort while waiting for input revokes the session immediately', async ({ page }) => {
  await prepare(page, 'waiting', 'waiting')
  await page.evaluate(() => globalThis.providerProbe.run('waiting'))
  await page.waitForFunction(
    () => globalThis.providerProbe.read('waiting').status === 'waiting-input',
  )
  await page.evaluate(() => globalThis.providerProbe.cancel('waiting'))
  expect(
    await page.evaluate(() => globalThis.providerProbe.read('waiting').events.at(-1)),
  ).toMatchObject({ type: 'state', state: 'stopped' })
  const result = await page.evaluate(async () => {
    try {
      await globalThis.providerProbe.input('waiting', 'input-1', { kind: 'line', text: 'late' })
      return 'accepted'
    } catch {
      return 'rejected'
    }
  })
  expect(result).toBe('rejected')
  await page.evaluate(() => globalThis.providerProbe.dispose('waiting'))
})
test('provider delivers lines and EOF without evaluating input as code', async ({ page }) => {
  await prepare(page, 'input', 'input')
  await page.evaluate(() => globalThis.providerProbe.run('input'))
  for (const [index, response] of [
    { kind: 'line' as const, text: "print('não executar')" },
    { kind: 'line' as const, text: '' },
    { kind: 'eof' as const },
  ].entries()) {
    const id = `input-${index + 1}`
    await page.waitForFunction(
      (id) =>
        globalThis.providerProbe
          .read('input')
          .events.some((event) => event.type === 'input-request' && event.requestId === id),
      id,
    )
    await page.evaluate(
      ({ id, response }) => globalThis.providerProbe.input('input', id, response),
      { id, response },
    )
  }
  await completed(page, 'input')
  expect(
    await page.evaluate(() =>
      globalThis.providerProbe
        .read('input')
        .events.flatMap((event) => (event.type === 'console' ? [event.text] : []))
        .join(''),
    ),
  ).toBe("Nome: primeiro: \"print('não executar')\"\nvazio: ''\nEOF\n")
})
test('a aba Desempenho: o quadro conta os quadros pintados do jogo e para quando desliga', async ({
  page,
}) => {
  await prepare(page, 'perf', 'pgzeroGame')
  await page.locator('iframe').evaluate((frame) => {
    frame.style.cssText = 'width:640px;height:480px;border:0'
  })
  await page.evaluate(() => globalThis.providerProbe.run('perf'))
  await page.evaluate(() => globalThis.providerProbe.measure('perf', true))
  const drawn = () =>
    page.evaluate(
      () =>
        globalThis.providerProbe.read('perf').perf.filter((slice) => slice.canvas && slice.fps > 0)
          .length,
    )
  await expect.poll(drawn, { timeout: 30_000 }).toBeGreaterThan(1)
  const last = (await page.evaluate(() => globalThis.providerProbe.read('perf').perf)).at(-1)
  expect(last?.canvas).toBe(true)
  expect(last?.frameMsAvg).toBeGreaterThan(0)
  // Desligada, o quadro para de mandar fatias.
  await page.evaluate(() => globalThis.providerProbe.measure('perf', false))
  const before = await page.evaluate(() => globalThis.providerProbe.read('perf').perf.length)
  await page.waitForTimeout(1200)
  expect(await page.evaluate(() => globalThis.providerProbe.read('perf').perf.length)).toBe(before)
  await page.evaluate(() => globalThis.providerProbe.dispose('perf'))
})
test('a aba Desempenho num programa sem tela: as fatias dizem que não há quadros', async ({
  page,
}) => {
  await prepare(page, 'perf-text', 'loop')
  await page.evaluate(() => globalThis.providerProbe.run('perf-text'))
  await page.evaluate(() => globalThis.providerProbe.measure('perf-text', true))
  await expect
    .poll(() => page.evaluate(() => globalThis.providerProbe.read('perf-text').perf.length), {
      timeout: 10_000,
    })
    .toBeGreaterThan(0)
  expect(await page.evaluate(() => globalThis.providerProbe.read('perf-text').perf[0])).toEqual({
    fps: 0,
    frameMsAvg: 0,
    frameMsMax: 0,
    canvas: false,
  })
  await page.evaluate(() => globalThis.providerProbe.dispose('perf-text'))
})

test('Meus testes: o quadro do Python aperta a tecla do teste e o jogo responde', async ({
  page,
}) => {
  await page.evaluate(() =>
    globalThis.pythonControllerProbe.create('teclas', 'pgzeroGame', { observation: true }),
  )
  await page.evaluate(() => globalThis.pythonControllerProbe.run('teclas'))
  await expect
    .poll(() => page.evaluate(() => globalThis.pythonControllerProbe.read('teclas').status), {
      timeout: 40_000,
    })
    .toBe('running')
  const read = async (path: string) => {
    const { observation } = await page.evaluate(
      (path) => globalThis.pythonControllerProbe.observe('teclas', path),
      path,
    )
    if (observation.type !== 'value' || !observation.observed.found) throw new Error(path)
    return Number(observation.observed.value)
  }
  const press = (key: string, down: boolean) =>
    page.evaluate(([key, down]) => globalThis.pythonControllerProbe.pressKey('teclas', key, down), [
      key,
      down,
    ] as const)
  // Espaço: o `on_key_down` do jogo soma um ponto.
  expect(await read('pontos')).toBe(0)
  await press('Space', true)
  await press('Space', false)
  await expect.poll(() => read('pontos')).toBe(1)
  // Seta segurada: o `keyboard.right` do jogo anda com o herói enquanto a tecla está apertada.
  const before = await read('heroi.x')
  await press('ArrowRight', true)
  await expect.poll(() => read('heroi.x')).toBeGreaterThan(before)
  await press('ArrowRight', false)
  const stopped = await read('heroi.x')
  await page.waitForTimeout(300)
  expect(await read('heroi.x')).toBe(stopped)
  // A função do jogo, chamada no quadro (o `marcar()` responde None).
  expect(
    (await page.evaluate(() => globalThis.pythonControllerProbe.call('teclas', 'marcar', [[]])))
      .observation,
  ).toEqual({ id: 'chamada', type: 'functionReturns', cases: [{ ok: true, value: null }] })
  await page.evaluate(() => globalThis.pythonControllerProbe.stop('teclas'))
})

test('Meus testes: o executor testa uma função do Python clássico numa execução escondida', async ({
  page,
}) => {
  const run = (expected: number) =>
    page.evaluate(
      (expected) =>
        globalThis.pythonControllerProbe.studentTest('classic-portable', {
          id: 'atual',
          name: 'O valor atual',
          rule: { type: 'functionReturns', name: 'current', cases: [{ args: [], expected }] },
        }),
      expected,
    )
  const certo = await run(7)
  expect(certo.status).toBe('passed')
  const errado = await run(8)
  expect(errado.status).toBe('failed')
  if (errado.status === 'failed') expect(errado.detail).toContain('respondeu 7')
  // A execução escondida sai da página no fim.
  expect(await page.locator('iframe[title="Teste do programa"]').count()).toBe(0)
})

/**
 * Os casos da aba Meus testes no Python (lote 3 da conclusão, 22/11/2026), pelo executor inteiro
 * da aba numa execução escondida: chave, porta, vida, placar e fim num jogo de Pygame Zero, o
 * programa que não compila e o jogo que trava. O par JavaScript mora em
 * `e2e/student-tests.spec.ts` e `e2e/student-tests-hostile.spec.ts`; a frase que a criança lê sai da
 * mesma régua (`studentTestsText.ts`): erro do programa vira "o jogo deu erro durante o teste" e o
 * prazo vira "o jogo não respondeu a tempo".
 */
const PYTHON_CASES = [
  {
    name: 'A seta leva até a chave',
    steps: [{ action: 'press', key: 'ArrowRight', holdMs: 1000 }],
    expect: { target: { kind: 'value', path: 'tem_chave' }, compare: 'equals', value: true },
    status: 'passed',
  },
  {
    name: 'Com a chave a porta abre',
    steps: [{ action: 'press', key: 'ArrowRight', holdMs: 1500 }],
    expect: { target: { kind: 'value', path: 'porta_aberta' }, compare: 'equals', value: true },
    status: 'passed',
  },
  {
    name: 'Espaço abre a porta',
    steps: [{ action: 'press', key: 'Space' }],
    expect: { target: { kind: 'value', path: 'porta_aberta' }, compare: 'equals', value: true },
    status: 'failed',
  },
  {
    name: 'Parado no começo perde vida',
    steps: [{ action: 'wait', ms: 1500 }],
    expect: { target: { kind: 'value', path: 'vidas' }, compare: 'decreased' },
    status: 'passed',
  },
  {
    name: 'Espaço marca ponto',
    steps: [{ action: 'press', key: 'Space' }],
    expect: { target: { kind: 'value', path: 'pontos' }, compare: 'increased' },
    status: 'passed',
  },
  {
    name: 'Sem vidas o jogo acaba',
    steps: [{ action: 'wait', ms: 4500 }],
    expect: { target: { kind: 'value', path: 'fim' }, compare: 'equals', value: true },
    status: 'passed',
  },
] as const

const studentTest = (page: Page, fixture: string, item: (typeof PYTHON_CASES)[number]) =>
  page.evaluate(
    ({ fixture, item }) =>
      globalThis.pythonControllerProbe.studentTest(fixture, {
        id: 'caso',
        name: item.name,
        rule: { type: 'behavior', steps: item.steps, expect: item.expect },
      } as never),
    { fixture, item },
  )

test('Meus testes no Pygame Zero: chave, porta, vida, placar e fim', async ({ page }) => {
  test.setTimeout(300_000)
  for (const item of PYTHON_CASES) {
    const outcome = await studentTest(page, 'classic-pgzeroCasos', item)
    expect(outcome.status, item.name).toBe(item.status)
  }
  expect(await page.locator('iframe[title="Teste do programa"]').count()).toBe(0)
})

test('Meus testes no Python: o programa que não compila conta o erro, e o que trava não segura o teste', async ({
  page,
}) => {
  test.setTimeout(240_000)
  const ponto = PYTHON_CASES[4]
  const quebrado = await studentTest(page, 'classic-pgzeroErroDeEscrita', ponto)
  // O mesmo caminho do JavaScript: o teste não passa e a observação traz o erro do programa (a aba
  // diz "o jogo deu erro durante o teste").
  expect(quebrado.status).toBe('failed')
  if (quebrado.status === 'failed')
    expect(
      Boolean(quebrado.observation.error) || (quebrado.observation.errors?.length ?? 0) > 0,
    ).toBe(true)
  const travado = await studentTest(page, 'classic-pgzeroTrava', ponto)
  expect(travado.status).toBe('timeout')
  expect(await page.locator('iframe[title="Teste do programa"]').count()).toBe(0)
})

test('Investigar: o controlador no modo de observação lê as variáveis do jogo a cada quadro', async ({
  page,
}) => {
  await page.evaluate(() =>
    globalThis.pythonControllerProbe.create('investigar', 'pgzeroGame', { observation: true }),
  )
  await page.evaluate(() => globalThis.pythonControllerProbe.run('investigar'))
  await expect
    .poll(() => page.evaluate(() => globalThis.pythonControllerProbe.read('investigar').status), {
      timeout: 40_000,
    })
    .toBe('running')
  const read = (path: string) =>
    page.evaluate((path) => globalThis.pythonControllerProbe.observe('investigar', path), path)
  expect((await read('WIDTH')).observation).toEqual({
    type: 'value',
    observed: { found: true, value: 320 },
  })
  const first = (await read('quadros')).observation
  const second = (await read('quadros')).observation
  if (first.type !== 'value' || second.type !== 'value') throw new Error('valor esperado')
  expect(Number(second.observed.value)).toBeGreaterThan(Number(first.observed.value))
  expect((await read('nao_existe')).observation).toEqual({
    type: 'value',
    observed: { found: false },
  })
  await page.evaluate(() => globalThis.pythonControllerProbe.stop('investigar'))
})

test('Investigar: Pausar segura o jogo no quadro, Avançar anda 1 quadro e Continuar solta', async ({
  page,
}) => {
  await page.evaluate(() =>
    globalThis.pythonControllerProbe.create('pausa', 'pgzeroGame', { observation: true }),
  )
  await page.evaluate(() => globalThis.pythonControllerProbe.run('pausa'))
  await expect
    .poll(() => page.evaluate(() => globalThis.pythonControllerProbe.read('pausa').status), {
      timeout: 40_000,
    })
    .toBe('running')
  const quadros = async () => {
    const { observation } = await page.evaluate(() =>
      globalThis.pythonControllerProbe.observe('pausa', 'quadros'),
    )
    if (observation.type !== 'value' || !observation.observed.found) throw new Error('quadros')
    return Number(observation.observed.value)
  }
  const held = await page.evaluate(() => globalThis.pythonControllerProbe.pause('pausa', true))
  if (!held) throw new Error('O jogo não parou no quadro.')
  // Parado: as leituras dos valores são respondidas, e o jogo não anda.
  const parado = await quadros()
  await page.waitForTimeout(300)
  expect(await quadros()).toBe(parado)
  const next = await page.evaluate(() => globalThis.pythonControllerProbe.step('pausa'))
  if (!next) throw new Error('O jogo não parou de novo depois de avançar.')
  expect(next.frame).toBeGreaterThan(held.frame)
  const avancou = await quadros()
  expect(avancou).toBeGreaterThan(parado)
  await page.waitForTimeout(300)
  expect(await quadros()).toBe(avancou)
  expect(await page.evaluate(() => globalThis.pythonControllerProbe.pause('pausa', false))).toBe(
    null,
  )
  await expect.poll(quadros).toBeGreaterThan(avancou)
  await page.evaluate(() => globalThis.pythonControllerProbe.stop('pausa'))
})

test('Investigar: o Turtle parado no mainloop pausa na próxima resposta e responde as leituras', async ({
  page,
}) => {
  await page.evaluate(() =>
    globalThis.pythonControllerProbe.create('tartaruga', 'turtleEvents', { observation: true }),
  )
  // O desenho anda cinco passos e fica parado no mainloop, sem relógio nenhum: só a espera
  // acordada pelo quadro devolve uma resposta.
  await page.evaluate(() =>
    globalThis.pythonControllerProbe.source(
      'tartaruga',
      [
        'import turtle',
        's = turtle.Screen()',
        's.tracer(0)',
        't = turtle.Turtle()',
        'passos = 0',
        'def andar():',
        '    global passos',
        '    passos += 1',
        '    t.forward(10)',
        '    s.update()',
        '    if passos < 5:',
        '        s.ontimer(andar, 20)',
        'andar()',
        's.mainloop()',
        '',
      ].join('\n'),
    ),
  )
  await page.evaluate(() => globalThis.pythonControllerProbe.run('tartaruga'))
  await expect
    .poll(() => page.evaluate(() => globalThis.pythonControllerProbe.read('tartaruga').status), {
      timeout: 40_000,
    })
    .toBe('running')
  const passos = async () => {
    const { observation } = await page.evaluate(() =>
      globalThis.pythonControllerProbe.observe('tartaruga', 'passos'),
    )
    if (observation.type !== 'value') throw new Error('passos')
    // A tartaruga já checa ao nascer: antes de `passos = 0` a leitura responde que não achou.
    return observation.observed.found ? Number(observation.observed.value) : null
  }
  await expect.poll(passos, { timeout: 10_000 }).toBe(5)
  const held = await page.evaluate(() => globalThis.pythonControllerProbe.pause('tartaruga', true))
  expect(held).not.toBeNull()
  expect(await passos()).toBe(5)
  expect(
    await page.evaluate(() => globalThis.pythonControllerProbe.pause('tartaruga', false)),
  ).toBe(null)
  expect(await page.evaluate(() => globalThis.pythonControllerProbe.read('tartaruga').status)).toBe(
    'running',
  )
  await page.evaluate(() => globalThis.pythonControllerProbe.stop('tartaruga'))
})
