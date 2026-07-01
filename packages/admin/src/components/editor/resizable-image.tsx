'use client'

import Image from '@tiptap/extension-image'
import {
  type NodeViewProps,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type Editor as TiptapEditor,
} from '@tiptap/react'
import { AlignCenter, AlignLeft, AlignRight } from 'lucide-react'
import { useRef } from 'react'
import { cn } from '@/lib/cn'

export type ImageAlign = 'left' | 'center' | 'right'
const ALIGNS: ImageAlign[] = ['left', 'center', 'right']
const MIN_WIDTH = 10
const MAX_WIDTH = 100

const clampWidth = (n: number): number => Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, Math.round(n)))

/**
 * Atributos de imagem (largura % + alinhamento) parseados do sufixo markdown
 * `{width=NN align=xx}`. Compartilha o MESMO contrato do renderer do aluno
 * (`member-shell/lib/markdown`), que lê o mesmo sufixo. Valores inválidos são
 * descartados (fallback: tamanho natural / alinhamento à esquerda).
 */
export function parseImageAttrs(raw: string): { width: number | null; align: ImageAlign | null } {
  let width: number | null = null
  let align: ImageAlign | null = null
  for (const part of raw.trim().split(/\s+/)) {
    const [k, v] = part.split('=')
    if (k === 'width' && v) {
      const n = Number.parseInt(v, 10)
      if (Number.isFinite(n)) width = clampWidth(n)
    } else if (k === 'align' && v && (ALIGNS as string[]).includes(v)) {
      align = v as ImageAlign
    }
  }
  return { width, align }
}

/** Estilo de alinhamento em BLOCO (espelha o renderer do aluno): margem auto. */
function alignStyle(align: ImageAlign | null): React.CSSProperties {
  if (align === 'center') return { marginLeft: 'auto', marginRight: 'auto' }
  if (align === 'right') return { marginLeft: 'auto', marginRight: 0 }
  return { marginLeft: 0, marginRight: 'auto' } // left (default)
}

/** NodeView: imagem com alça de arrastar (largura) + botões de alinhamento quando selecionada. */
function ResizableImageView(props: NodeViewProps) {
  const { node, updateAttributes, selected, editor } = props
  const width = (node.attrs.width as number | null) ?? null
  const align = (node.attrs.align as ImageAlign | null) ?? null
  const containerRef = useRef<HTMLDivElement>(null)

  function startResize(e: React.PointerEvent) {
    e.preventDefault()
    e.stopPropagation()
    const contentWidth = (editor as TiptapEditor).view.dom.clientWidth || 1
    const measured = containerRef.current?.getBoundingClientRect().width ?? 0
    const startPct = width ?? clampWidth((measured / contentWidth) * 100)
    const startX = e.clientX
    const onMove = (ev: PointerEvent) => {
      const deltaPct = ((ev.clientX - startX) / contentWidth) * 100
      updateAttributes({ width: clampWidth(startPct + deltaPct) })
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  // Wrapper em BLOCO; o container interno tem a largura% e é alinhado por margem.
  return (
    <NodeViewWrapper as="div" data-align={align ?? 'left'} style={{ lineHeight: 0 }}>
      <div
        ref={containerRef}
        className={cn(
          'relative inline-block max-w-full',
          selected && 'outline outline-2 outline-[color:var(--primary)]',
        )}
        style={{ width: width ? `${width}%` : undefined, ...alignStyle(align) }}
      >
        {/** biome-ignore lint/performance/noImgElement: imagem de R2 no editor (não é next/image) */}
        <img
          src={node.attrs.src as string}
          alt={(node.attrs.alt as string) ?? ''}
          draggable={false}
          className="block h-auto w-full rounded-md"
        />

        {selected ? (
          <>
            {/* Barra de alinhamento */}
            <div
              contentEditable={false}
              className="absolute top-1 left-1 flex gap-0.5 rounded-md bg-background/90 p-0.5 shadow-sm ring-1 ring-border"
              onMouseDown={(e) => e.preventDefault()}
            >
              {ALIGNS.map((a) => {
                const Icon = a === 'left' ? AlignLeft : a === 'center' ? AlignCenter : AlignRight
                const current = (align ?? 'left') === a
                return (
                  <button
                    key={a}
                    type="button"
                    title={`Alinhar à ${a === 'left' ? 'esquerda' : a === 'center' ? 'ao centro' : 'à direita'}`}
                    aria-pressed={current}
                    className={cn(
                      'flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground',
                      current && 'bg-muted text-foreground',
                    )}
                    onClick={() => updateAttributes({ align: a })}
                  >
                    <Icon className="size-3.5" />
                  </button>
                )
              })}
            </div>

            {/* Alça de arrastar (canto inferior direito) — resize por ponteiro; o
                alinhamento (acessível por teclado) fica nos botões acima. */}
            <div
              className="absolute right-0 bottom-0 size-4 cursor-nwse-resize rounded-tl-md rounded-br-md bg-[color:var(--primary)] ring-2 ring-background"
              title="Arraste para redimensionar"
              onPointerDown={startResize}
            />
            {/* Rótulo do tamanho atual */}
            <div
              contentEditable={false}
              className="absolute right-1 bottom-5 rounded bg-background/90 px-1 text-[10px] text-muted-foreground ring-1 ring-border"
            >
              {width ?? 100}%
            </div>
          </>
        ) : null}
      </div>
    </NodeViewWrapper>
  )
}

/**
 * Imagem REDIMENSIONÁVEL para o editor rich-text do admin (quiz/rich_text).
 * Estende `@tiptap/extension-image` com `width` (% 10–100) e `align`
 * (left/center/right), um NodeView com alça de arrastar + botões de alinhar, e
 * serialização markdown com o sufixo `{width=NN align=xx}` — que o renderer do
 * aluno (`member-shell/lib/markdown`) entende. Sem esses atributos, serializa
 * como `![](url)` normal (compat total com o conteúdo já existente).
 */
export const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (el) => {
          const dw = el.getAttribute('data-width')
          if (dw) {
            const n = Number.parseInt(dw, 10)
            return Number.isFinite(n) ? clampWidth(n) : null
          }
          const m = /width:\s*(\d+)%/.exec(el.getAttribute('style') ?? '')
          return m?.[1] ? clampWidth(Number.parseInt(m[1], 10)) : null
        },
        renderHTML: (attrs) =>
          attrs.width ? { 'data-width': String(attrs.width), style: `width:${attrs.width}%` } : {},
      },
      align: {
        default: null,
        parseHTML: (el) => {
          const a = el.getAttribute('data-align')
          return a && (ALIGNS as string[]).includes(a) ? a : null
        },
        renderHTML: (attrs) => (attrs.align ? { 'data-align': attrs.align } : {}),
      },
    }
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView)
  },

  addStorage() {
    return {
      markdown: {
        // Saída: `![alt](src "title"){width=NN align=xx}` (sufixo só quando há atributo).
        serialize(
          state: { write: (s: string) => void; closeBlock: (n: unknown) => void },
          node: {
            attrs: {
              src?: string
              alt?: string | null
              title?: string | null
              width?: number | null
              align?: ImageAlign | null
            }
          },
        ) {
          const alt = (node.attrs.alt ?? '').replace(/([[\]])/g, '\\$1')
          const src = (node.attrs.src ?? '').replace(/[()]/g, '\\$&')
          const title = node.attrs.title ? ` "${node.attrs.title.replace(/"/g, '\\"')}"` : ''
          const attrs: string[] = []
          if (node.attrs.width) attrs.push(`width=${node.attrs.width}`)
          if (node.attrs.align) attrs.push(`align=${node.attrs.align}`)
          const suffix = attrs.length > 0 ? `{${attrs.join(' ')}}` : ''
          state.write(`![${alt}](${src}${title})${suffix}`)
          // Imagem é node de BLOCO neste editor — fecha o bloco (espelha o default).
          state.closeBlock(node)
        },
        parse: {
          // markdown-it não entende `{width=…}`; após render, movemos o sufixo
          // (text node logo após o <img>) para data-attributes do próprio <img>.
          updateDOM(element: HTMLElement) {
            for (const img of Array.from(element.querySelectorAll('img'))) {
              const sib = img.nextSibling
              if (sib?.nodeType !== 3) continue
              const text = sib.textContent ?? ''
              const m = /^\{([^}]*)\}/.exec(text)
              if (!m?.[1]) continue
              const { width, align } = parseImageAttrs(m[1])
              if (width) img.setAttribute('data-width', String(width))
              if (align) img.setAttribute('data-align', align)
              sib.textContent = text.slice(m[0].length)
            }
          },
        },
      },
    }
  },
})
