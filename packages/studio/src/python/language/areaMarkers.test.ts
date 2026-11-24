import { describe, expect, test } from 'bun:test'
import { PYTHON_AREA_BY_KIND, type PythonAreaKind } from '../blocks/areas'
import { planPythonAreaMarkers, pythonAreaMarkerOffsets } from './areaMarkers'
import { assertPythonCommentsPreserved } from './sourceCopies'
import { applyPythonSourceEdits } from './sourceEdits'
import type { PythonParsedDocument } from './types'

const marker = (kind: PythonAreaKind) => PYTHON_AREA_BY_KIND.get(kind)!.marker

/**
 * Documento de teste: cada linha que não é comentário nem vazia é uma linha de topo de uma linha só.
 * Os intervalos são os do texto; a conformidade com o CPython fica nos testes do motor.
 */
function document(source: string): PythonParsedDocument {
  const body: PythonParsedDocument['tree'][] = []
  const tokens: PythonParsedDocument['tokens'] = []
  let offset = 0
  let id = 0
  for (const match of source.matchAll(/([^\r\n]*)(\r\n|\r|\n|$)/g)) {
    const [whole, text] = match
    if (!whole) break
    const start = offset
    const end = start + text!.length
    if (text!.startsWith('#')) tokens.push({ kind: 'COMMENT', text: text!, range: { start, end } })
    else if (text!.trim())
      body.push({ kind: 'Expr', id: String(++id), range: { start, end }, fields: { value: null } })
    offset += whole.length
  }
  return {
    version: 1,
    language: 'python',
    source,
    identity: {
      projectId: 'p',
      instanceId: 'i',
      path: 'main.py',
      revision: 'a'.repeat(64),
      generation: 1,
    },
    tree: { kind: 'Module', fields: { body: body as never, type_ignores: [] } },
    tokens,
    diagnostics: [],
  }
}

function organize(source: string, areas: PythonAreaKind[]) {
  const before = document(source)
  const plan = planPythonAreaMarkers(before, areas)
  const after = applyPythonSourceEdits(
    before,
    { identity: before.identity, source: before.source },
    plan.edits,
    { droppedComments: plan.dropped },
  )
  assertPythonCommentsPreserved(before, document(after), plan.edits, plan.dropped)
  return after
}

describe('comentários de área', () => {
  test('escreve o comentário no começo de cada área com conteúdo', () => {
    expect(
      organize('import a\nX = 1\nY = 2\nprint(X)\n', [
        'libraries',
        'settings',
        'settings',
        'start',
      ]),
    ).toBe(
      `${marker('libraries')}\nimport a\n\n${marker('settings')}\nX = 1\nY = 2\n\n${marker('start')}\nprint(X)\n`,
    )
  })

  test('o arquivo não fica começando com linha em branco depois que um comentário de área sai', () => {
    // Organizar e desfazer: a função voltou para o Ao iniciar, e a separação ficou no topo.
    const source = `\n${marker('start')}\nprint(1)\n${marker('molds')}\npular()\n`
    expect(organize(source, ['start', 'start'])).toBe(`${marker('start')}\nprint(1)\npular()\n`)
    // Depois do shebang, a linha em branco é do autor e fica.
    const shebang = `#!/usr/bin/env python3\n\n${marker('molds')}\nprint(1)\n`
    expect(organize(shebang, ['start'])).toBe(
      `#!/usr/bin/env python3\n\n${marker('start')}\nprint(1)\n`,
    )
  })

  test('o comentário que sai do meio da área leva a separação de cima (nada de linha em branco a mais)', () => {
    // A primeira linha do Ao iniciar trocou de lugar com a segunda (o que a fase 1 deixa).
    const source = `${marker('libraries')}\nimport math\nprint(2)\n\n${marker('start')}\nprint(1)\n`
    expect(organize(source, ['libraries', 'start', 'start'])).toBe(
      `${marker('libraries')}\nimport math\n\n${marker('start')}\nprint(2)\nprint(1)\n`,
    )
    // Uma linha em branco que a criança deixou entre duas linhas da área (sem comentário) fica.
    const own = `${marker('start')}\nprint(1)\n\nprint(2)\n`
    expect(organize(own, ['start', 'start'])).toBe(own)
  })

  test('mantém o que está certo e tira o repetido, o da área errada e o do rodapé', () => {
    const source = [
      marker('start'),
      'import a',
      '',
      marker('libraries'),
      marker('settings'),
      'print(1)',
      marker('loops'),
      '',
    ].join('\n')
    expect(organize(source, ['libraries', 'start'])).toBe(
      [marker('libraries'), 'import a', '', marker('start'), 'print(1)', ''].join('\n'),
    )
  })

  test('não faz nada quando já está tudo no lugar', () => {
    const source = `${marker('libraries')}\nimport a\n\n${marker('start')}\nprint(1)\n`
    expect(planPythonAreaMarkers(document(source), ['libraries', 'start']).edits).toEqual([])
  })

  test('fica acima dos comentários colados à primeira linha da área', () => {
    expect(
      organize('import a\n\n# conta os pontos\n# e mostra\nprint(1)\n', ['libraries', 'start']),
    ).toBe(
      `${marker('libraries')}\nimport a\n\n${marker('start')}\n# conta os pontos\n# e mostra\nprint(1)\n`,
    )
  })

  test('nunca acima do shebang ou da declaração de codificação', () => {
    expect(
      organize('#!/usr/bin/env python\n# -*- coding: utf-8 -*-\nimport a\n', ['libraries']),
    ).toBe(`#!/usr/bin/env python\n# -*- coding: utf-8 -*-\n\n${marker('libraries')}\nimport a\n`)
  })

  test('usa a quebra de linha do arquivo', () => {
    expect(organize('import a\r\nprint(1)\r\n', ['libraries', 'start'])).toBe(
      `${marker('libraries')}\r\nimport a\r\n\r\n${marker('start')}\r\nprint(1)\r\n`,
    )
  })

  test('comentário parecido com o de área, mas escrito à mão, fica como está', () => {
    const source = '# Bibliotecas\nimport a\n'
    expect(pythonAreaMarkerOffsets(document(source)).size).toBe(0)
    expect(organize(source, ['libraries'])).toBe(
      `${marker('libraries')}\n# Bibliotecas\nimport a\n`,
    )
  })

  test('divisão que não bate com as linhas não muda nada', () => {
    expect(planPythonAreaMarkers(document('import a\n'), ['libraries', 'start']).edits).toEqual([])
  })
})

describe('proteção dos comentários', () => {
  test('só o comentário de área pode sair, e só quando a edição pede', () => {
    const source = `# meu\n${marker('start')}\nprint(1)\n`
    const before = document(source)
    const removeLine = (start: number, end: number) => ({
      range: { start, end },
      expected: source.slice(start, end),
      replacement: '',
    })
    const markerStart = source.indexOf(marker('start'))
    const markerEdit = removeLine(markerStart, markerStart + marker('start').length + 1)
    expect(() =>
      applyPythonSourceEdits(before, before, [markerEdit], {
        droppedComments: new Set([markerStart]),
      }),
    ).not.toThrow()
    expect(() => applyPythonSourceEdits(before, before, [markerEdit])).toThrow()
    const mine = removeLine(0, 6)
    expect(() =>
      applyPythonSourceEdits(before, before, [mine], { droppedComments: new Set([0]) }),
    ).toThrow()
  })
})
