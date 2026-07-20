import type { HTMLNode } from '#ir'

export interface HTMLAccessibilityIssue {
  blockId?: string
  message: string
}

const INPUT_TYPES_WITH_BROWSER_NAME = new Set(['submit', 'reset'])

function elementChildren(node: HTMLNode): HTMLNode[] {
  return node.type === 'element' || node.type === 'canvas' ? (node.children ?? []) : []
}

function textContent(node: HTMLNode): string {
  if (node.type === 'text') return node.text
  if (node.type === 'comment' || node.type === 'rawHTML') return ''
  const ownText = node.type === 'element' ? (node.text ?? '') : ''
  return [ownText, ...elementChildren(node).map(textContent)].join(' ').trim()
}

function labelledByText(
  node: Extract<HTMLNode, { type: 'element' }>,
  nodesById: ReadonlyMap<string, HTMLNode>,
): string {
  const ids = node.attrs?.['aria-labelledby']?.split(/\s+/).filter(Boolean) ?? []
  return ids
    .map((id) => nodesById.get(id))
    .filter((target): target is HTMLNode => Boolean(target))
    .map(textContent)
    .join(' ')
    .trim()
}

function hasAccessibleName(
  node: Extract<HTMLNode, { type: 'element' }>,
  nodesById: ReadonlyMap<string, HTMLNode>,
): boolean {
  return Boolean(
    node.attrs?.['aria-label']?.trim() || labelledByText(node, nodesById) || textContent(node),
  )
}

/**
 * Encontra lacunas de nome acessível que os blocos infantis conseguem corrigir.
 * É um contrato puro para que diagnóstico, testes e futuros consumidores não
 * precisem reconstruir as regras de associação de formulário.
 */
export function collectHTMLAccessibilityIssues(nodes: HTMLNode[]): HTMLAccessibilityIssue[] {
  const nodesById = new Map<string, HTMLNode>()
  const labelledControlIds = new Set<string>()
  const collectStack = [...nodes]
  while (collectStack.length > 0) {
    const node = collectStack.pop()
    if (!node) continue
    if (node.type === 'element' || node.type === 'canvas') {
      if (node.id) nodesById.set(node.id, node)
    }
    collectStack.push(...elementChildren(node))
  }

  const labelStack = [...nodes]
  while (labelStack.length > 0) {
    const node = labelStack.pop()
    if (!node) continue
    if (node.type === 'element' && node.tag === 'label' && hasAccessibleName(node, nodesById)) {
      const target = node.attrs?.for?.trim()
      if (target) labelledControlIds.add(target)
    }
    labelStack.push(...elementChildren(node))
  }

  const issues: HTMLAccessibilityIssue[] = []
  const stack = nodes.map((node) => ({ node, insideNamedLabel: false }))
  while (stack.length > 0) {
    const current = stack.pop()
    if (!current) continue
    const { node, insideNamedLabel } = current
    const isNamedLabel =
      node.type === 'element' && node.tag === 'label' && hasAccessibleName(node, nodesById)
    const nextInsideNamedLabel = insideNamedLabel || isNamedLabel

    if (node.type === 'element') {
      if (node.tag === 'img' && !Object.hasOwn(node.attrs ?? {}, 'alt')) {
        issues.push({
          blockId: node.__id,
          message:
            'Explique a imagem ou marque “só enfeite”. Assim leitores de tela sabem se devem anunciá-la.',
        })
      }

      if ((node.tag === 'button' || node.tag === 'a') && !hasAccessibleName(node, nodesById)) {
        issues.push({
          blockId: node.__id,
          message:
            node.tag === 'button'
              ? 'Escreva o que o botão faz. Assim todo mundo entende a ação antes de usá-la.'
              : 'Escreva para onde este link leva. Assim leitores de tela conseguem identificá-lo.',
        })
      }

      if (node.tag === 'label' && !isNamedLabel) {
        issues.push({
          blockId: node.__id,
          message: 'Escreva uma explicação para este campo dentro do rótulo.',
        })
      }

      const inputType = node.attrs?.type ?? ''
      const hasInputButtonName = inputType === 'button' && Boolean(node.attrs?.value?.trim())
      const needsAccessibleName =
        node.tag === 'textarea' ||
        (node.tag === 'input' &&
          !INPUT_TYPES_WITH_BROWSER_NAME.has(inputType) &&
          !hasInputButtonName)
      if (needsAccessibleName) {
        const hasAssociatedLabel = Boolean(node.id && labelledControlIds.has(node.id))
        if (!insideNamedLabel && !hasAssociatedLabel && !hasAccessibleName(node, nodesById)) {
          issues.push({
            blockId: node.__id,
            message:
              'Este campo precisa de uma explicação. Coloque-o dentro de “Explicar o campo” ou ligue essa explicação ao id do campo.',
          })
        }
      }
    }

    if (node.type === 'canvas' && !textContent(node)) {
      issues.push({
        blockId: node.__id,
        message:
          'Descreva o jogo ou desenho dentro da tela Canvas. Esse texto ajuda quem não consegue ver a imagem.',
      })
    }

    for (const child of elementChildren(node)) {
      stack.push({ node: child, insideNamedLabel: nextInsideNamedLabel })
    }
  }

  return issues
}
