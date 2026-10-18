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
    'password = r"family-private-marker with spaces"',
    'password = fr"""family-private-marker with spaces"""',
    'password = t"family-private-marker with spaces"',
    'password = """family-private-marker unfinished',
  ]) {
    const original = `${source}\nprint("public value")\n`
    const redacted = redactStudioTutorSecrets(original)
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
