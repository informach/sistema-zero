import { parse } from '@babel/parser'

/**
 * Objetivos que RODAM o jogo (etapa 3, 18/10/2026): o teste precisa LER as variáveis e chamar as
 * funções da criança, e no jogo clássico elas moram dentro da função da partida
 * (`function __szProjectRun() { … }`, ver `generators/js.ts`), fora do alcance da página.
 *
 * Esta função devolve o `script.js` com um leitor injetado no começo de cada escopo que importa (o
 * topo do arquivo e o corpo de cada `__szProjectRun`). O leitor fica numa propriedade não
 * enumerável de `globalThis` com um nome sorteado por teste (`scope`), então o jogo não o
 * encontra por acaso. Ele lê pela CLOSURE, depois de o código rodar: variáveis declaradas mais
 * abaixo já existem quando o teste pergunta. Variável ainda não criada (`let` antes da linha) volta
 * como "não existe", nunca derruba o jogo.
 *
 * Código que não analisa (a criança digitou algo quebrado na Ponte) volta como veio: o jogo roda
 * do mesmo jeito e o objetivo que lê variável não encontra o que procura.
 */
export const CHECK_SCOPE_PATTERN = /^__sz[a-f0-9]{24}$/

const RUN_FUNCTION = '__szProjectRun'

type Node = { type: string; start?: number | null; end?: number | null; [key: string]: unknown }

const isNode = (value: unknown): value is Node =>
  typeof value === 'object' && value !== null && typeof (value as Node).type === 'string'

function patternNames(pattern: unknown, into: string[]) {
  if (!isNode(pattern)) return
  switch (pattern.type) {
    case 'Identifier':
      into.push(String(pattern.name))
      return
    case 'ObjectPattern':
      for (const property of (pattern.properties as unknown[]) ?? [])
        if (isNode(property))
          patternNames(property.type === 'RestElement' ? property.argument : property.value, into)
      return
    case 'ArrayPattern':
      for (const element of (pattern.elements as unknown[]) ?? []) patternNames(element, into)
      return
    case 'RestElement':
      patternNames(pattern.argument, into)
      return
    case 'AssignmentPattern':
      patternNames(pattern.left, into)
  }
}

/** Os nomes que um bloco de comandos declara DIRETAMENTE (não os de dentro de outras funções). */
function declaredNames(statements: unknown[]): string[] {
  const names: string[] = []
  for (const statement of statements) {
    if (!isNode(statement)) continue
    const declaration =
      (statement.type === 'ExportNamedDeclaration' ||
        statement.type === 'ExportDefaultDeclaration') &&
      isNode(statement.declaration)
        ? statement.declaration
        : statement
    if (declaration.type === 'VariableDeclaration')
      for (const item of (declaration.declarations as unknown[]) ?? [])
        if (isNode(item)) patternNames(item.id, names)
    if (
      (declaration.type === 'FunctionDeclaration' || declaration.type === 'ClassDeclaration') &&
      isNode(declaration.id)
    )
      names.push(String(declaration.id.name))
  }
  // Os nomes internos do motor (`__szProjectRunContext`…) não são da criança.
  return [...new Set(names)].filter(
    (name) => /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name) && !name.startsWith('__sz'),
  )
}

function reader(scope: string, names: string[]): string {
  const cases = names
    .map((name) => `case ${JSON.stringify(name)}:try{return{v:${name}}}catch(e){return null}`)
    .join(';')
  // Uma linha só, sem quebras: as linhas do código da criança continuam nos mesmos números para as
  // mensagens de erro do console.
  return `;(function(){var g=globalThis,k=${JSON.stringify(scope)},r=g[k];if(!r){r={scopes:[],get:function(n){for(var i=r.scopes.length-1;i>=0;i--){var f=r.scopes[i](n);if(f)return f}return null}};try{Object.defineProperty(g,k,{value:r})}catch(e){return}}r.scopes.push(function(n){switch(n){${cases}}return null})})();`
}

export function instrumentCheckScript(source: string, scope: string): string {
  if (!CHECK_SCOPE_PATTERN.test(scope)) throw new Error('Nome de escopo de teste inválido.')
  let program: Node
  try {
    program = parse(source, {
      sourceType: 'unambiguous',
      allowReturnOutsideFunction: true,
      allowAwaitOutsideFunction: true,
      errorRecovery: false,
    }).program as unknown as Node
  } catch {
    return source
  }
  const insertions: { at: number; text: string }[] = []
  const directiveEnd = (node: Node, fallback: number) => {
    const directives = (node.directives as Node[] | undefined) ?? []
    const last = directives.at(-1)
    return typeof last?.end === 'number' ? last.end : fallback
  }
  const topNames = declaredNames((program.body as unknown[]) ?? [])
  if (topNames.length)
    insertions.push({ at: directiveEnd(program, 0), text: reader(scope, topNames) })
  // A função da partida pode estar em qualquer lugar (embrulhada pelo motor da extensão).
  const stack: unknown[] = [program]
  while (stack.length) {
    const node = stack.pop()
    if (Array.isArray(node)) {
      stack.push(...node)
      continue
    }
    if (!isNode(node)) continue
    if (
      (node.type === 'FunctionExpression' || node.type === 'FunctionDeclaration') &&
      isNode(node.id) &&
      node.id.name === RUN_FUNCTION &&
      isNode(node.body) &&
      typeof node.body.start === 'number'
    ) {
      const names = declaredNames((node.body.body as unknown[]) ?? [])
      if (names.length)
        insertions.push({
          at: directiveEnd(node.body, node.body.start + 1),
          text: reader(scope, names),
        })
    }
    for (const [key, value] of Object.entries(node))
      if (key !== 'loc' && key !== 'start' && key !== 'end' && typeof value === 'object')
        stack.push(value)
  }
  let out = source
  for (const insertion of insertions.sort((a, b) => b.at - a.at))
    out = out.slice(0, insertion.at) + insertion.text + out.slice(insertion.at)
  return out
}
