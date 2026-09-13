import { parse as parseJavaScript } from '@babel/parser'
import type * as Babel from '@babel/types'
import { VISITOR_KEYS } from '@babel/types'
import { type DefaultTreeAdapterMap, parse as parseHTML } from 'parse5'
import { isDocumentRecord, ProjectDocumentError } from '../core/projectDocument'

/** Recarga da página não existe no motor atual: a preparação precisa ser explícita. */
export function assertConvertedLifecycle(document: Record<string, unknown>): void {
  const sources: string[] = []
  const add = (name: string, source: unknown) => {
    if (typeof source !== 'string') return
    if (/\.(?:js|mjs|ts|tsx|jsx)$/.test(name)) sources.push(source)
    if (!/\.html?$/.test(name)) return
    const pending: DefaultTreeAdapterMap['node'][] = [parseHTML(source)]
    while (pending.length) {
      const node = pending.pop()!
      if ('childNodes' in node) pending.push(...node.childNodes)
      if ('content' in node) pending.push(node.content)
      if (!('tagName' in node)) continue
      if (node.tagName === 'script' && !node.attrs.some((attr) => attr.name === 'src')) {
        const type = node.attrs.find((attr) => attr.name === 'type')?.value ?? ''
        if (!type || type === 'module' || /(?:java|ecma)script/.test(type))
          sources.push(
            node.childNodes
              .flatMap((child) =>
                child.nodeName === '#text' && 'value' in child ? [child.value] : [],
              )
              .join(''),
          )
      }
      for (const attr of node.attrs) if (attr.name.startsWith('on')) sources.push(attr.value)
    }
  }
  if (isDocumentRecord(document.files))
    for (const [name, source] of Object.entries(document.files)) add(name, source)
  if (Array.isArray(document.extraFiles))
    for (const file of document.extraFiles)
      if (isDocumentRecord(file) && typeof file.name === 'string') add(file.name, file.content)
  if (isDocumentRecord(document.tree))
    for (const [name, file] of Object.entries(document.tree))
      if (isDocumentRecord(file)) add(name, file.content)
  let restarts = false
  let starts = false
  for (const source of sources) {
    if (!source.includes('SZGame2D')) continue
    let ast: Babel.File
    try {
      ast = parseJavaScript(source, {
        sourceType: 'unambiguous',
        allowReturnOutsideFunction: true,
        plugins: ['typescript'],
      })
    } catch {
      try {
        ast = parseJavaScript(source, {
          sourceType: 'unambiguous',
          allowReturnOutsideFunction: true,
          plugins: ['typescript', 'jsx'],
        })
      } catch {
        throw new ProjectDocumentError(
          'migration-pending',
          'O código precisa ser analisado antes de converter o reinício do jogo.',
          '$.files',
        )
      }
    }
    const pending: Babel.Node[] = [ast]
    while (pending.length) {
      const node = pending.pop()!
      if (
        (node.type === 'CallExpression' || node.type === 'OptionalCallExpression') &&
        (node.callee.type === 'MemberExpression' ||
          node.callee.type === 'OptionalMemberExpression') &&
        node.callee.object.type === 'Identifier' &&
        node.callee.object.name === 'SZGame2D'
      ) {
        const property = node.callee.property
        const name = node.callee.computed
          ? property.type === 'StringLiteral'
            ? property.value
            : ''
          : property.type === 'Identifier'
            ? property.name
            : ''
        if (name === 'restart') restarts = true
        if (name === 'onStart') starts = true
      }
      const children = node as unknown as Record<string, unknown>
      for (const key of VISITOR_KEYS[node.type] ?? []) {
        const value = children[key]
        for (const child of Array.isArray(value) ? value : [value])
          if (child && typeof child === 'object' && 'type' in child)
            pending.push(child as Babel.Node)
      }
    }
  }
  if (restarts && !starts)
    throw new ProjectDocumentError(
      'migration-pending',
      'Este jogo reiniciava recarregando a página. Sua preparação precisa ser convertida para onStart antes da migração.',
      '$.files',
    )
}
