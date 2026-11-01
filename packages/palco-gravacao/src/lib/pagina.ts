import type { Alvo } from './verbos'

/**
 * O que a ponte precisa saber da página do palco na hora de responder a uma ação: onde estão os
 * blocos, os campos e a pré-visualização do Estúdio. Cada elemento achado ganha uma marca própria
 * (`data-palco-alvo`), e o robô o procura por ela logo em seguida: a marca não muda nada na aula.
 */
export interface PaginaDoPalco {
  /** O tamanho da pré-visualização do jogo no Estúdio, ou nulo quando ela não está na tela. */
  previa(): { width: number; height: number } | null
  /** Um campo de bloco pelo texto (dentro do bloco que tem `bloco`, quando dado). */
  campo(texto: string, bloco?: string): { alvo: Alvo; menu: boolean } | null
  /** O espaço ao lado do rótulo de um bloco (o "fazer" de um Quando clicar ou tocar). */
  encaixe(bloco: string, rotulo: string): Alvo | null
  /** Um arrasto do fundo da área de trabalho que traz o bloco à vista (nulo se já está). */
  rolagem(bloco: string): { de: Alvo; para: Alvo } | 'visivel' | null
  /** Algum botão visível com este texto. */
  temBotao(texto: string): boolean
}

let marks = 0

/** Marca um elemento para o robô achá-lo, e devolve o seletor dele. */
function marcar(el: Element): string {
  const existing = el.getAttribute('data-palco-alvo')
  if (existing) return `[data-palco-alvo="${existing}"]`
  const id = `a${++marks}`
  el.setAttribute('data-palco-alvo', id)
  return `[data-palco-alvo="${id}"]`
}

const visivel = (el: Element): boolean => {
  const r = el.getBoundingClientRect()
  return r.width > 0 && r.height > 0
}

const texto = (el: Element): string => (el.textContent ?? '').replace(/\s+/g, ' ').trim()

const fold = (s: string): string =>
  s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim()

/** A área de trabalho principal do Estúdio (a paleta é outro SVG). */
const areaDeTrabalho = (doc: Document): SVGSVGElement | null => doc.querySelector('svg.blocklySvg')

/** Os blocos da área de trabalho cujo próprio texto (sem os blocos de dentro) contém `alvo`. */
function blocosCom(doc: Document, alvo: string): Element[] {
  const area = areaDeTrabalho(doc)
  if (!area) return []
  const wanted = fold(alvo)
  return [...area.querySelectorAll('.blocklyBlockCanvas .blocklyDraggable')].filter((block) => {
    const own = [...block.querySelectorAll('text.blocklyText')]
      .filter((t) => t.closest('.blocklyDraggable') === block)
      .map(texto)
      .join(' ')
    return fold(own).includes(wanted)
  })
}

/** Os textos que são do próprio bloco, não dos blocos encaixados nele. */
const textosDe = (block: Element): Element[] =>
  [...block.querySelectorAll('text.blocklyText')].filter(
    (t) => t.closest('.blocklyDraggable') === block,
  )

/** Um ponto de um elemento como alvo do robô (u, v de 0 a 1 da caixa dele). */
function pontoEm(el: Element, x: number, y: number): Alvo {
  const r = el.getBoundingClientRect()
  return {
    seletor: marcar(el),
    u: Math.min(1, Math.max(0, (x - r.left) / r.width)),
    v: Math.min(1, Math.max(0, (y - r.top) / r.height)),
  }
}

export function paginaDe(doc: Document): PaginaDoPalco {
  return {
    previa() {
      const frame = doc.querySelector('iframe[title="Pré-visualização"]')
      if (!frame || !visivel(frame)) return null
      const r = frame.getBoundingClientRect()
      return { width: r.width, height: r.height }
    },

    campo(valor, bloco) {
      const wanted = fold(valor)
      const blocos = bloco ? blocosCom(doc, bloco) : null
      const area = areaDeTrabalho(doc)
      if (!area) return null
      const candidatos = [
        ...area.querySelectorAll('.blocklyEditableField text.blocklyText'),
      ].filter(
        (t) =>
          visivel(t) &&
          fold(texto(t).replace(/▾/g, '')) === wanted &&
          (!blocos || blocos.some((b) => t.closest('.blocklyDraggable') === b)),
      )
      const found = candidatos[0]
      if (!found) return null
      const field = found.closest('.blocklyEditableField') ?? found
      const r = field.getBoundingClientRect()
      return {
        alvo: pontoEm(field, r.left + r.width / 2, r.top + r.height / 2),
        menu: field.classList.contains('blocklyDropdownField'),
      }
    },

    encaixe(bloco, rotulo) {
      const wanted = fold(rotulo)
      for (const block of blocosCom(doc, bloco)) {
        const label = textosDe(block).find((t) => fold(texto(t)) === wanted)
        if (!label) continue
        const r = label.getBoundingClientRect()
        // O espaço vazio começa logo depois do rótulo: o bloco solto ali encaixa.
        return pontoEm(block, r.right + 16, r.top + r.height / 2)
      }
      return null
    },

    rolagem(bloco) {
      const area = areaDeTrabalho(doc)
      const block = blocosCom(doc, bloco)[0]
      if (!area || !block) return null
      const view = area.getBoundingClientRect()
      const b = block.getBoundingClientRect()
      const inside =
        b.top >= view.top && b.bottom <= view.bottom && b.left >= view.left && b.right <= view.right
      if (inside) return 'visivel'
      // Um ponto do fundo, sem bloco em cima, de onde arrastar.
      const fundo = (x: number, y: number) =>
        doc.elementFromPoint(x, y)?.classList.contains('blocklyMainBackground') === true
      let start: { x: number; y: number } | null = null
      for (const fy of [0.5, 0.3, 0.7, 0.15, 0.85])
        for (const fx of [0.5, 0.75, 0.25, 0.9, 0.1]) {
          const x = view.left + view.width * fx
          const y = view.top + view.height * fy
          if (!start && fundo(x, y)) start = { x, y }
        }
      if (!start) return null
      // Leva o bloco para perto do topo, à esquerda do meio, até onde o arrasto alcança.
      const dx = view.left + view.width * 0.35 - (b.left + Math.min(b.width, view.width) / 2)
      const dy = view.top + view.height * 0.3 - b.top
      const end = {
        x: Math.min(view.right - 4, Math.max(view.left + 4, start.x + dx)),
        y: Math.min(view.bottom - 4, Math.max(view.top + 4, start.y + dy)),
      }
      return { de: pontoEm(area, start.x, start.y), para: pontoEm(area, end.x, end.y) }
    },

    temBotao(nome) {
      const wanted = fold(nome)
      return [...doc.querySelectorAll('button')].some(
        (b) => visivel(b) && fold(texto(b)) === wanted,
      )
    },
  }
}
