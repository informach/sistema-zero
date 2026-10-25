import { expect, test } from 'bun:test'
import { TURTLE_EXTENSION } from '../../runtime/python/turtle/contract'
import { TURTLE_PINTA_SHAPES_SOURCES } from '../../runtime/python/turtle/formasDoPinta.generated'
import { documentFixture } from '../../state/fixtures/projectDocuments'
import { buildPythonSourceFiles } from '../pythonSource'

function turtleProject(main: string, extra: Record<string, string> = {}, turtle = true) {
  const raw = documentFixture('python', 'classic')
  if (raw.programmingLanguage !== 'python' || raw.kind !== 'classic') throw new Error('fixture')
  raw.assets = []
  raw.files = { ...raw.files, [raw.python.entrypoint]: main, ...extra }
  raw.installedExtensions = turtle ? [{ ...TURTLE_EXTENSION, installedAt: 1 }] : []
  return raw
}
const uses = "import turtle\nimport formas_do_pinta\nformas_do_pinta.registrar('assets/nave.svg')\n"

test('a Turtle game that uses Pinta shapes takes formas_do_pinta.py to the computer', async () => {
  const { files } = await buildPythonSourceFiles(turtleProject(uses))
  expect(files['formas_do_pinta.py']).toBe(TURTLE_PINTA_SHAPES_SOURCES['formas_do_pinta.py'])
})

test('a game that does not use it, or has its own file of that name, gets nothing added', async () => {
  const plain = await buildPythonSourceFiles(turtleProject('import turtle\nturtle.forward(10)\n'))
  expect(plain.files['formas_do_pinta.py']).toBeUndefined()
  const own = await buildPythonSourceFiles(
    turtleProject(uses, { 'formas_do_pinta.py': '# minha versão\n' }),
  )
  expect(own.files['formas_do_pinta.py']).toBe('# minha versão\n')
  const withoutTurtle = await buildPythonSourceFiles(turtleProject(uses, {}, false))
  expect(withoutTurtle.files['formas_do_pinta.py']).toBeUndefined()
})
