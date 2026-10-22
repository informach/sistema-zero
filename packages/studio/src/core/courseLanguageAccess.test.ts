import { expect, test } from 'bun:test'
import { hasStudioLanguageAchievement } from './courseLanguageAccess'

test('a known achievement belongs only to its catalog language', () => {
  expect(hasStudioLanguageAchievement('javascript', ['sz_js_array_push'])).toBe(true)
  expect(hasStudioLanguageAchievement('python', ['sz_js_array_push'])).toBe(false)
  expect(hasStudioLanguageAchievement('python', ['sz_py_pass'])).toBe(true)
  expect(hasStudioLanguageAchievement('javascript', ['sz_py_pass'])).toBe(false)
  for (const language of ['javascript', 'python'] as const) {
    expect(hasStudioLanguageAchievement(language, [])).toBe(false)
    expect(hasStudioLanguageAchievement(language, ['sz_js_unknown', 'sz_py_unknown'])).toBe(false)
    expect(hasStudioLanguageAchievement(language, ['sz_js_array_push', 'sz_py_pass'])).toBe(true)
  }
})
