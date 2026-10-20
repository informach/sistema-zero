import { expect, test } from 'bun:test'
import { EXECUTION_LIMITS, isProjectCheckResponse } from '../src/learning'

test('canonical runtime response accepts true and false verdicts and typed optional diagnostics', () => {
  for (const passed of [true, false]) {
    expect(
      isProjectCheckResponse({
        ok: true,
        results: [{ id: 'contar', passed, detail: 'Observado: 1' }],
        screenshots: { contar: 'anBn' },
      }),
    ).toBe(true)
  }
  for (const code of ['INVALID_REQUEST', 'BUILD_FAILED', 'RATE_LIMITED', 'CHECK_FAILED']) {
    expect(isProjectCheckResponse({ ok: false, code, message: 'Indisponível', output: '' })).toBe(
      true,
    )
  }
})

test('malformed protocol data is not a conclusive false result', () => {
  for (const value of [
    null,
    [],
    {},
    { ok: 'true', results: [] },
    { ok: true, results: [null] },
    { ok: true, results: [{ id: 'contar' }] },
    { ok: true, results: [{ id: 'contar', passed: 'false' }] },
    { ok: true, results: [{ id: '', passed: true }] },
    { ok: true, results: [{ id: 'contar', passed: true, detail: false }] },
    {
      ok: true,
      results: [
        { id: 'contar', passed: false },
        { id: 'contar', passed: true },
      ],
    },
    { ok: true, results: [{ id: 'contar', passed: true }], screenshots: { contar: null } },
    {
      ok: true,
      results: Array.from({ length: EXECUTION_LIMITS.maxObjectives + 1 }, (_, index) => ({
        id: String(index),
        passed: true,
      })),
    },
    { ok: false, code: 'UNKNOWN', message: 'x' },
    { ok: false, code: 'CHECK_FAILED', message: null },
  ])
    expect(isProjectCheckResponse(value)).toBe(false)
})
