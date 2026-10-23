import { expect, test } from 'bun:test'
import { createStudioTutorExcerpts } from './tutorProContext'
import { redactStudioTutorSecrets, studioTutorLineCount } from './tutorSafety'

test('Python quoted, triple, prefixed and annotated credentials are removed before excerpt selection', () => {
  for (const source of [
    'password = "family-private-marker"',
    'password = """family-private-marker"""',
    "password = '''family-private-marker'''",
    'password = """\nfamily-private-marker\nsecond private line\n"""',
    "password = '''\r\nfamily-private-marker\r\n'''",
    'password: str = "family-private-marker"',
    'password: "str" = "family-private-marker"',
    'password: (str) = "family-private-marker"',
    'password: (\n str | None\n) = "family-private-marker"',
    'password: """\nstr\n""" = "family-private-marker"',
    'password: str | None = """family-private-marker"""',
    'password: Annotated[str, "label=type"] = "family-private-marker"',
    'password: tuple[str, str] = "prefix", "family-private-marker"',
    'password = r"family-private-marker with spaces"',
    'password = fr"""family-private-marker with spaces"""',
    'password = t"family-private-marker with spaces"',
    'password = """family-private-marker unfinished',
  ]) {
    const original = `${source}\nprint("public value")\n`
    const redacted = redactStudioTutorSecrets(original, 'python')
    expect(redacted.hadSecret).toBe(true)
    expect(redacted.text).not.toContain('family-private-marker')
    expect(redacted.text).not.toContain('second private line')
    expect(studioTutorLineCount(redacted.text)).toBe(studioTutorLineCount(original))
    const excerpt = createStudioTutorExcerpts(
      { path: 'main.py', content: original },
      { maxChars: 4000 },
    )
    expect(JSON.stringify(excerpt)).not.toContain('family-private-marker')
  }
  expect(
    redactStudioTutorSecrets('const obj = { password: "private", score: 42 };').text,
  ).toContain('score: 42')
  expect(
    redactStudioTutorSecrets('password: str = "private"\nprint("public value")').text,
  ).toContain('print("public value")')
})

test('Python composed credentials cannot leak through partial redaction or a distant excerpt', () => {
  for (const value of [
    '(\n  "family-private-marker"\n)',
    '"prefix" "family-private-marker"',
    '("prefix"\n  "family-private-marker")',
    '"prefix" + \\\n  "family-private-marker"',
    '[\n  "family-private-marker",\n  "second-private-marker",\n]',
    '{\n  "first": "family-private-marker",\n  "second": "second-private-marker",\n}',
    '(\n  # The closing parenthesis here ) is only a comment.\n  "family-private-marker"\n)',
    '123 // int("family-private-marker")',
    '(str(10 // 2) + "family-private-marker")',
    '"prefix", "family-private-marker"',
    '("prefix"), "family-private-marker"',
  ]) {
    const source = `password = ${value}\nprint("public value")\n`
    const redacted = redactStudioTutorSecrets(source, 'python')
    expect(redacted.hadSecret).toBe(true)
    expect(redacted.text).not.toContain('family-private-marker')
    expect(redacted.text).not.toContain('second-private-marker')
    expect(redacted.text).toContain('print("public value")')
    expect(studioTutorLineCount(redacted.text)).toBe(studioTutorLineCount(source))
    const excerpt = createStudioTutorExcerpts(
      { path: 'main.py', content: source },
      { diagnosticLine: source.split('\n').length - 1, maxChars: 4000 },
    )
    expect(JSON.stringify(excerpt)).not.toContain('family-private-marker')
    expect(JSON.stringify(excerpt)).not.toContain('second-private-marker')
  }
  expect(
    redactStudioTutorSecrets('config = {"password": "private", "score": 42}', 'python').text,
  ).toContain('"score": 42')
  for (const key of ['"password"', 'password']) {
    const result = redactStudioTutorSecrets(
      `config = {${key}: "family-private-marker" if flag == 1 else "fallback", "score": 42}`,
      'python',
    )
    expect(result.text).not.toContain('family-private-marker')
    expect(result.text).toContain('"score": 42')
  }
})

test('shared credential redaction retains JavaScript sibling statements and object fields', () => {
  for (const source of [
    'const password = "private"; const score = 42;',
    'const password =\n "private"; const score = 42;',
    'const password = /* label */\n "private"; const score = 42;',
    'const password = "prefix" /* label */ + "private"; const score = 42;',
    'const config = { password: "private", score: 42 };',
    'const config = { password: "private" === value ? "a" : "b", score: 42 };',
    'const config = { "password": value = "private", score: 42 };',
    'const config = { password: ["private", "other-private"], score: 42 };',
    'const password = (\n "private" + "other-private"\n); const score = 42;',
    'const password = "private"; // (\nconst score = 42;',
    'const config = { password: (\n // )\n "private"\n), score: 42 };',
    'const config = { password: (/* ) */ "private"), score: 42 };',
  ]) {
    const result = redactStudioTutorSecrets(source)
    expect(result.text).not.toContain('private')
    expect(result.text).toContain('score')
    expect(result.text).toContain('42')
    expect(studioTutorLineCount(result.text)).toBe(studioTutorLineCount(source))
  }
})
