import { parse } from '@babel/parser'
import type * as Babel from '@babel/types'
import { VISITOR_KEYS } from '@babel/types'
import { ProjectDocumentError } from '../core/projectDocument'
import { rpgJavaScriptEdits } from './rpgJavaScript'
import { HISTORICAL_SOUND_METHODS } from './soundRules'
import type { MigrationChange } from './types'

interface Edit {
  start: number
  end: number
  text: string
}

function visit(
  node: Babel.Node,
  fn: (node: Babel.Node, parent?: Babel.Node) => void,
  parent?: Babel.Node,
): void {
  const pending: Array<{ node: Babel.Node; parent?: Babel.Node }> = [{ node, parent }]
  while (pending.length) {
    const { node, parent } = pending.pop()!
    fn(node, parent)
    const children = node as unknown as Record<string, unknown>
    for (const key of VISITOR_KEYS[node.type] ?? []) {
      const value = children[key]
      if (Array.isArray(value)) {
        for (const child of value)
          if (child && typeof child.type === 'string') pending.push({ node: child, parent: node })
      } else if (value && typeof value === 'object' && 'type' in value) {
        pending.push({ node: value as Babel.Node, parent: node })
      }
    }
  }
}

function patternContainsApi(node: Babel.Node | null | undefined): boolean {
  if (!node) return false
  let found = false
  visit(node, (child) => {
    if (child.type === 'Identifier' && ['SZGame2D', 'SZGameKit'].includes(child.name)) found = true
  })
  return found
}

/** Edita intervalos reconhecidos pela AST; comentários, espaços e texto manual sobrevivem. */
export function migrateGameTwoDJavaScript(
  source: string,
  changes: MigrationChange[],
  path: string,
): string {
  if (!source.includes('SZGame2D') && !source.includes('SZGameKit') && !source.includes('onDefeat'))
    return source
  if (source.length > 4_000_000)
    throw new ProjectDocumentError(
      'migration-pending',
      'Este arquivo excede o limite de análise do conversor.',
      path,
    )
  let tree: Babel.File
  try {
    const options = {
      sourceType: 'unambiguous',
      allowReturnOutsideFunction: true,
    } as const
    try {
      tree = parse(source, { ...options, plugins: ['typescript'] })
    } catch {
      tree = parse(source, { ...options, plugins: ['typescript', 'jsx'] })
    }
  } catch {
    throw new ProjectDocumentError(
      'migration-pending',
      'O código precisa ser revisado antes da conversão: não foi possível analisar sua estrutura.',
      path,
    )
  }
  let shadowed = false
  visit(tree, (node) => {
    if (node.type === 'VariableDeclarator' && patternContainsApi(node.id)) shadowed = true
    if (
      (node.type === 'FunctionDeclaration' ||
        node.type === 'FunctionExpression' ||
        node.type === 'ArrowFunctionExpression') &&
      (('id' in node && patternContainsApi(node.id)) || node.params.some(patternContainsApi))
    )
      shadowed = true
    if (
      (node.type === 'ClassDeclaration' || node.type === 'ClassExpression') &&
      patternContainsApi(node.id)
    )
      shadowed = true
    if (node.type === 'CatchClause' && patternContainsApi(node.param)) shadowed = true
    if (
      (node.type === 'ImportSpecifier' ||
        node.type === 'ImportDefaultSpecifier' ||
        node.type === 'ImportNamespaceSpecifier') &&
      ['SZGame2D', 'SZGameKit'].includes(node.local.name)
    )
      shadowed = true
  })
  const edits: Edit[] = rpgJavaScriptEdits(tree, path, changes)
  if (shadowed && edits.length)
    throw new ProjectDocumentError(
      'migration-pending',
      'O nome do motor foi redeclarado no código; seus escopos precisam de revisão.',
      path,
    )
  visit(tree, (node, parent) => {
    if (
      (node.type === 'MemberExpression' || node.type === 'OptionalMemberExpression') &&
      ((!node.computed &&
        node.property.type === 'Identifier' &&
        node.property.name === 'onDefeat') ||
        (node.computed &&
          node.property.type === 'StringLiteral' &&
          node.property.value === 'onDefeat'))
    )
      throw new ProjectDocumentError(
        'migration-pending',
        'A atribuição direta do evento de derrota precisa ser convertida para registro explícito.',
        path,
      )
    if (node.type === 'Identifier' && ['SZGame2D', 'SZGameKit'].includes(node.name) && !shadowed) {
      const receiver =
        (parent?.type === 'MemberExpression' || parent?.type === 'OptionalMemberExpression') &&
        parent.object === node
      const typeCheck = parent?.type === 'UnaryExpression' && parent.operator === 'typeof'
      if (!receiver && !typeCheck)
        throw new ProjectDocumentError(
          'migration-pending',
          'Uma referência indireta ao Jogo 2D precisa de revisão antes da conversão.',
          path,
        )
    }
    if (node.type !== 'MemberExpression' && node.type !== 'OptionalMemberExpression') return
    if (
      (!node.computed &&
        node.property.type === 'Identifier' &&
        ['SZGame2D', 'SZGameKit'].includes(node.property.name)) ||
      (node.computed &&
        node.property.type === 'StringLiteral' &&
        ['SZGame2D', 'SZGameKit'].includes(node.property.value))
    )
      throw new ProjectDocumentError(
        'migration-pending',
        'O acesso ao Jogo 2D por outro objeto precisa de revisão antes da conversão.',
        path,
      )
    if (node.object.type !== 'Identifier' || node.object.name !== 'SZGame2D') return
    const property = node.property
    const method =
      !node.computed && property.type === 'Identifier'
        ? property.name
        : node.computed && property.type === 'StringLiteral'
          ? property.value
          : null
    if (method === null)
      throw new ProjectDocumentError(
        'migration-pending',
        'Uma chamada dinâmica do Jogo 2D precisa de revisão antes da conversão.',
        path,
      )
    const fx = HISTORICAL_SOUND_METHODS[method]
    if (method === 'playBoom')
      throw new ProjectDocumentError(
        'migration-pending',
        'O código chama playBoom, que não era uma função pública do motor. Revise esse som.',
        path,
      )
    const music = method === 'stopMusic' || method === 'stopTrack'
    const tile = method === 'drawTileMap'
    if (!fx && !music && !tile) return
    if (shadowed)
      throw new ProjectDocumentError(
        'migration-pending',
        'O nome SZGame2D também foi declarado no código; a conversão precisa verificar seu escopo.',
        path,
      )
    if (
      !parent ||
      (parent.type !== 'CallExpression' && parent.type !== 'OptionalCallExpression') ||
      parent.callee !== node
    )
      throw new ProjectDocumentError(
        'migration-pending',
        'Uma função antiga foi guardada ou passada como valor; sua conversão precisa de revisão.',
        path,
      )
    if (property.start == null || property.end == null || parent.end == null)
      throw new ProjectDocumentError(
        'migration-pending',
        'A posição da chamada antiga não foi identificada.',
        path,
      )
    if (tile) {
      if (
        parent.arguments.some((argument) => argument.type === 'SpreadElement') ||
        node.type !== 'MemberExpression' ||
        parent.type !== 'CallExpression'
      )
        throw new ProjectDocumentError(
          'migration-pending',
          'O desenho dinâmico de mapa precisa de revisão.',
          path,
        )
      if (parent.arguments.length <= 2) return
      if (node.start == null || node.end == null)
        throw new ProjectDocumentError(
          'migration-pending',
          'O desenho de mapa não tem posição reconhecida.',
          path,
        )
      const callee = source.slice(node.start, node.end)
      edits.push({
        start: node.start,
        end: node.end,
        text: `((pincel, mapa, x, y, tamanho) => { SZGame2D.centerTileMap(pincel, mapa, x, y, tamanho); ${callee}(pincel, mapa); })`,
      })
      changes.push({ rule: 'g2d.explicit-map-layout', path: `${path}:${node.start}` })
      return
    }
    const first = parent.arguments[0]
    const at = first?.start ?? parent.end - 1
    if (at == null)
      throw new ProjectDocumentError(
        'migration-pending',
        'Os argumentos da chamada precisam de revisão.',
        path,
      )
    edits.push({
      start: property.start,
      end: property.end,
      text: node.computed
        ? JSON.stringify(music ? 'stopTrack' : 'playFx')
        : music
          ? 'stopTrack'
          : 'playFx',
    })
    const argument = music ? (method === 'stopMusic' ? 'synth' : 'all') : fx
    edits.push({ start: at, end: at, text: JSON.stringify(argument) + (first ? ', ' : '') })
    changes.push({
      rule: music ? 'g2d.music-scope-call' : 'g2d.sound-call',
      path: `${path}:${node.start}`,
    })
  })
  let result = source
  for (const edit of edits.sort((a, b) => b.start - a.start || b.end - a.end))
    result = result.slice(0, edit.start) + edit.text + result.slice(edit.end)
  return result
}
