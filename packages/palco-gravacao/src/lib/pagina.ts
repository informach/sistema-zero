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
  /**
   * Um bloco pelo começo do texto dele, como aparece na tela ("Deixar o sprite" acha "Deixar o
   * sprite jogador com 50% de visibilidade"): na paleta, pego pela borda esquerda, ou na área de
   * trabalho, pelo meio.
   */
  bloco(texto: string, area: 'paleta' | 'area'): Alvo | null
  /** O ponto logo abaixo de um bloco da área de trabalho, onde outro bloco encaixa embaixo dele. */
  abaixo(bloco: string): Alvo | null
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

// A barra de um rótulo é dita "ou": o bloco "Quando clicar/tocar" é "Quando clicar ou tocar" na fala.
const fold = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s*\/\s*/g, ' ou ')
    .replace(/\s+/g, ' ')
    .trim()

/** A área de trabalho principal do Estúdio (a paleta é outro SVG). */
const areaDeTrabalho = (doc: Document): SVGSVGElement | null => doc.querySelector('svg.blocklySvg')

/**
 * A parte da área de trabalho que aparece: o SVG passa por baixo da caixa de categorias (e da
 * paleta aberta), à esquerda, então o que fica à vista começa à direita delas.
 */
function areaVisivel(doc: Document, area: Element): DOMRect {
  const view = area.getBoundingClientRect()
  let left = view.left
  for (const lado of doc.querySelectorAll('.blocklyToolbox, svg.blocklyFlyout')) {
    const r = lado.getBoundingClientRect()
    if (r.width > 0 && r.height > 0 && r.left <= view.left + 8) left = Math.max(left, r.right)
  }
  return new DOMRect(left, view.top, view.right - left, view.height)
}

/** O texto que é do próprio bloco, sem o dos blocos encaixados nele. */
const textoProprio = (block: Element): string =>
  fold(
    [...block.querySelectorAll('text.blocklyText')]
      .filter((t) => t.closest('.blocklyDraggable') === block)
      .map(texto)
      .join(' ')
      .replace(/▾/g, ''),
  )

/**
 * Os blocos visíveis da área de trabalho ou da paleta cujo texto começa com `alvo` (ou o contém,
 * quando nenhum começa).
 */
function blocosCom(doc: Document, alvo: string, onde: 'area' | 'paleta' = 'area'): Element[] {
  const raiz = onde === 'area' ? areaDeTrabalho(doc) : doc.querySelector('svg.blocklyFlyout')
  if (!raiz) return []
  const wanted = fold(alvo)
  const blocos = [...raiz.querySelectorAll('.blocklyBlockCanvas .blocklyDraggable')].filter(visivel)
  const comecam = blocos.filter((b) => textoProprio(b).startsWith(wanted))
  return comecam.length ? comecam : blocos.filter((b) => textoProprio(b).includes(wanted))
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
        const area = areaDeTrabalho(doc)
        if (!area) return null
        // O espaço vazio começa logo depois do rótulo: o bloco solto ali encaixa. O ponto é da área
        // de trabalho, porque fica fora da caixa do bloco quando o espaço está vazio.
        return pontoEm(area, r.right + 16, r.top + r.height / 2)
      }
      return null
    },

    rolagem(bloco) {
      const area = areaDeTrabalho(doc)
      const block = blocosCom(doc, bloco)[0]
      if (!area || !block) return null
      const view = areaVisivel(doc, area)
      const b = block.getBoundingClientRect()
      const inside =
        b.top >= view.top && b.bottom <= view.bottom && b.left >= view.left && b.right <= view.right
      if (inside) return 'visivel'
      // Um ponto do fundo, sem bloco em cima, de onde arrastar.
      const fundo = (x: number, y: number) =>
        doc.elementFromPoint(x, y)?.classList.contains('blocklyMainBackground') === true
      // Leva o bloco para perto do topo, à esquerda do meio, até onde o arrasto alcança.
      const dx = view.left + view.width * 0.35 - (b.left + Math.min(b.width, view.width) / 2)
      const dy = view.top + view.height * 0.3 - b.top
      // Começa do lado de onde o bloco vem: o arrasto inteiro cabe na área à vista.
      const xs = dx < 0 ? [0.9, 0.75, 0.5, 0.25, 0.1] : [0.1, 0.25, 0.5, 0.75, 0.9]
      const ys = dy < 0 ? [0.85, 0.7, 0.5, 0.3, 0.15] : [0.15, 0.3, 0.5, 0.7, 0.85]
      let start: { x: number; y: number } | null = null
      for (const fy of ys)
        for (const fx of xs) {
          const x = view.left + view.width * fx
          const y = view.top + view.height * fy
          if (!start && fundo(x, y)) start = { x, y }
        }
      if (!start) return null
      const end = {
        x: Math.min(view.right - 4, Math.max(view.left + 4, start.x + dx)),
        y: Math.min(view.bottom - 4, Math.max(view.top + 4, start.y + dy)),
      }
      return { de: pontoEm(area, start.x, start.y), para: pontoEm(area, end.x, end.y) }
    },

    bloco(texto, onde) {
      const block = blocosCom(doc, texto, onde)[0]
      if (!block) return null
      const r = block.getBoundingClientRect()
      // Da paleta, o bloco é pego pela borda esquerda, como uma pessoa pega.
      if (onde === 'paleta')
        return pontoEm(
          block,
          r.left + Math.min(12, r.width / 4),
          r.top + Math.min(r.height / 2, 18),
        )
      // Na área, apontado no texto dele: o meio da caixa de um bloco com outros dentro cai fora
      // da barra dele, no fundo da área.
      const rotulo = textosDe(block)[0]
      if (!rotulo) return pontoEm(block, r.left + 12, r.top + Math.min(r.height / 2, 18))
      const t = rotulo.getBoundingClientRect()
      return pontoEm(block, t.left + t.width / 2, t.top + t.height / 2)
    },

    abaixo(texto) {
      const area = areaDeTrabalho(doc)
      const block = blocosCom(doc, texto)[0]
      if (!area || !block) return null
      // O caminho do próprio bloco, sem os de dentro: o encaixe de baixo fica no fim dele.
      const path = [...block.querySelectorAll('path.blocklyPath')].find(
        (p) => p.closest('.blocklyDraggable') === block,
      )
      const r = (path ?? block).getBoundingClientRect()
      return pontoEm(area, r.left + 12, r.bottom + 10)
    },

    temBotao(nome) {
      const wanted = fold(nome)
      return [...doc.querySelectorAll('button')].some(
        (b) => visivel(b) && fold(texto(b)) === wanted,
      )
    },
  }
}
