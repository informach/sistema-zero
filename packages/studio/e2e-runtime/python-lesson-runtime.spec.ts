import { expect, test } from '@playwright/test'
import type {} from './fixtures/lessonHost'

for (const kind of ['classic', 'pro'])
  test(`lesson Python ${kind}: real authorization, analysis, Turtle, REPL and revocation`, async ({
    page,
    request,
  }) => {
    await page.goto(`/lesson-probe?kind=${kind}`)
    await expect(page.getByTestId('admission')).toHaveText('ready')
    expect(await page.evaluate(() => globalThis.lessonRuntimeProbe.analyze())).toBe(0)
    await expect(page.getByTestId('analysis')).toHaveText('Module')
    await page.getByRole('button', { name: 'Executar', exact: true }).click()
    await page.waitForFunction(() =>
      globalThis.lessonRuntimeProbe
        .read()
        .events.some((event) => event.type === 'console' && event.text.includes('drawing-ready')),
    )
    const started = await page.evaluate(() => globalThis.lessonRuntimeProbe.read())
    expect(started.view?.identity?.revision).toMatch(/^[a-f0-9]{64}$/)
    expect(started.source.kind).toBe(kind)
    const frame = page.frames().find((value) => value.url().includes('/frame.html'))!
    expect(await frame.locator('canvas').count()).toBeGreaterThan(0)
    expect(await page.evaluate(() => globalThis.lessonRuntimeProbe.capture())).toMatchObject({
      width: 400,
      height: 300,
    })
    if (kind === 'pro') {
      await page.evaluate(() => globalThis.lessonRuntimeProbe.evaluate())
      await page.waitForFunction(() =>
        globalThis.lessonRuntimeProbe
          .read()
          .events.some(
            (event) => event.type === 'repl-result' && event.text.includes('scoped-repl'),
          ),
      )
    }
    const calls = await (await request.get('/lesson-probe/requests')).json()
    expect(calls.map((item: { operation: string }) => item.operation)).toEqual(
      expect.arrayContaining(
        kind === 'pro' ? ['analyze', 'execute', 'python-repl'] : ['analyze', 'execute'],
      ),
    )
    expect(
      calls
        .filter((item: { operation: string }) => item.operation !== 'analyze')
        .every((item: { revision: string }) => item.revision === started.view!.identity!.revision),
    ).toBe(true)
    expect(calls.every((item: { bytes: number }) => item.bytes < 3000)).toBe(true)
    await request.post('/lesson-probe/revoke')
    expect(
      await page.evaluate(() =>
        globalThis.lessonRuntimeProbe.capture().then(
          () => false,
          () => true,
        ),
      ),
    ).toBe(true)
    await expect(page.getByTestId('admission')).toContainText('acesso a esta aula mudou')
    await expect(page.locator('iframe')).toHaveCount(0)
    const stopped = await page.evaluate(() => globalThis.lessonRuntimeProbe.read())
    expect(stopped.source).toEqual(started.source)
    expect(
      await page.evaluate(() =>
        globalThis.lessonRuntimeProbe.analyze().then(
          () => false,
          () => true,
        ),
      ),
    ).toBe(true)
    await page.evaluate(() => globalThis.lessonRuntimeProbe.close())
  })
