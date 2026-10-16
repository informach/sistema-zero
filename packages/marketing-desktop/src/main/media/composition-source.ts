import ts from 'typescript'

const imports = new Set([
  'AbsoluteFill',
  'Sequence',
  'Img',
  'interpolate',
  'spring',
  'useCurrentFrame',
  'useVideoConfig',
])
const calls = new Set(['interpolate', 'spring', 'useCurrentFrame', 'useVideoConfig'])
const forbiddenProperties = new Set(['constructor', 'prototype', '__proto__'])
const math = new Set([
  'abs',
  'ceil',
  'floor',
  'round',
  'min',
  'max',
  'pow',
  'sqrt',
  'sin',
  'cos',
  'tan',
  'PI',
  'E',
])
const forbiddenNames = new Set([
  'constructor',
  'prototype',
  '__proto__',
  'globalThis',
  'window',
  'document',
  'process',
  'require',
  'module',
  'exports',
  'eval',
  'Function',
  'fetch',
  'XMLHttpRequest',
  'WebSocket',
  'navigator',
  'location',
  'self',
  'top',
  'parent',
  'frames',
  'setTimeout',
  'setInterval',
  'requestAnimationFrame',
  'Date',
  'Promise',
  'Reflect',
  'Proxy',
  'Object',
  'Array',
])
const tags = new Set(['AbsoluteFill', 'Sequence', 'Img', 'div', 'span'])
const styleKeys = new Set([
  'position',
  'top',
  'left',
  'right',
  'bottom',
  'width',
  'height',
  'minWidth',
  'maxWidth',
  'minHeight',
  'maxHeight',
  'display',
  'flexDirection',
  'flex',
  'flexGrow',
  'flexShrink',
  'flexBasis',
  'flexWrap',
  'alignSelf',
  'alignItems',
  'justifyContent',
  'gap',
  'rowGap',
  'columnGap',
  'padding',
  'paddingTop',
  'paddingBottom',
  'paddingLeft',
  'paddingRight',
  'margin',
  'marginTop',
  'marginBottom',
  'marginLeft',
  'marginRight',
  'borderRadius',
  'borderWidth',
  'borderColor',
  'borderStyle',
  'backgroundColor',
  'color',
  'fontSize',
  'fontWeight',
  'lineHeight',
  'letterSpacing',
  'textAlign',
  'whiteSpace',
  'overflow',
  'overflowWrap',
  'opacity',
  'transform',
  'transformOrigin',
  'objectFit',
  'boxSizing',
  'zIndex',
])
const operators = new Set([
  ts.SyntaxKind.PlusToken,
  ts.SyntaxKind.MinusToken,
  ts.SyntaxKind.AsteriskToken,
  ts.SyntaxKind.SlashToken,
  ts.SyntaxKind.PercentToken,
  ts.SyntaxKind.AsteriskAsteriskToken,
  ts.SyntaxKind.LessThanToken,
  ts.SyntaxKind.LessThanEqualsToken,
  ts.SyntaxKind.GreaterThanToken,
  ts.SyntaxKind.GreaterThanEqualsToken,
  ts.SyntaxKind.EqualsEqualsEqualsToken,
  ts.SyntaxKind.ExclamationEqualsEqualsToken,
  ts.SyntaxKind.AmpersandAmpersandToken,
  ts.SyntaxKind.BarBarToken,
  ts.SyntaxKind.QuestionQuestionToken,
])
const syntax = new Set([
  ts.SyntaxKind.SourceFile,
  ts.SyntaxKind.EndOfFileToken,
  ts.SyntaxKind.ImportDeclaration,
  ts.SyntaxKind.ImportClause,
  ts.SyntaxKind.NamedImports,
  ts.SyntaxKind.ImportSpecifier,
  ts.SyntaxKind.FunctionDeclaration,
  ts.SyntaxKind.ExportKeyword,
  ts.SyntaxKind.DefaultKeyword,
  ts.SyntaxKind.Parameter,
  ts.SyntaxKind.Block,
  ts.SyntaxKind.VariableStatement,
  ts.SyntaxKind.VariableDeclarationList,
  ts.SyntaxKind.VariableDeclaration,
  ts.SyntaxKind.ReturnStatement,
  ts.SyntaxKind.IfStatement,
  ts.SyntaxKind.ArrowFunction,
  ts.SyntaxKind.EqualsGreaterThanToken,
  ts.SyntaxKind.Identifier,
  ts.SyntaxKind.StringLiteral,
  ts.SyntaxKind.NumericLiteral,
  ts.SyntaxKind.TrueKeyword,
  ts.SyntaxKind.FalseKeyword,
  ts.SyntaxKind.NullKeyword,
  ts.SyntaxKind.PropertyAccessExpression,
  ts.SyntaxKind.ElementAccessExpression,
  ts.SyntaxKind.ArrayLiteralExpression,
  ts.SyntaxKind.ObjectLiteralExpression,
  ts.SyntaxKind.PropertyAssignment,
  ts.SyntaxKind.ShorthandPropertyAssignment,
  ts.SyntaxKind.CallExpression,
  ts.SyntaxKind.ParenthesizedExpression,
  ts.SyntaxKind.BinaryExpression,
  ts.SyntaxKind.PrefixUnaryExpression,
  ts.SyntaxKind.ConditionalExpression,
  ts.SyntaxKind.QuestionToken,
  ts.SyntaxKind.ColonToken,
  ts.SyntaxKind.ExclamationToken,
  ts.SyntaxKind.TemplateExpression,
  ts.SyntaxKind.TemplateHead,
  ts.SyntaxKind.TemplateMiddle,
  ts.SyntaxKind.TemplateTail,
  ts.SyntaxKind.TemplateSpan,
  ts.SyntaxKind.NoSubstitutionTemplateLiteral,
  ts.SyntaxKind.JsxElement,
  ts.SyntaxKind.JsxOpeningElement,
  ts.SyntaxKind.JsxClosingElement,
  ts.SyntaxKind.JsxSelfClosingElement,
  ts.SyntaxKind.JsxFragment,
  ts.SyntaxKind.JsxOpeningFragment,
  ts.SyntaxKind.JsxClosingFragment,
  ts.SyntaxKind.JsxAttributes,
  ts.SyntaxKind.JsxAttribute,
  ts.SyntaxKind.JsxExpression,
  ts.SyntaxKind.JsxText,
  ...operators,
])

/** A small, pure TSX authoring surface. Validation never evaluates provider code. */
export function validateCompositionSource(source: string, assetIds: readonly string[]) {
  if (!source.trim() || Buffer.byteLength(source, 'utf8') > 32000)
    throw new Error('Composição exige fonte de até 32 KB')
  const file = ts.createSourceFile(
      'GeneratedComposition.tsx',
      source,
      ts.ScriptTarget.ES2022,
      true,
      ts.ScriptKind.TSX,
    ),
    declared = new Set(['props', 'Math']),
    arrays = new Map<string, ts.ArrayLiteralExpression>(),
    usedAssets = new Set<string>()
  let functions = 0,
    nodes = 0
  function fail(node: ts.Node, message: string): never {
    const location = file.getLineAndCharacterOfPosition(node.getStart(file))
    throw new Error(`Composição, linha ${location.line + 1}: ${message}`)
  }
  const bindLocal = (node: ts.Node, name: ts.BindingName) => {
    if (!ts.isIdentifier(name) || forbiddenNames.has(name.text) || declared.has(name.text))
      fail(node, 'use nomes locais distintos; não há acesso a APIs do ambiente')
    declared.add(name.text)
  }
  const collect = (node: ts.Node) => {
    if (ts.isImportDeclaration(node)) {
      const bindings = node.importClause?.namedBindings
      if (
        node.parent !== file ||
        !ts.isStringLiteral(node.moduleSpecifier) ||
        node.moduleSpecifier.text !== 'remotion' ||
        node.importClause?.name ||
        !bindings ||
        !ts.isNamedImports(bindings) ||
        node.importClause?.isTypeOnly
      )
        fail(node, 'importe somente as funções visuais permitidas de remotion')
      for (const binding of bindings.elements) {
        if (binding.propertyName || !imports.has(binding.name.text))
          fail(binding, 'dependência não permitida')
        bindLocal(binding, binding.name)
      }
    }
    if (ts.isVariableDeclaration(node)) {
      bindLocal(node, node.name)
      if (
        ts.isIdentifier(node.name) &&
        node.initializer &&
        ts.isArrayLiteralExpression(node.initializer)
      )
        arrays.set(node.name.text, node.initializer)
    }
    if (ts.isArrowFunction(node))
      for (const parameter of node.parameters) bindLocal(parameter, parameter.name)
    ts.forEachChild(node, collect)
  }
  collect(file)
  const isName = (node: ts.Identifier) => {
    const parent = node.parent
    return (
      (ts.isPropertyAccessExpression(parent) && parent.name === node) ||
      (ts.isPropertyAssignment(parent) && parent.name === node) ||
      (ts.isJsxAttribute(parent) && parent.name === node) ||
      ((ts.isJsxOpeningElement(parent) ||
        ts.isJsxClosingElement(parent) ||
        ts.isJsxSelfClosingElement(parent)) &&
        parent.tagName === node) ||
      (ts.isFunctionDeclaration(parent) && parent.name === node)
    )
  }
  const visit = (node: ts.Node, depth = 0, maps = 0) => {
    if (++nodes > 4000 || depth > 80) fail(node, 'simplifique a composição')
    if (!syntax.has(node.kind)) fail(node, `construção não permitida: ${ts.SyntaxKind[node.kind]}`)
    if (
      ts.isIdentifier(node) &&
      (forbiddenProperties.has(node.text) ||
        (!isName(node) && (forbiddenNames.has(node.text) || !declared.has(node.text))))
    )
      fail(node, `identificador não permitido: ${node.text}`)
    if (ts.isFunctionDeclaration(node)) {
      functions++
      if (
        node.parent !== file ||
        node.asteriskToken ||
        node.name?.text !== 'GeneratedComposition' ||
        node.parameters.length !== 1 ||
        node.parameters[0]?.name.getText(file) !== 'props' ||
        !node.body ||
        node.modifiers?.length !== 2 ||
        !node.modifiers.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) ||
        !node.modifiers.some((modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword)
      )
        fail(node, 'use export default function GeneratedComposition(props)')
    }
    if (ts.isVariableDeclarationList(node) && !(node.flags & ts.NodeFlags.Const))
      fail(node, 'use somente const')
    if (ts.isVariableDeclaration(node) && !node.initializer) fail(node, 'inicialize toda constante')
    if (ts.isBinaryExpression(node) && !operators.has(node.operatorToken.kind))
      fail(node, 'atribuição e mutação não são permitidas')
    if (
      ts.isPrefixUnaryExpression(node) &&
      ![ts.SyntaxKind.PlusToken, ts.SyntaxKind.MinusToken, ts.SyntaxKind.ExclamationToken].includes(
        node.operator,
      )
    )
      fail(node, 'mutação não é permitida')
    if (ts.isArrayLiteralExpression(node) && node.elements.length > 32)
      fail(node, 'cada lista pode ter até 32 itens')
    if (
      ts.isPropertyAssignment(node) &&
      !(ts.isIdentifier(node.name) || ts.isStringLiteral(node.name))
    )
      fail(node, 'use propriedades literais')
    if (
      ts.isPropertyAssignment(node) &&
      (ts.isIdentifier(node.name) || ts.isStringLiteral(node.name)) &&
      forbiddenProperties.has(node.name.text)
    )
      fail(node, 'propriedade reservada')
    if (
      ts.isElementAccessExpression(node) &&
      !ts.isStringLiteral(node.argumentExpression) &&
      !ts.isNumericLiteral(node.argumentExpression)
    )
      fail(node, 'índices devem ser literais')
    if (
      ts.isElementAccessExpression(node) &&
      ts.isStringLiteral(node.argumentExpression) &&
      forbiddenProperties.has(node.argumentExpression.text)
    )
      fail(node, 'propriedade reservada')
    if (
      ts.isPropertyAccessExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'Math' &&
      !math.has(node.name.text)
    )
      fail(node, 'use somente matemática determinística')
    if (ts.isCallExpression(node)) {
      const target = node.expression
      if (ts.isIdentifier(target)) {
        if (!calls.has(target.text) || !declared.has(target.text))
          fail(node, 'chamada não permitida')
      } else if (ts.isPropertyAccessExpression(target)) {
        if (
          ts.isIdentifier(target.expression) &&
          target.expression.text === 'Math' &&
          math.has(target.name.text)
        ) {
          /* deterministic math */
        } else if (
          target.name.text === 'map' &&
          (ts.isArrayLiteralExpression(target.expression) ||
            (ts.isIdentifier(target.expression) && arrays.has(target.expression.text)))
        ) {
          if (maps >= 2 || node.arguments.length !== 1 || !ts.isArrowFunction(node.arguments[0]!))
            fail(node, 'map exige callback local e no máximo dois níveis')
          maps++
        } else fail(node, 'chamada de método não permitida')
      } else fail(node, 'chamada dinâmica não permitida')
    }
    if (
      ts.isArrowFunction(node) &&
      !(ts.isCallExpression(node.parent) && node.parent.arguments.includes(node))
    )
      fail(node, 'funções locais são somente callbacks de map')
    if (
      ts.isJsxOpeningElement(node) ||
      ts.isJsxSelfClosingElement(node) ||
      ts.isJsxClosingElement(node)
    ) {
      if (!ts.isIdentifier(node.tagName) || !tags.has(node.tagName.text))
        fail(node, 'elemento visual não permitido')
      if (imports.has(node.tagName.text) && !declared.has(node.tagName.text))
        fail(node, 'importe o componente visual antes de usar')
    }
    if (ts.isJsxAttribute(node)) {
      const name = node.name.getText(file),
        tag = node.parent.parent
      const tagName =
        ts.isJsxOpeningElement(tag) || ts.isJsxSelfClosingElement(tag)
          ? tag.tagName.getText(file)
          : ''
      if (
        ![
          'style',
          'key',
          ...(tagName === 'Sequence' ? ['from', 'durationInFrames', 'layout'] : []),
          ...(tagName === 'Img' ? ['src'] : []),
        ].includes(name)
      )
        fail(node, 'atributo não permitido')
      if (name === 'style') {
        const expression =
          node.initializer && ts.isJsxExpression(node.initializer)
            ? node.initializer.expression
            : undefined
        if (!expression || !ts.isObjectLiteralExpression(expression))
          fail(node, 'escreva o estilo em um objeto inline')
        for (const property of expression.properties) {
          if (
            (!ts.isPropertyAssignment(property) && !ts.isShorthandPropertyAssignment(property)) ||
            !ts.isIdentifier(property.name) ||
            !styleKeys.has(property.name.text)
          )
            fail(property, 'propriedade de estilo não permitida')
        }
      }
      if (name === 'src') {
        const expression =
          node.initializer && ts.isJsxExpression(node.initializer)
            ? node.initializer.expression
            : undefined
        if (
          !expression ||
          !ts.isElementAccessExpression(expression) ||
          !ts.isPropertyAccessExpression(expression.expression) ||
          expression.expression.expression.getText(file) !== 'props' ||
          expression.expression.name.text !== 'assets' ||
          !ts.isStringLiteral(expression.argumentExpression) ||
          !assetIds.includes(expression.argumentExpression.text)
        )
          fail(
            node,
            'imagens devem referenciar props.assets com o ID literal de uma mídia autorizada',
          )
        usedAssets.add(expression.argumentExpression.text)
      }
    }
    ts.forEachChild(node, (child) => visit(child, depth + 1, maps))
  }
  visit(file)
  if (functions !== 1)
    throw new Error('A composição precisa de uma única função GeneratedComposition')
  const compiled = ts.transpileModule(source, {
    fileName: 'GeneratedComposition.tsx',
    reportDiagnostics: true,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
    },
  })
  const errors =
    compiled.diagnostics?.filter(
      (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
    ) ?? []
  if (errors.length)
    throw new Error(
      `Composição inválida: ${ts.flattenDiagnosticMessageText(errors[0]!.messageText, ' ')}`,
    )
  return { source, assetIds: [...usedAssets].sort(), javascript: compiled.outputText }
}
