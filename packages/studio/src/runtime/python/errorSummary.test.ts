import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { PYTHON_PROJECT_ROOT, summarizePythonError } from './errorSummary'

const trace = (...lines: string[]) => `Traceback (most recent call last):\n${lines.join('\n')}\n`

test('the line is the last frame in the child files, even when a library raises', () => {
  const summary = summarizePythonError(
    trace(
      '  File "/studio/project/main.py", line 40, in <module>',
      '  File "/py/pgzero/game.py", line 210, in mainloop',
      '  File "/studio/project/main.py", line 12, in update',
      '    if keyboard.spcae:',
      '  File "/py/pgzero/keyboard.py", line 36, in __getattr__',
      "KeyError: 'SPCAE'",
    ),
    "'SPCAE'",
  )
  expect(summary).toEqual({ path: 'main.py', line: 12, message: "KeyError: 'SPCAE'" })
})

test('a helper module of the project is named by its own path', () => {
  const summary = summarizePythonError(
    trace(
      '  File "/studio/project/main.py", line 3, in <module>',
      '  File "/studio/project/jogo/regras.py", line 7, in pontos',
      "TypeError: unsupported operand type(s) for +: 'int' and 'str'",
    ),
    'x',
  )
  expect(summary.path).toBe('jogo/regras.py')
  expect(summary.line).toBe(7)
  expect(summary.message).toBe("TypeError: unsupported operand type(s) for +: 'int' and 'str'")
})

test('a syntax error points at its line', () => {
  const summary = summarizePythonError(
    '  File "/studio/project/main.py", line 5\n    if x = 1:\n         ^\nSyntaxError: invalid syntax\n',
    'invalid syntax',
  )
  expect(summary).toEqual({ path: 'main.py', line: 5, message: 'SyntaxError: invalid syntax' })
})

test('without a traceback the text stays as it was', () => {
  expect(summarizePythonError('', 'O programa parou.')).toEqual({
    line: 0,
    message: 'O programa parou.',
  })
})

test('the project root is the one the interpreter mounts', () => {
  const interpreter = readFileSync(new URL('./interpreter.ts', import.meta.url), 'utf8')
  expect(interpreter).toContain(`const PROJECT_ROOT = '${PYTHON_PROJECT_ROOT}'`)
})
