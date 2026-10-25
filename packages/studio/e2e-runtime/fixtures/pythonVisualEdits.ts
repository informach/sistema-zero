import { call, expression, moduleNode, name, node, text } from '../../src/python/blocks/nodes'
import { type PythonVisualNode, pythonASTToVisual } from '../../src/python/blocks/projection'
import type { PythonAnalysisSession } from '../../src/python/language/session'
import type { PythonAnalysisIdentity } from '../../src/python/language/types'
import {
  assertPythonVisualTransactionCurrent,
  preparePythonVisualTransaction,
} from '../../src/python/language/visualTransaction'

function walk(
  value: PythonVisualNode,
  visit: (value: Extract<PythonVisualNode, { kind: 'block' }>) => void,
) {
  if (value.kind !== 'block') return
  visit(value)
  for (const input of value.inputs) for (const child of input.nodes) walk(child, visit)
}
export async function provePythonVisualEdits(analysis: PythonAnalysisSession) {
  let generation = 0
  const identity = (): PythonAnalysisIdentity => ({
    projectId: 'visual-edits',
    instanceId: 'fixture',
    path: 'main.py',
    revision: 'c'.repeat(64),
    generation: ++generation,
  })
  const source =
    '# título 🐢\r\ndef soma(valor=2):\r\n    # dentro\r\n    pontos = valor * 3  # placar\r\n    return pontos\r\nprint(soma())\r\n'
  const document = await analysis.parse(identity(), source)
  let current = { identity: document.identity, source: document.source }
  const projection = pythonASTToVisual(document.tree!)
  for (const item of projection.body)
    walk(item, (block) => {
      if (block.codecId === 'sz_py_integer' && block.fields[0]?.value === '3')
        block.fields[0].value = '4'
    })
  const prepared = await preparePythonVisualTransaction({
    document,
    projection,
    nextIdentity: identity(),
    current: () => current,
    analysis,
  })
  const expected = source.replace('valor * 3', 'valor * (4)')
  if (prepared.parsed.source !== expected || prepared.edits.length !== 1)
    throw new Error('A edição local mudou texto fora do valor.')
  assertPythonVisualTransactionCurrent(prepared.expected, current)
  current = { ...current, source: `${source}# mudou\r\n` }
  let staleCommit = false
  try {
    assertPythonVisualTransactionCurrent(prepared.expected, current)
  } catch {
    staleCommit = true
  }
  if (!staleCommit) throw new Error('Uma edição obsoleta poderia substituir o código atual.')
  current = { identity: document.identity, source }
  const reordered = pythonASTToVisual(document.tree!)
  reordered.body.reverse()
  const moved = await preparePythonVisualTransaction({
    document,
    projection: reordered,
    nextIdentity: identity(),
    current: () => current,
    analysis,
  })
  const commentsProtected =
    moved.parsed.source ===
    source
      .replace('def soma(valor=2):', 'print(soma())\r\ndef soma(valor=2):')
      .replace('    return pontos\r\nprint(soma())\r\n', '    return pontos\r\n')
  if (!commentsProtected) throw new Error('A reordenação alterou o texto dos comandos/comentários.')
  const unchanged = await preparePythonVisualTransaction({
    document,
    projection: pythonASTToVisual(document.tree!),
    nextIdentity: identity(),
    current: () => current,
    analysis,
  })
  if (unchanged.parsed.source !== source || unchanged.edits.length)
    throw new Error('Sem mudanças deve conservar a fonte byte a byte.')
  let changedDuringRender = false
  const racingAnalysis: PythonAnalysisSession = {
    ...analysis,
    async render(node, signal) {
      const rendered = await analysis.render(node, signal)
      current = { ...current, source: `${source}# digitado` }
      return rendered
    },
  }
  try {
    await preparePythonVisualTransaction({
      document,
      projection,
      nextIdentity: identity(),
      current: () => current,
      analysis: racingAnalysis,
    })
  } catch (error) {
    changedDuringRender = error instanceof Error && error.message.includes('código mudou')
  }
  if (!changedDuringRender) throw new Error('Digitação concorrente não invalidou a edição visual.')
  const syntax = await analysis.parse(identity(), 'pontos =')
  let invalidSourcePreserved = false
  try {
    await preparePythonVisualTransaction({
      document: syntax,
      projection,
      nextIdentity: identity(),
      current: () => ({ identity: syntax.identity, source: syntax.source }),
      analysis,
    })
  } catch (error) {
    invalidSourcePreserved = error instanceof Error && error.message.includes('sintaxe')
  }
  if (!invalidSourcePreserved) throw new Error('A fonte com erro foi substituída.')
  const nested = await analysis.parse(
    identity(),
    'def f():\n    if True:\n        x = 1 + 2 * 3\n        return x\n',
  )
  current = { identity: nested.identity, source: nested.source }
  const nestedProjection = pythonASTToVisual(nested.tree!)
  for (const item of nestedProjection.body)
    walk(item, (block) => {
      if (block.codecId === 'sz_py_arithmetic' && block.fields[0]?.value === 'Add')
        block.fields[0].value = 'Mult'
    })
  const precedence = await preparePythonVisualTransaction({
    document: nested,
    projection: nestedProjection,
    nextIdentity: identity(),
    current: () => current,
    analysis,
  })
  if (!precedence.parsed.source.includes('x = (1 * (2 * 3))'))
    throw new Error('A edição não preservou a precedência.')
  const interpolation = await analysis.parse(
    identity(),
    'name = "🐢"\nmessage = f"Hello {name}!"\n',
  )
  current = { identity: interpolation.identity, source: interpolation.source }
  const interpolationProjection = pythonASTToVisual(interpolation.tree!)
  for (const item of interpolationProjection.body)
    walk(item, (block) => {
      if (block.codecId === 'sz_py_text' && block.fields[0]?.value === 'Hello ')
        block.fields[0].value = 'Hi '
    })
  const interpolationEdit = await preparePythonVisualTransaction({
    document: interpolation,
    projection: interpolationProjection,
    nextIdentity: identity(),
    current: () => current,
    analysis,
  })
  if (!interpolationEdit.parsed.source.includes("f'Hi {name}!'"))
    throw new Error('A edição do texto interpolado falhou.')
  const target = await analysis.parse(identity(), 'first, *rest = [1, 2, 3]\n')
  current = { identity: target.identity, source: target.source }
  const targetProjection = pythonASTToVisual(target.tree!)
  for (const item of targetProjection.body)
    walk(item, (block) => {
      if (block.codecId === 'sz_py_tuple') {
        const [first, second] = block.inputs
        const child = first!.nodes
        first!.nodes = second!.nodes
        second!.nodes = child
      }
    })
  const targetEdit = await preparePythonVisualTransaction({
    document: target,
    projection: targetProjection,
    nextIdentity: identity(),
    current: () => current,
    analysis,
  })
  if (!targetEdit.parsed.source.includes('(*rest, first)'))
    throw new Error('A reordenação do destino falhou.')
  const docstring = await analysis.parse(
    identity(),
    'def outer():\n    def inner():\n        """first\n        second"""\n        return 1\n    return inner()\n',
  )
  current = { identity: docstring.identity, source: docstring.source }
  const docstringProjection = pythonASTToVisual(docstring.tree!)
  for (const item of docstringProjection.body)
    walk(item, (block) => {
      if (block.codecId === 'sz_py_def' && block.fields[0]?.value === 'inner')
        block.fields[0].value = 'renamed'
    })
  const docstringEdit = await preparePythonVisualTransaction({
    document: docstring,
    projection: docstringProjection,
    nextIdentity: identity(),
    current: () => current,
    analysis,
  })
  if (!docstringEdit.parsed.source.includes('def renamed():\n        """first\n        second"""'))
    throw new Error('O conteúdo da docstring mudou.')
  const insertedSources: string[] = []
  for (const initial of ['# título 🐢\r\nx = 1 # inline\r\n# final', '# só comentário\r\n', '']) {
    const parsed = await analysis.parse(identity(), initial)
    current = { identity: parsed.identity, source: initial }
    const projection = pythonASTToVisual(parsed.tree!)
    const added = pythonASTToVisual(moduleNode([expression(call(name('print'), [text('novo')]))]))
      .body[0]!
    projection.body.push(added)
    const transaction = await preparePythonVisualTransaction({
      document: parsed,
      projection,
      nextIdentity: identity(),
      current: () => current,
      analysis,
    })
    const newline = initial.includes('\r\n') ? '\r\n' : '\n'
    const expected = `${initial}${initial && !/[\r\n]$/.test(initial) ? newline : ''}print('novo')${newline}`
    if (transaction.parsed.source !== expected)
      throw new Error('A inserção alterou comentários ou fonte existente.')
    insertedSources.push(transaction.parsed.source)
  }
  const decorated = await analysis.parse(
    identity(),
    '# manter\r\n@decorator\r\ndef f():\r\n    return 1\r\n',
  )
  current = { identity: decorated.identity, source: decorated.source }
  const decoratedProjection = pythonASTToVisual(decorated.tree!)
  decoratedProjection.body.unshift(
    ...pythonASTToVisual(moduleNode([expression(call(name('print'), [text('antes')]))])).body,
  )
  const insertedBefore = await preparePythonVisualTransaction({
    document: decorated,
    projection: decoratedProjection,
    nextIdentity: identity(),
    current: () => current,
    analysis,
  })
  if (
    insertedBefore.parsed.source !==
    decorated.source.replace('@decorator', "print('antes')\r\n@decorator")
  )
    throw new Error('A inserção separou o decorator de sua função.')
  const multiple = await analysis.parse(identity(), 'a = 1\r\n# entre\r\nb = 2\r\n')
  current = { identity: multiple.identity, source: multiple.source }
  const multipleProjection = pythonASTToVisual(multiple.tree!)
  for (const item of multipleProjection.body)
    walk(item, (block) => {
      if (block.codecId === 'sz_py_variable' && block.fields[0]?.value === 'a')
        block.fields[0].value = 'novo'
    })
  const command = (message: string) =>
    pythonASTToVisual(moduleNode([expression(call(name('print'), [text(message)]))])).body[0]!
  multipleProjection.body = [
    command('antes'),
    multipleProjection.body[0]!,
    command('entre'),
    multipleProjection.body[1]!,
    command('depois'),
  ]
  const multipleEdit = await preparePythonVisualTransaction({
    document: multiple,
    projection: multipleProjection,
    nextIdentity: identity(),
    current: () => current,
    analysis,
  })
  if (
    multipleEdit.parsed.source !==
    "print('antes')\r\nnovo = 1\r\n# entre\r\nprint('entre')\r\nb = 2\r\nprint('depois')\r\n"
  )
    throw new Error('Inserções múltiplas interferiram na edição localizada ou nos comentários.')
  const preservedDirectives: string[] = []
  for (const initial of [
    '@(\n    decorator\n)\ndef f():\n    pass\n',
    '@( # comentário\r\n    (decorator)\r\n)\r\n@second\r\ndef f():\r\n    pass\r\n',
    'x = 1 # type: ignore[assignment]\n',
    '# type: ignore\r\nx = 1 # type: ignore[assignment]\r\nprint(x) # type: ignore[name-defined]\r\n',
  ]) {
    const parsed = await analysis.parse(identity(), initial)
    current = { identity: parsed.identity, source: initial }
    const projection = pythonASTToVisual(parsed.tree!)
    projection.body.unshift(command('antes'))
    const transaction = await preparePythonVisualTransaction({
      document: parsed,
      projection,
      nextIdentity: identity(),
      current: () => current,
      analysis,
    })
    const newline = initial.includes('\r\n') ? '\r\n' : '\n'
    const expected = initial.startsWith('# type: ignore')
      ? initial.replace('x = 1', `print('antes')${newline}x = 1`)
      : `print('antes')${newline}${initial}`
    if (transaction.parsed.source !== expected)
      throw new Error('A inserção mudou o decorator ou a instrução de tipos.')
    preservedDirectives.push(transaction.parsed.source)
  }
  const structuralMoves: string[] = []
  for (const fixture of [
    {
      source: 'pass # primeiro\npass # segundo\n',
      order: [1, 0],
      expected: 'pass # segundo\npass # primeiro\n',
    },
    {
      source:
        '# arquivo\r\nx = 1 # type: ignore[a]\r\n# segundo\r\ny = 2 # type: ignore[b]\r\n# fim',
      order: [1, 0],
      expected:
        '# arquivo\r\n# segundo\r\ny = 2 # type: ignore[b]\r\nx = 1 # type: ignore[a]\r\n# fim',
    },
    {
      source: '# título\nx = 1 # nota\n# antes de y\ny = 2\n',
      order: [1],
      expected: '# título\n# nota\n# antes de y\ny = 2\n',
    },
    {
      source: '@(\n  decorar\n)\ndef f():\n    # interno\n    pass\nx = 2\n',
      order: [1, 0],
      expected: 'x = 2\n@(\n  decorar\n)\ndef f():\n    # interno\n    pass\n',
    },
    { source: 'x = 1\ny = 2', order: [1, 0], expected: 'y = 2\nx = 1\n' },
    {
      source: '# arquivo\ndef f():\n    # manter\n    pass\n# fim\n',
      order: [],
      expected: '# arquivo\n# manter\n# fim\n',
    },
  ]) {
    const parsed = await analysis.parse(identity(), fixture.source)
    current = { identity: parsed.identity, source: parsed.source }
    const projection = pythonASTToVisual(parsed.tree!)
    projection.body = fixture.order.map((index) => projection.body[index]!)
    const result = await preparePythonVisualTransaction({
      document: parsed,
      projection,
      nextIdentity: identity(),
      current: () => current,
      analysis,
    })
    if (result.parsed.source !== fixture.expected)
      throw new Error(`Movimento não preservou a fonte: ${JSON.stringify(result.parsed.source)}`)
    structuralMoves.push(result.parsed.source)
  }
  const nestedMoves: string[] = []
  for (const fixture of [
    {
      source: 'def f():\n    pass # primeiro\n    pass # segundo\n',
      codec: 'sz_py_def',
      field: 'body',
      order: [1, 0],
      expected: 'def f():\n    pass # segundo\n    pass # primeiro\n',
    },
    {
      source: 'def f():\n    # começo\n    x = 1 # x\n    # y\n    y = 2\n    # fim\nprint(f())\n',
      codec: 'sz_py_def',
      field: 'body',
      order: [1, 0],
      expected:
        'def f():\n    # começo\n    # y\n    y = 2\n    x = 1 # x\n    # fim\nprint(f())\n',
    },
    {
      source: 'if True:\n    pass\nelse:\n    x = 1 # retirar\n    y = 2\nprint(3)\n',
      codec: 'sz_py_if',
      field: 'orelse',
      order: [1],
      expected: 'if True:\n    pass\nelse:\n    # retirar\n    y = 2\nprint(3)\n',
    },
    {
      source:
        'for i in range(2):\r\n\tx = 1 # type: ignore[x]\r\n\ty = 2 # type: ignore[y]\r\nprint(3)\r\n',
      codec: 'sz_py_for',
      field: 'body',
      order: [1, 0],
      expected:
        'for i in range(2):\r\n\ty = 2 # type: ignore[y]\r\n\tx = 1 # type: ignore[x]\r\nprint(3)\r\n',
    },
    {
      source:
        'try:\n    pass\nexcept ValueError:\n    x = 1 # x\n    y = 2 # y\nfinally:\n    print(3)\n',
      codec: 'sz_py_except',
      field: 'body',
      order: [1, 0],
      expected:
        'try:\n    pass\nexcept ValueError:\n    y = 2 # y\n    x = 1 # x\nfinally:\n    print(3)\n',
    },
    {
      source: 'try:\n    pass\nfinally:\n    x = 1 # x\n    y = 2 # y\n',
      codec: 'sz_py_try',
      field: 'finalbody',
      order: [1, 0],
      expected: 'try:\n    pass\nfinally:\n    y = 2 # y\n    x = 1 # x\n',
    },
  ]) {
    const parsed = await analysis.parse(identity(), fixture.source)
    current = { identity: parsed.identity, source: parsed.source }
    const projection = pythonASTToVisual(parsed.tree!)
    let edited = false
    for (const root of projection.body)
      walk(root, (block) => {
        if (edited || block.codecId !== fixture.codec) return
        const input = block.inputs.find((input) => input.name === fixture.field)
        if (!input) throw new Error('Entrada estrutural ausente')
        input.nodes = fixture.order.map((index) => input.nodes[index]!)
        edited = true
      })
    if (!edited) throw new Error('Bloco estrutural ausente')
    const result = await preparePythonVisualTransaction({
      document: parsed,
      projection,
      nextIdentity: identity(),
      current: () => current,
      analysis,
    })
    if (result.parsed.source !== fixture.expected)
      throw new Error(`Suite não preservou a fonte: ${JSON.stringify(result.parsed.source)}`)
    nestedMoves.push(result.parsed.source)
  }
  const nestedInsertions: string[] = []
  const identifierEdits: string[] = []
  for (const fixture of [
    {
      source: 'def antigo(): # cabeçalho\n    # interno\n    pass\n',
      codec: 'sz_py_def',
      from: 'antigo',
      to: 'novo',
      expected: 'def novo(): # cabeçalho\n    # interno\n    pass\n',
    },
    {
      source: 'class Antiga: # classe\r\n    # corpo\r\n    pass\r\n',
      codec: 'sz_py_class',
      from: 'Antiga',
      to: 'Nova',
      expected: 'class Nova: # classe\r\n    # corpo\r\n    pass\r\n',
    },
    {
      source: 'def f(\n    antigo, # parâmetro\n):\n    pass\n',
      codec: 'sz_py_def',
      from: 'antigo',
      to: 'novo',
      expected: 'def f(\n    novo, # parâmetro\n):\n    pass\n',
    },
    {
      source: 'f(antigo=( # argumento\n    1))\n',
      codec: 'sz_py_keyword',
      from: 'antigo',
      to: 'novo',
      expected: 'f(novo=( # argumento\n    1))\n',
    },
    {
      source: 'def K(): # nome normalizado\n    # corpo\n    pass\n',
      codec: 'sz_py_def',
      from: 'K',
      to: 'nome',
      expected: 'def nome(): # nome normalizado\n    # corpo\n    pass\n',
    },
    {
      source: '(objeto # receptor\n).antigo\n',
      codec: 'sz_py_attribute',
      from: 'antigo',
      to: 'novo',
      expected: '(objeto # receptor\n).novo\n',
    },
  ]) {
    const parsed = await analysis.parse(identity(), fixture.source)
    current = { identity: parsed.identity, source: parsed.source }
    const projection = pythonASTToVisual(parsed.tree!)
    let changed = false
    for (const root of projection.body)
      walk(root, (block) => {
        if (block.codecId !== fixture.codec) return
        for (const field of block.fields)
          if (field.value === fixture.from) {
            field.value = fixture.to
            changed = true
          }
      })
    if (!changed) throw new Error(`Bloco para nome ausente: ${fixture.codec}`)
    const result = await preparePythonVisualTransaction({
      document: parsed,
      projection,
      nextIdentity: identity(),
      current: () => current,
      analysis,
    })
    if (result.parsed.source !== fixture.expected || result.edits.length !== 1)
      throw new Error(
        `A mudança de nome alterou outro texto: ${JSON.stringify(result.parsed.source)}`,
      )
    identifierEdits.push(result.parsed.source)
  }
  for (const fixture of [
    {
      source: 'def f():\n    # começo\n    x = 1 # x\nprint(2)\n',
      codec: 'sz_py_def',
      field: 'body',
      before: true,
      expected: "def f():\n    # começo\n    print('novo')\n    x = 1 # x\nprint(2)\n",
    },
    {
      source: 'if True:\n    x = 1 # x\nelse:\n    pass\n',
      codec: 'sz_py_if',
      field: 'body:0',
      before: false,
      expected: "if True:\n    x = 1 # x\n    print('novo')\nelse:\n    pass\n",
    },
    {
      source: 'for i in range(2):\r\n\tx = 1 # x',
      codec: 'sz_py_for',
      field: 'body',
      before: false,
      expected: "for i in range(2):\r\n\tx = 1 # x\r\n\tprint('novo')\r\n",
    },
    {
      source: 'try:\n    pass\nfinally:\n    x = 1 # x\n',
      codec: 'sz_py_try',
      field: 'finalbody',
      before: false,
      expected: "try:\n    pass\nfinally:\n    x = 1 # x\n    print('novo')\n",
    },
  ]) {
    const parsed = await analysis.parse(identity(), fixture.source)
    current = { identity: parsed.identity, source: parsed.source }
    const projection = pythonASTToVisual(parsed.tree!)
    let edited = false
    for (const root of projection.body)
      walk(root, (block) => {
        if (edited || block.codecId !== fixture.codec) return
        const input = block.inputs.find((input) => input.name === fixture.field)!
        if (fixture.before) input.nodes.unshift(command('novo'))
        else input.nodes.push(command('novo'))
        edited = true
      })
    if (!edited) throw new Error('Bloco para inserção ausente')
    const result = await preparePythonVisualTransaction({
      document: parsed,
      projection,
      nextIdentity: identity(),
      current: () => current,
      analysis,
    })
    if (result.parsed.source !== fixture.expected)
      throw new Error(`Inserção aninhada mudou a fonte: ${JSON.stringify(result.parsed.source)}`)
    nestedInsertions.push(result.parsed.source)
  }
  const combinedMoves: string[] = []
  for (const fixture of [
    {
      source: '# cabeçalho\r\ndef f(): # função\r\n    x = 1 # valor\r\nprint(f()) # chamada\r\n',
      rename: true,
      reverseBody: false,
      appendBody: false,
      deleteFirst: false,
      expected:
        '# cabeçalho\r\nprint(f()) # chamada\r\ndef nova(): # função\r\n    x = (10) # valor\r\n',
    },
    {
      source: 'def f():\n    x = 1 # type: ignore[x]\n    y = 2 # type: ignore[y]\nprint(f())\n',
      rename: false,
      reverseBody: true,
      appendBody: false,
      deleteFirst: false,
      expected:
        'print(f())\ndef f():\n    y = 2 # type: ignore[y]\n    x = (10) # type: ignore[x]\n',
    },
    {
      source: 'def f():\n    x = 1 # valor\nprint(f()) # chamada\n',
      rename: false,
      reverseBody: false,
      appendBody: true,
      deleteFirst: false,
      expected: "print(f()) # chamada\ndef f():\n    x = (10) # valor\n    print('dentro')\n",
    },
    {
      source: 'pass # anotação\ndef f():\n    x = 1 # valor\nprint(f())\n',
      rename: false,
      reverseBody: false,
      appendBody: true,
      deleteFirst: true,
      expected: "# anotação\nprint(f())\ndef f():\n    x = (10) # valor\n    print('dentro')\n",
    },
  ]) {
    const parsed = await analysis.parse(identity(), fixture.source)
    current = { identity: parsed.identity, source: parsed.source }
    const projection = pythonASTToVisual(parsed.tree!)
    if (fixture.deleteFirst) projection.body.shift()
    projection.body.reverse()
    for (const root of projection.body)
      walk(root, (block) => {
        if (block.codecId === 'sz_py_integer' && block.fields[0]?.value === '1')
          block.fields[0].value = '10'
        if (block.codecId !== 'sz_py_def') return
        if (fixture.rename) block.fields.find((field) => field.value === 'f')!.value = 'nova'
        const body = block.inputs.find((input) => input.name === 'body')!.nodes
        if (fixture.reverseBody) body.reverse()
        if (fixture.appendBody) body.push(command('dentro'))
      })
    const result = await preparePythonVisualTransaction({
      document: parsed,
      projection,
      nextIdentity: identity(),
      current: () => current,
      analysis,
    })
    if (result.parsed.source !== fixture.expected)
      throw new Error(
        `Movimento com edição interna mudou a fonte: ${JSON.stringify(result.parsed.source)}`,
      )
    combinedMoves.push(result.parsed.source)
  }
  const mixedLists: string[] = []
  for (const fixture of [
    {
      source: '# cabeçalho\nx = 1 # x\ny = 2 # y\n# final\n',
      nested: false,
      replaceAll: false,
      expected:
        "# cabeçalho\nprint('antes')\ny = 2 # y\nprint('meio')\nx = (10) # x\nprint('depois')\n# final\n",
    },
    {
      source:
        'def f():\r\n\tx = 1 # type: ignore[x]\r\n\ty = 2 # type: ignore[y]\r\nprint(f())\r\n',
      nested: true,
      replaceAll: false,
      expected:
        "def f():\r\n\tprint('antes')\r\n\ty = 2 # type: ignore[y]\r\n\tprint('meio')\r\n\tx = (10) # type: ignore[x]\r\n\tprint('depois')\r\nprint(f())\r\n",
    },
    {
      source: 'x = 1 # x\ny = 2 # y',
      nested: false,
      replaceAll: false,
      expected: "print('antes')\ny = 2 # y\nprint('meio')\nx = (10) # x\nprint('depois')\n",
    },
    {
      source: 'x = 1 # x\ny = 2 # y\n',
      nested: false,
      replaceAll: true,
      expected: "# x\n# y\nprint('substituto')\n",
    },
  ]) {
    const parsed = await analysis.parse(identity(), fixture.source)
    current = { identity: parsed.identity, source: parsed.source }
    const projection = pythonASTToVisual(parsed.tree!)
    let list = projection.body
    for (const root of projection.body)
      walk(root, (block) => {
        if (fixture.nested && block.codecId === 'sz_py_def')
          list = block.inputs.find((input) => input.name === 'body')!.nodes
        if (block.codecId === 'sz_py_integer' && block.fields[0]?.value === '1')
          block.fields[0].value = '10'
      })
    const next = fixture.replaceAll
      ? [command('substituto')]
      : [command('antes'), list[1]!, command('meio'), list[0]!, command('depois')]
    list.splice(0, list.length, ...next)
    const result = await preparePythonVisualTransaction({
      document: parsed,
      projection,
      nextIdentity: identity(),
      current: () => current,
      analysis,
    })
    if (result.parsed.source !== fixture.expected)
      throw new Error(`Lista mista mudou a fonte: ${JSON.stringify(result.parsed.source)}`)
    mixedLists.push(result.parsed.source)
  }
  const emptyBodies: string[] = []
  for (const fixture of [
    { header: 'def f():', codec: 'sz_py_def', tail: 'print(f())\n' },
    { header: 'class Pessoa:', codec: 'sz_py_class', tail: '' },
    // The flat if/elif/else block names its first body body:0.
    { header: 'if True:', codec: 'sz_py_if', body: 'body:0', tail: 'else:\n    print(2)\n' },
    { header: 'while False:', codec: 'sz_py_while', tail: '' },
    { header: 'for i in range(2):', codec: 'sz_py_for', tail: '' },
    { header: 'try:', codec: 'sz_py_try', tail: 'except ValueError:\n    pass\n' },
  ]) {
    const source = `${fixture.header}\n    x = 1 # anotação\n${fixture.tail}`
    const parsed = await analysis.parse(identity(), source)
    current = { identity: parsed.identity, source }
    const projection = pythonASTToVisual(parsed.tree!)
    let changed = false
    for (const root of projection.body)
      walk(root, (block) => {
        if (!changed && block.codecId === fixture.codec) {
          const field = 'body' in fixture ? fixture.body : 'body'
          block.inputs.find((input) => input.name === field)!.nodes = []
          changed = true
        }
      })
    if (!changed) throw new Error(`Corpo vazio sem bloco: ${fixture.codec}`)
    const result = await preparePythonVisualTransaction({
      document: parsed,
      projection,
      nextIdentity: identity(),
      current: () => current,
      analysis,
    })
    if (result.parsed.source !== `${fixture.header}\n    # anotação\n    pass\n${fixture.tail}`)
      throw new Error(`Corpo vazio mudou a fonte: ${JSON.stringify(result.parsed.source)}`)
    emptyBodies.push(result.parsed.source)
  }
  const removedBranches: string[] = []
  for (const fixture of [
    {
      source: 'if True:\n    x = 1\nelse: # ramo\n    x = 2 # anotação\nprint(x)\n',
      expected: 'if True:\n    x = 1\n# ramo\n# anotação\nprint(x)\n',
      codec: 'sz_py_if',
      field: 'orelse',
    },
    {
      source:
        'if True:\n    x = 1\nelif False: # intermediário\n    x = 2\nelse:\n    x = 3 # final',
      expected: 'if True:\n    x = 1\n# intermediário\n# final\n',
      codec: 'sz_py_if',
      field: 'orelse',
    },
    {
      source:
        'def f():\r\n    while False:\r\n        pass\r\n    else: # fim\r\n        x = 1 # type: ignore[assignment]\r\n    return 2\r\n',
      expected:
        'def f():\r\n    while False:\r\n        pass\r\n    # fim\r\n    # type: ignore[assignment]\r\n    return 2\r\n',
      codec: 'sz_py_while',
      field: 'orelse',
    },
    {
      source: 'for i in range(2):\n    pass\nelse: x = 1; y = 2 # inline\nprint(3)\n',
      expected: 'for i in range(2):\n    pass\n# inline\nprint(3)\n',
      codec: 'sz_py_for',
      field: 'orelse',
    },
    {
      source:
        'try:\n    x = 1\nexcept ValueError:\n    pass\nelse: # sucesso\n    print(x)\nfinally: # sempre\n    print(2)\n',
      expected:
        'try:\n    x = 1\nexcept ValueError:\n    pass\n# sucesso\nfinally: # sempre\n    print(2)\n',
      codec: 'sz_py_try',
      field: 'orelse',
    },
    {
      source:
        'try:\n    x = 1\nexcept ValueError:\n    pass\nelse:\n    print(x)\nfinally: # sempre\n    print(2) # limpar\n',
      expected:
        'try:\n    x = 1\nexcept ValueError:\n    pass\nelse:\n    print(x)\n# sempre\n# limpar\n',
      codec: 'sz_py_try',
      field: 'finalbody',
    },
    {
      source:
        'if True:\n    if False:\n        pass\n    else:\n        pass\nelse:\n    if False: # interno\n        pass\n    else:\n        print(2) # final\n',
      expected:
        'if True:\n    if False:\n        pass\n    else:\n        pass\n# interno\n# final\n',
      codec: 'sz_py_if',
      field: 'orelse',
    },
  ]) {
    const parsed = await analysis.parse(identity(), fixture.source)
    current = { identity: parsed.identity, source: parsed.source }
    const projection = pythonASTToVisual(parsed.tree!)
    let changed = false
    for (const root of projection.body)
      walk(root, (block) => {
        if (!changed && block.codecId === fixture.codec) {
          if (fixture.codec === 'sz_py_if' && fixture.field === 'orelse') {
            // if/elif/else is one flat block: taking the else away takes every "senão se"
            // with it, through the block's own options.
            block.inputs = block.inputs.filter(
              (input) => input.name === 'test:0' || input.name === 'body:0',
            )
            block.extra = { ...block.extra, 'elif:count': 0, 'orelse:present': false }
          } else if (block.extra?.[`${fixture.field}:present`] === true) {
            // An optional branch (else of a loop, finally) is turned off, not left empty.
            block.inputs = block.inputs.filter((input) => input.name !== fixture.field)
            block.extra = { ...block.extra, [`${fixture.field}:present`]: false }
          } else block.inputs.find((input) => input.name === fixture.field)!.nodes = []
          changed = true
        }
      })
    if (!changed) throw new Error(`Ramo opcional sem bloco: ${fixture.codec}`)
    const result = await preparePythonVisualTransaction({
      document: parsed,
      projection,
      nextIdentity: identity(),
      current: () => current,
      analysis,
    })
    if (result.parsed.source !== fixture.expected)
      throw new Error(`Remoção de ramo mudou a fonte: ${JSON.stringify(result.parsed.source)}`)
    removedBranches.push(result.parsed.source)
    current = { identity: result.parsed.identity, source: result.parsed.source }
    const restoredProjection = pythonASTToVisual(result.parsed.tree!)
    let restored = false
    for (const root of restoredProjection.body)
      walk(root, (block) => {
        if (!restored && block.codecId === fixture.codec) {
          let input = block.inputs.find((input) => input.name === fixture.field)
          if (!input) {
            // An empty branch is an option of the block: turning it on brings the socket back.
            input = { name: fixture.field, label: '', role: 'statement', nodes: [] }
            block.inputs.push(input)
            block.extra = { ...block.extra, [`${fixture.field}:present`]: true }
          }
          input.nodes.push(command('voltou'))
          restored = true
        }
      })
    const inserted = await preparePythonVisualTransaction({
      document: result.parsed,
      projection: restoredProjection,
      nextIdentity: identity(),
      current: () => current,
      analysis,
    })
    if (!inserted.parsed.source.includes("print('voltou')"))
      throw new Error('A reinserção de ramo perdeu o novo comando.')
    removedBranches.push(inserted.parsed.source)
  }
  const transferredStatements: string[] = []
  const suite = (value: PythonVisualNode, field = 'body') => {
    if (value.kind !== 'block') throw new Error('A estrutura do teste precisa de um bloco.')
    // The flat if/elif/else block names its first body body:0.
    const name = value.codecId === 'sz_py_if' && field === 'body' ? 'body:0' : field
    const input = value.inputs.find((input) => input.name === name)
    if (!input) throw new Error(`Entrada de comandos ausente: ${field}`)
    return input.nodes
  }
  const transfers: { source: string; expected: string; change(body: PythonVisualNode[]): void }[] =
    [
      {
        source: 'x=1 # nota\n',
        expected: 'if True:\n    x=1 # nota\n',
        change(body) {
          const wrapper = pythonASTToVisual(
            moduleNode([
              node('If', {
                test: node('Constant', { value: true, kind: null }),
                body: [node('Pass')],
                orelse: [],
              }),
            ]),
          ).body[0]!
          suite(wrapper).splice(0, 1, body.shift()!)
          body.push(wrapper)
        },
      },
      {
        source: 'def f():\n    x = (\n1 + 2\n    ) # nota\nprint(3)\n',
        expected: 'def f():\n    pass\nprint(3)\nx = (\n1 + 2\n) # nota\n',
        change(body) {
          body.push(suite(body[0]!).shift()!)
        },
      },
      {
        source: 'if True:\n    pass\nelif False: # cond\n    x=1 # nota\nprint(3)\n',
        // The comment of the "elif" line belongs to the flat block, so it stays where it was.
        expected: 'if True:\n    pass\n# cond\nprint(3)\nif False:\n    x=1 # nota\n',
        change(body) {
          // The "senão se" is a branch of the same flat block: moving it out makes it an
          // "se" of its own.
          const block = body[0]!
          if (block.kind !== 'block') throw new Error('O se precisa ser um bloco.')
          const branch = (name: string) => block.inputs.find((input) => input.name === name)!
          const test = branch('test:1')
          const moved = branch('body:1')
          block.inputs = block.inputs.filter((input) => input !== test && input !== moved)
          block.extra = { ...block.extra, 'elif:count': 0 }
          body.push({
            kind: 'block',
            codecId: 'sz_py_if',
            role: 'statement',
            fields: [],
            inputs: [
              { ...test, name: 'test:0', label: 'se' },
              { ...moved, name: 'body:0' },
            ],
            extra: { 'elif:count': 0, 'orelse:present': false },
          })
        },
      },
      {
        source: 'a=1 # nota\nif True:\n    print(2)\n',
        expected: 'if True:\n    print(2)\n    a=1 # nota\n',
        change(body) {
          const moved = body.shift()!
          suite(body[0]!).push(moved)
        },
      },
      {
        source: 'def f():\n    a = 1 # nota\nprint(2)\n',
        expected: 'def f():\n    pass\nprint(2)\na = 1 # nota\n',
        change(body) {
          body.push(suite(body[0]!).shift()!)
        },
      },
      {
        source: 'def a():\n    x=1 # mover\ndef b():\n    y = 2 # ficar\n',
        expected: 'def b():\n    y = 2 # ficar\n    x=(3) # mover\ndef a():\n    pass\n',
        change(body) {
          const moved = suite(body[0]!).shift()!
          walk(moved, (block) => {
            if (block.codecId === 'sz_py_integer') block.fields[0]!.value = '3'
          })
          suite(body[1]!).push(moved)
          body.reverse()
        },
      },
      {
        source:
          'def f():\r\n    texto = """primeira\r\n    literal\r\núltima""" # texto\r\nprint(2)\r\n',
        expected:
          'def f():\r\n    pass\r\nprint(2)\r\ntexto = """primeira\r\n    literal\r\núltima""" # texto\r\n',
        change(body) {
          body.push(suite(body[0]!).shift()!)
        },
      },
      {
        source:
          'def a():\n    if True: # condição\n        x = 1 # dentro\ndef b():\n    while False:\n        pass\n',
        expected:
          'def a():\n    pass\ndef b():\n    while False:\n        pass\n        if True: # condição\n            x = 1 # dentro\n',
        change(body) {
          suite(suite(body[1]!)[0]!).push(suite(body[0]!).shift()!)
        },
      },
      {
        source: 'if True:\n    pass\nelse: # ramo\n    x = 1 # comando\n',
        // An emptied "senão" stays on the block until it is turned off: the code says what
        // the blocks show.
        expected: 'if True:\n    pass\nelse: # ramo\n    pass\nx = 1 # comando\n',
        change(body) {
          body.push(suite(body[0]!, 'orelse').shift()!)
        },
      },
      {
        source:
          'def a():\n    pass\n    # acompanha\n    x=1 # type: ignore[tag]\ndef b():\n    pass\n',
        expected:
          // A body holding only `pass` shows empty: the filler goes once a command arrives.
          'def a():\n    pass\ndef b():\n    # acompanha\n    x=1 # type: ignore[tag]\n',
        change(body) {
          suite(body[1]!).push(suite(body[0]!).pop()!)
        },
      },
    ]
  for (const fixture of transfers) {
    const parsed = await analysis.parse(identity(), fixture.source)
    current = { identity: parsed.identity, source: parsed.source }
    const projection = pythonASTToVisual(parsed.tree!)
    fixture.change(projection.body)
    const result = await preparePythonVisualTransaction({
      document: parsed,
      projection,
      nextIdentity: identity(),
      current: () => current,
      analysis,
    })
    if (result.parsed.source !== fixture.expected)
      throw new Error(`Transferência mudou a fonte: ${JSON.stringify(result.parsed.source)}`)
    transferredStatements.push(result.parsed.source)
  }
  const simultaneous = await analysis.parse(identity(), 'def f():\n    x = 1 # x\n')
  current = { identity: simultaneous.identity, source: simultaneous.source }
  const simultaneousProjection = pythonASTToVisual(simultaneous.tree!)
  for (const root of simultaneousProjection.body)
    walk(root, (block) => {
      if (block.codecId === 'sz_py_def')
        block.inputs.find((input) => input.name === 'body')!.nodes.push(command('dentro'))
    })
  simultaneousProjection.body.push(command('fora'))
  const simultaneousEdit = await preparePythonVisualTransaction({
    document: simultaneous,
    projection: simultaneousProjection,
    nextIdentity: identity(),
    current: () => current,
    analysis,
  })
  if (
    simultaneousEdit.parsed.source !==
    "def f():\n    x = 1 # x\n    print('dentro')\nprint('fora')\n"
  )
    throw new Error('Inserções na mesma fronteira trocaram de ordem')
  const encodingSource = 'x = 1 # coding: ascii\nprint("ação")\n'
  const encodingParsed = await analysis.parse(identity(), encodingSource)
  current = { identity: encodingParsed.identity, source: encodingSource }
  const encodingProjection = pythonASTToVisual(encodingParsed.tree!)
  encodingProjection.body.shift()
  let encodingProtected = false
  try {
    await preparePythonVisualTransaction({
      document: encodingParsed,
      projection: encodingProjection,
      nextIdentity: identity(),
      current: () => current,
      analysis,
    })
  } catch (error) {
    encodingProtected = error instanceof Error && error.message.includes('codificação')
  }
  if (!encodingProtected)
    throw new Error('O comentário ativou uma codificação diferente ao exportar')
  return {
    localEdit: prepared.parsed.source,
    unchangedByteExact: true,
    staleCommit,
    commentsProtected,
    changedDuringRender,
    invalidSourcePreserved,
    precedence: precedence.parsed.source,
    interpolation: interpolationEdit.parsed.source,
    starredTarget: targetEdit.parsed.source,
    docstring: docstringEdit.parsed.source,
    insertedSources,
    insertedBefore: insertedBefore.parsed.source,
    multipleInsertions: multipleEdit.parsed.source,
    preservedDirectives,
    structuralMoves,
    nestedMoves,
    nestedInsertions,
    identifierEdits,
    combinedMoves,
    mixedLists,
    emptyBodies,
    removedBranches,
    transferredStatements,
    encodingProtected,
  }
}
