import type * as Babel from '@babel/types'
import { VISITOR_KEYS } from '@babel/types'
import { ProjectDocumentError } from '../core/projectDocument'
import type { MigrationChange } from './types'

/** Só converte registros estáticos: criar e registrar permanecem no mesmo ponto. */
export function rpgJavaScriptEdits(
  tree: Babel.File,
  path: string,
  changes: MigrationChange[],
): Array<{ start: number; end: number; text: string }> {
  const parents = new Map<Babel.Node, Babel.Node>()
  const nodes: Babel.Node[] = []
  const pending: Babel.Node[] = [tree]
  while (pending.length) {
    const node = pending.pop()!
    nodes.push(node)
    const fields = node as unknown as Record<string, unknown>
    for (const key of VISITOR_KEYS[node.type] ?? []) {
      const value = fields[key]
      for (const child of Array.isArray(value) ? value : [value]) {
        if (!child || typeof child !== 'object' || typeof child.type !== 'string') continue
        parents.set(child, node)
        pending.push(child)
      }
    }
  }
  const edits: Array<{ start: number; end: number; text: string }> = []
  const names = new Map<string, Babel.Node>()
  function fail(): never {
    throw new ProjectDocumentError(
      'migration-pending',
      'O registro antigo de mapas RPG precisa de revisão: são aceitos nomes literais e registros diretos no início do jogo.',
      path,
    )
  }
  // Ordem lexical determina qual registro cria cada mapa.
  nodes.sort((a, b) => (a.start ?? 0) - (b.start ?? 0))
  const hasOldMap = nodes.some(
    (node) =>
      (node.type === 'MemberExpression' || node.type === 'OptionalMemberExpression') &&
      node.object.type === 'Identifier' &&
      node.object.name === 'SZGameKit' &&
      ((!node.computed &&
        node.property.type === 'Identifier' &&
        node.property.name === 'rpgOnMap') ||
        (node.computed &&
          node.property.type === 'StringLiteral' &&
          node.property.value === 'rpgOnMap')),
  )
  if (
    hasOldMap &&
    nodes.some(
      (node) =>
        node.type === 'MemberExpression' &&
        node.object.type === 'Identifier' &&
        node.object.name === 'SZGameKit' &&
        ((!node.computed &&
          node.property.type === 'Identifier' &&
          node.property.name === 'rpgCreateMap') ||
          (node.computed &&
            node.property.type === 'StringLiteral' &&
            node.property.value === 'rpgCreateMap')),
    )
  )
    fail()
  for (const node of nodes) {
    if (node.type !== 'MemberExpression' && node.type !== 'OptionalMemberExpression') continue
    if (node.object.type !== 'Identifier' || node.object.name !== 'SZGameKit') continue
    const method =
      !node.computed && node.property.type === 'Identifier'
        ? node.property.name
        : node.computed && node.property.type === 'StringLiteral'
          ? node.property.value
          : null
    if (method === null || method === 'rpgMapSize') fail()
    if (method !== 'rpgOnMap') continue
    const call = parents.get(node)
    if (call?.type !== 'CallExpression' || call.callee !== node || call.arguments.length !== 2)
      fail()
    const name = call.arguments[0]
    const callback = call.arguments[1]
    if (name?.type !== 'StringLiteral' || !name.value.trim()) fail()
    if (callback?.type !== 'ArrowFunctionExpression' && callback?.type !== 'FunctionExpression')
      fail()
    const statement = parents.get(call)
    if (statement?.type !== 'ExpressionStatement') fail()
    const scope = parents.get(statement)
    if (!scope || (scope.type !== 'BlockStatement' && scope.type !== 'Program')) fail()
    let ancestor: Babel.Node | undefined = scope
    while (ancestor) {
      if (/^(If|For|While|DoWhile|Switch|Try|Catch|Conditional)/.test(ancestor.type)) fail()
      if (ancestor.type === 'FunctionDeclaration') fail()
      if (ancestor.type === 'FunctionExpression' || ancestor.type === 'ArrowFunctionExpression') {
        const owner = parents.get(ancestor)
        if (
          owner?.type !== 'CallExpression' ||
          owner.callee.type !== 'MemberExpression' ||
          owner.callee.object.type !== 'Identifier' ||
          owner.callee.object.name !== 'SZGameKit' ||
          owner.callee.computed ||
          owner.callee.property.type !== 'Identifier' ||
          !['runProject', 'onGameStart'].includes(owner.callee.property.name)
        )
          fail()
      }
      ancestor = parents.get(ancestor)
    }
    if (names.has(name.value) && names.get(name.value) !== scope) fail()
    if (node.property.start == null || node.property.end == null || statement.start == null) fail()
    edits.push({
      start: node.property.start,
      end: node.property.end,
      text: node.computed ? '"rpgOnEnterMap"' : 'rpgOnEnterMap',
    })
    if (!names.has(name.value)) {
      names.set(name.value, scope)
      edits.push({
        start: statement.start,
        end: statement.start,
        text: `SZGameKit.rpgCreateMap(${JSON.stringify(name.value)}, 0, 0, () => {}, false, "unbounded");\n`,
      })
    }
    changes.push({ rule: 'gk.explicit-unbounded-map-call', path: `${path}:${node.start}` })
  }
  return edits
}
