import type { HTMLNode } from '#ir'
import {
  isValidHTMLAutocomplete,
  isValidHTMLImageDimension,
  resolveHTMLInputTypeState,
} from './catalog'

export interface HTMLAccessibilityIssue {
  blockId?: string
  message: string
}

const INPUT_TYPES_NOT_REQUIRING_AUTHOR_NAME = new Set(['hidden', 'submit', 'reset'])
const LABELABLE_ELEMENT_TAGS = new Set([
  'button',
  'input',
  'meter',
  'output',
  'progress',
  'select',
  'textarea',
])
const GENERIC_IMAGE_ALTERNATIVES = new Set([
  'foto',
  'image',
  'imagem',
  'ícone',
  'icon',
  'photo',
  'picture',
])

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

function isDecorativeSVG(node: Extract<HTMLNode, { type: 'element' }>): boolean {
  const role = node.attrs?.role?.trim().toLowerCase()
  return (
    node.attrs?.['aria-hidden']?.trim().toLowerCase() === 'true' ||
    role === 'none' ||
    role === 'presentation'
  )
}

function hasSVGAccessibleName(
  node: Extract<HTMLNode, { type: 'element' }>,
  nodesById: ReadonlyMap<string, HTMLNode>,
): boolean {
  const hasTitle = elementChildren(node).some(
    (child) => child.type === 'element' && child.tag === 'title' && Boolean(textContent(child)),
  )
  return Boolean(node.attrs?.['aria-label']?.trim() || labelledByText(node, nodesById) || hasTitle)
}

function isLabelableElement(
  node: HTMLNode | undefined,
): node is Extract<HTMLNode, { type: 'element' }> {
  if (node?.type !== 'element' || !LABELABLE_ELEMENT_TAGS.has(node.tag)) return false
  return node.tag !== 'input' || resolveHTMLInputTypeState(node.attrs?.type ?? '') !== 'hidden'
}

function firstLabelableDescendant(node: HTMLNode): HTMLNode | undefined {
  const stack = [...elementChildren(node)].reverse()
  while (stack.length > 0) {
    const child = stack.pop()
    if (!child) continue
    if (isLabelableElement(child)) return child
    stack.push(...elementChildren(child).reverse())
  }
  return undefined
}

function elementsInDocumentOrder(nodes: HTMLNode[]): Array<Extract<HTMLNode, { type: 'element' }>> {
  const elements: Array<Extract<HTMLNode, { type: 'element' }>> = []
  const stack = [...nodes].reverse()
  while (stack.length > 0) {
    const node = stack.pop()
    if (!node) continue
    if (node.type === 'element') elements.push(node)
    stack.push(...elementChildren(node).reverse())
  }
  return elements
}

/**
 * Encontra lacunas de acessibilidade e de autoria HTML que os blocos infantis
 * conseguem corrigir. É um contrato puro para que diagnóstico, testes e
 * futuros consumidores não precisem reconstruir essas regras.
 */
export function collectHTMLAccessibilityIssues(nodes: HTMLNode[]): HTMLAccessibilityIssue[] {
  const nodesById = new Map<string, HTMLNode>()
  const labelledControls = new Set<HTMLNode>()
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
      const hasExplicitTarget = Object.hasOwn(node.attrs ?? {}, 'for')
      const target = hasExplicitTarget
        ? nodesById.get(node.attrs?.for?.trim() ?? '')
        : firstLabelableDescendant(node)
      if (isLabelableElement(target)) labelledControls.add(target)
    }
    labelStack.push(...elementChildren(node))
  }

  const issues: HTMLAccessibilityIssue[] = []
  let previousHeadingLevel = 0
  for (const heading of elementsInDocumentOrder(nodes)) {
    const match = /^h([1-6])$/.exec(heading.tag)
    if (!match) continue
    const level = Number(match[1])
    if (level > previousHeadingLevel + 1) {
      issues.push({
        blockId: heading.__id,
        message:
          previousHeadingLevel === 0
            ? `Comece os títulos com h1 antes de usar h${level}.`
            : `Não pule de h${previousHeadingLevel} para h${level}. Avance um nível de título por vez.`,
      })
    }
    previousHeadingLevel = level
  }
  const stack = [...nodes]
  while (stack.length > 0) {
    const node = stack.pop()
    if (!node) continue
    const isNamedLabel =
      node.type === 'element' && node.tag === 'label' && hasAccessibleName(node, nodesById)

    if (node.type === 'element') {
      if (node.tag === 'svg' && !isDecorativeSVG(node) && !hasSVGAccessibleName(node, nodesById)) {
        issues.push({
          blockId: node.__id,
          message:
            'Dê um nome ao desenho com “Dar um nome ao desenho”. Assim leitores de tela entendem o que ele mostra.',
        })
      }

      if (node.tag === 'img') {
        const attrs = node.attrs ?? {}
        const hasAlt = Object.hasOwn(attrs, 'alt')
        const alt = attrs.alt?.trim() ?? ''
        if (!hasAlt || (alt && GENERIC_IMAGE_ALTERNATIVES.has(alt.toLowerCase()))) {
          issues.push({
            blockId: node.__id,
            message:
              'Explique o que a imagem comunica ou marque “só enfeite”. Evite usar apenas palavras como “imagem” ou “foto”.',
          })
        }

        const width = attrs.width ?? ''
        const height = attrs.height ?? ''
        if (!width || !height) {
          issues.push({
            blockId: node.__id,
            message:
              'Informe a largura e a altura da imagem. Assim a página reserva o espaço antes de ela carregar.',
          })
        } else if (!isValidHTMLImageDimension(width) || !isValidHTMLImageDimension(height)) {
          issues.push({
            blockId: node.__id,
            message: 'Use números inteiros maiores que zero na largura e na altura da imagem.',
          })
        }
      }

      if (
        (node.tag === 'input' || node.tag === 'textarea') &&
        node.attrs?.autocomplete &&
        !isValidHTMLAutocomplete(node.attrs.autocomplete)
      ) {
        issues.push({
          blockId: node.__id,
          message:
            'Revise o preenchimento automático. Use valores como “name”, “email”, “off” ou “shipping street-address”.',
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

      if (node.tag === 'label') {
        const targetId = node.attrs?.for?.trim()
        if (targetId && !isLabelableElement(nodesById.get(targetId))) {
          issues.push({
            blockId: node.__id,
            message: `O rótulo aponta para “${targetId}”, mas não existe um campo com esse id.`,
          })
        }
      }

      const inputType = resolveHTMLInputTypeState(node.attrs?.type ?? '')
      const hasInputButtonName = inputType === 'button' && Boolean(node.attrs?.value?.trim())
      const needsAccessibleName =
        node.tag === 'textarea' ||
        (node.tag === 'input' &&
          !INPUT_TYPES_NOT_REQUIRING_AUTHOR_NAME.has(inputType) &&
          !hasInputButtonName)
      if (needsAccessibleName) {
        if (!labelledControls.has(node) && !hasAccessibleName(node, nodesById)) {
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
      stack.push(child)
    }
  }

  return issues
}
