import { expect, test } from '@playwright/test'
import { StudioPythonWebPayloadSchema } from '@sistemazero/core/studio/python-execution-content'
import {
  StudioPythonInspectionReportSchema,
  verifyStudioPythonInspectionReport,
  verifyStudioPythonStructureEvidence,
} from '@sistemazero/core/studio/python-inspection'
import { z } from 'zod'

const outcomeSchema = z.discriminatedUnion('ok', [
  z.strictObject({ ok: z.literal(true), report: StudioPythonInspectionReportSchema }),
  z.strictObject({ ok: z.literal(false), message: z.string() }),
])

for (const scenario of [
  'valid',
  'structure',
  'validbom',
  'syntax',
  'return',
  'yield',
  'ascii',
  'unknown',
  'bom',
  'identifier',
  'corrupt',
])
  test(`isolated CPython inspects exact revision bytes: ${scenario}`, async ({
    page,
    request,
  }, testInfo) => {
    const pageErrors: string[] = []
    page.on('pageerror', (error) => pageErrors.push(error.message))
    await page.goto(`/inspection-probe/${scenario}/`)
    await page.waitForFunction(() => Reflect.has(globalThis, '__studioPythonInspection'))
    const outcome = outcomeSchema.parse(
      await page.evaluate(() => Reflect.get(globalThis, '__studioPythonInspection')),
    )
    await testInfo.attach('inspection', {
      body: JSON.stringify(outcome),
      contentType: 'application/json',
    })
    if (scenario === 'corrupt') {
      expect(outcome.ok).toBe(false)
    } else {
      if (!outcome.ok) throw new Error(outcome.message)
      const payload = StudioPythonWebPayloadSchema.parse(
        await (await request.get(`/inspection-probe/${scenario}/payload.json`)).json(),
      )
      expect(await verifyStudioPythonInspectionReport(outcome.report, payload.snapshot)).toEqual(
        outcome.report,
      )
      expect(outcome.report.pythonVersion).toBe('3.14.2')
      expect(outcome.report.files.find((file) => file.path === 'empty.py')?.status).toBe('passed')
      expect(outcome.report.status).toBe(
        ['valid', 'validbom', 'structure'].includes(scenario) ? 'passed' : 'failed',
      )
      expect(outcome.report.files.find((file) => file.path === 'main.py')?.status).toBe(
        outcome.report.status,
      )
      if (scenario === 'structure') {
        const evidence = await verifyStudioPythonStructureEvidence(outcome.report, payload.snapshot)
        const main = evidence.find((file) => file.path === 'main.py')!.structure
        expect(main.assignedNames).toEqual([
          'Alias',
          'T',
          'U',
          'absent_student_package',
          'jogar',
          'p',
          't',
          'valor',
        ])
        expect(main.definedFunctions).toEqual(['jogar'])
        expect(main.callTargets).toEqual(['RuntimeError', 'factory', 'range', 't.forward'])
        expect(main.usesLoop).toBe(true)
        expect(main.usesConditional).toBe(true)
        expect(evidence.find((file) => file.path === 'empty.py')!.structure.nodesVisited).toBe(1)
      } else expect(outcome.report.files.every((file) => file.structure === undefined)).toBe(true)
    }
    expect(pageErrors).toEqual([])
    await expect(page.locator('iframe')).toHaveCount(0)
    // The valid fixture imports an absent package and raises if executed; compilation must still pass.
    await expect(page.locator('body')).toHaveText('')
  })
