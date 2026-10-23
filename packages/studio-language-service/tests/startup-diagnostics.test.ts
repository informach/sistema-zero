import { expect, test } from 'bun:test'
import { languageStartupDiagnostic } from '../src/startup-diagnostics'

test('startup diagnostics expose only closed classifications, never SDK secrets', () => {
  const secret = 'private-token-and-source-that-must-not-be-logged'
  const error = Object.assign(new TypeError(`process.waitForPort is not a function ${secret}`), {
    code: 'PROCESS_ERROR',
    context: { env: { TOKEN: secret } },
  })
  expect(languageStartupDiagnostic(error)).toEqual({
    name: 'TypeError',
    code: 'PROCESS_ERROR',
    reason: 'missing-method',
  })
  expect(JSON.stringify(languageStartupDiagnostic(error))).not.toContain(secret)
  error.name = secret
  error.code = secret
  expect(languageStartupDiagnostic(error)).toEqual({
    name: 'unknown',
    code: 'unknown',
    reason: 'missing-method',
  })
  expect(languageStartupDiagnostic({ code: secret, message: secret })).toEqual({
    name: 'unknown',
    code: 'unknown',
    reason: 'unknown',
  })
  expect(
    languageStartupDiagnostic({
      get code() {
        throw new Error(secret)
      },
    }).code,
  ).toBe('unknown')
})

test('throwing SDK diagnostic properties cannot prevent lease cleanup', () => {
  for (const property of ['name', 'message']) {
    const error = new Error('unclassified')
    Object.defineProperty(error, property, {
      get() {
        throw new Error('private SDK context')
      },
    })
    expect(() => languageStartupDiagnostic(error)).not.toThrow()
    expect(JSON.stringify(languageStartupDiagnostic(error))).not.toContain('private SDK context')
  }
})
