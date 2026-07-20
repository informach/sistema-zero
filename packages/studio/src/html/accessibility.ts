import type { HTMLNode } from '#ir'

export interface HTMLAccessibilityIssue {
  blockId?: string
  message: string
}

const SELF_NAMED_INPUT_TYPES = new Set(['button', 'submit', 'reset'])

function elementChildren(node: HTMLNode): HTMLNode[] {
  return node.type === 'element' || node.type === 'canvas' ? (node.children ?? []) : []
}

/**
 * Encontra lacunas de nome acessível que os blocos infantis conseguem corrigir.
 * É um contrato puro para que diagnóstico, testes e futuros consumidores não
 * precisem reconstruir as regras de associação de formulário.
 */
export function collectHTMLAccessibilityIssues(nodes: HTMLNode[]): HTMLAccessibilityIssue[] {
  const ids = new Set<string>()
  const labelledControlIds = new Set<string>()
  const collectStack = [...nodes]
  while (collectStack.length > 0) {
    const node = collectStack.pop()
    if (!node) continue
    if (node.type === 'element') {
      if (node.id) ids.add(node.id)
      if (node.tag === 'label') {
        const target = node.attrs?.for?.trim()
        if (target) labelledControlIds.add(target)
      }
    }
    collectStack.push(...elementChildren(node))
  }

  const issues: HTMLAccessibilityIssue[] = []
  const stack = nodes.map((node) => ({ node, insideLabel: false }))
  while (stack.length > 0) {
    const current = stack.pop()
    if (!current) continue
    const { node, insideLabel } = current
    const nextInsideLabel = insideLabel || (node.type === 'element' && node.tag === 'label')

    if (node.type === 'element') {
      if (node.tag === 'img' && !Object.hasOwn(node.attrs ?? {}, 'alt')) {
        issues.push({
          blockId: node.__id,
          message:
            'Explique a imagem ou marque “só enfeite”. Assim leitores de tela sabem se devem anunciá-la.',
        })
      }

      const isTextControl =
        node.tag === 'textarea' ||
        (node.tag === 'input' && !SELF_NAMED_INPUT_TYPES.has(node.attrs?.type ?? ''))
      if (isTextControl) {
        const ariaLabel = node.attrs?.['aria-label']?.trim()
        const labelledBy = node.attrs?.['aria-labelledby']
          ?.split(/\s+/)
          .filter(Boolean)
          .some((id) => ids.has(id))
        const hasAssociatedLabel = Boolean(node.id && labelledControlIds.has(node.id))
        if (!insideLabel && !hasAssociatedLabel && !ariaLabel && !labelledBy) {
          issues.push({
            blockId: node.__id,
            message:
              'Este campo precisa de uma explicação. Coloque-o dentro de “Explicar o campo” ou ligue essa explicação ao id do campo.',
          })
        }
      }
    }

    for (const child of elementChildren(node)) {
      stack.push({ node: child, insideLabel: nextInsideLabel })
    }
  }

  return issues
}
