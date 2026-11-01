import type { Alvo } from './verbos'

/**
 * O que a ponte precisa saber da página do palco na hora de responder a uma ação: onde estão os
 * blocos, os campos e a pré-visualização do Estúdio. Cada elemento achado ganha uma marca própria
 * (`data-palco-alvo`), e o robô o procura por ela logo em seguida: a marca não muda nada na aula.
 */
export interface PaginaDoPalco {
  /** O tamanho da pré-visualização do jogo no Estúdio, ou nulo quando ela não está na tela. */
  previa(): { width: number; height: number } | null
  /**
   * Um campo de bloco pelo texto (dentro do bloco que tem `bloco`, quando dado): um menu do
   * Blockly, um número, ou outro campo (texto ou um seletor do Estúdio, que só se sabe depois
   * de clicar).
   */
  campo(
    texto: string,
    bloco?: string,
  ): { alvo: Alvo; tipo: 'menu' | 'numero' | 'outro'; bloco: string } | null
  /** O que o campo clicado abriu: a lista de um menu ou seletor, ou a caixa de digitar. */
  aberto(): 'lista' | 'caixa' | null
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
  /**
   * Um ponto do fundo da área de código ao lado de um bloco, sem bloco nenhum embaixo: a mão
   * parada em cima de um bloco faz o Blockly mostrar a dica dele.
   */
  perto(bloco: string): Alvo | null
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
  // A caixa encostada na borda e, encostada nela, a paleta aberta.
  const lados = [toolbox(doc), paleta(doc)]
  for (const lado of lados) {
    const r = lado?.getBoundingClientRect()
    if (r && r.width > 0 && r.height > 0 && r.left <= left + 8) left = Math.max(left, r.right)
  }
  return new DOMRect(left, view.top, view.right - left, view.height)
}

const toolbox = (doc: Document): Element | null => doc.querySelector('.blocklyToolbox')

/**
 * A paleta aberta: o Estúdio tem mais de um `svg.blocklyFlyout` (o da lixeira fica escondido,
 * com tamanho zero), e o primeiro da página não é o da caixa de categorias.
 */
const paleta = (doc: Document): Element | null =>
  [...doc.querySelectorAll('svg.blocklyFlyout')].find(visivel) ?? null

/**
 * O bloco de que um texto ou campo é: o primeiro que não é sombra. O número de um bloco ("50" em
 * "Deixar o sprite jogador com 50% de visibilidade", o "1" de "Somar 1") fica num bloco-sombra
 * encaixado nele, que é dele.
 */
function donoDe(el: Element): Element | null {
  let dono = el.closest('.blocklyDraggable')
  while (dono?.classList.contains('blocklyShadow'))
    dono = dono.parentElement?.closest('.blocklyDraggable') ?? null
  return dono
}

/** O texto que é do próprio bloco, sem o dos blocos encaixados nele. */
const textoProprio = (block: Element): string =>
  fold(
    [...block.querySelectorAll('text.blocklyText')]
      .filter((t) => donoDe(t) === block)
      .map(texto)
      .join(' ')
      .replace(/▾/g, ''),
  )

/**
 * Os blocos visíveis da área de trabalho ou da paleta cujo texto começa com `alvo` (ou o contém,
 * quando nenhum começa).
 */
function blocosCom(doc: Document, alvo: string, onde: 'area' | 'paleta' = 'area'): Element[] {
  const raiz = onde === 'area' ? areaDeTrabalho(doc) : paleta(doc)
  if (!raiz) return []
  const wanted = fold(alvo)
  const blocos = [...raiz.querySelectorAll('.blocklyBlockCanvas .blocklyDraggable')].filter(visivel)
  const comecam = blocos.filter((b) => textoProprio(b).startsWith(wanted))
  return comecam.length ? comecam : blocos.filter((b) => textoProprio(b).includes(wanted))
}

/** Os textos que são do próprio bloco, não dos blocos encaixados nele. */
const textosDe = (block: Element): Element[] =>
  [...block.querySelectorAll('text.blocklyText')].filter((t) => donoDe(t) === block)

/** O primeiro rótulo fixo do bloco, o mais acima e à esquerda (um número de sombra vem antes no DOM). */
const rotuloDe = (block: Element): Element | undefined =>
  textosDe(block)
    .filter((t) => !t.closest('.blocklyEditableField'))
    .map((t) => ({ t, r: t.getBoundingClientRect() }))
    .sort((a, b) => a.r.top - b.r.top || a.r.left - b.r.left)[0]?.t

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
          (!blocos || blocos.some((b) => donoDe(t) === b)),
      )
      const found = candidatos[0]
      if (!found) return null
      const field = found.closest('.blocklyEditableField') ?? found
      const r = field.getBoundingClientRect()
      const dono = donoDe(field)
      return {
        alvo: pontoEm(field, r.left + r.width / 2, r.top + r.height / 2),
        // O começo do texto do bloco do campo: é por ele que a mão se afasta depois.
        bloco: (dono && rotuloDe(dono)?.textContent?.trim()) || (bloco ?? ''),
        // Os seletores do Estúdio (sprite, nome, som) herdam do campo de texto do Blockly e
        // abrem uma lista: pela classe, só se distinguem depois de clicar ("outro").
        tipo:
          field.classList.contains('blocklyDropdownField') ||
          field.classList.contains('blocklyVariableField')
            ? 'menu'
            : field.classList.contains('blocklyNumberField')
              ? 'numero'
              : 'outro',
      }
    },

    aberto() {
      const lista = doc.querySelector('.blocklyDropDownDiv')
      // Fechada, a lista do Blockly fica com `display: none`, sem tamanho.
      if (lista && visivel(lista)) return 'lista'
      const caixa = doc.querySelector('input.blocklyHtmlInput')
      return caixa && visivel(caixa) ? 'caixa' : null
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
      // Leva o bloco para o centro da área de código, onde a criança o vê melhor, até onde o
      // arrasto alcança (um bloco maior que a área fica com o topo perto do alto). A paleta que
      // abrir por cima dele fecha quando o próximo bloco sai dela.
      const centro = (inicio: number, tamanho: number, area: number) =>
        tamanho >= area * 0.8 ? area * 0.1 - inicio : area / 2 - (inicio + tamanho / 2)
      const dx = centro(b.left - view.left, b.width, view.width)
      const dy = centro(b.top - view.top, b.height, view.height)
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
      // da barra dele, no fundo da área. O texto é o alvo, e o robô do EdiAula deixa a mão logo
      // abaixo dele, sem cobrir o que está escrito.
      const rotulo = rotuloDe(block)
      if (!rotulo) return pontoEm(block, r.left + 12, r.top + Math.min(r.height / 2, 18))
      const t = rotulo.getBoundingClientRect()
      return pontoEm(rotulo, t.left + t.width / 2, t.top + t.height / 2)
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

    perto(texto) {
      const area = areaDeTrabalho(doc)
      const block = blocosCom(doc, texto)[0]
      if (!area || !block) return null
      const view = areaVisivel(doc, area)
      // A primeira linha do bloco: os textos e campos dele na altura do primeiro rótulo.
      const pecas = textosDe(block).map((t) =>
        (t.closest('.blocklyEditableField') ?? t).getBoundingClientRect(),
      )
      const topo = pecas.sort((a, b) => a.top - b.top)[0]
      if (!topo) return null
      const linha = pecas.filter(
        (r) => Math.abs(r.top + r.height / 2 - (topo.top + topo.height / 2)) < topo.height,
      )
      const direita = Math.max(...linha.map((r) => r.right))
      const meio = topo.top + topo.height / 2
      const b = block.getBoundingClientRect()
      const fundo = (x: number, y: number) =>
        x > view.left + 4 &&
        x < view.right - 4 &&
        y > view.top + 4 &&
        y < view.bottom - 4 &&
        doc.elementFromPoint(x, y)?.classList.contains('blocklyMainBackground') === true
      for (const [x, y] of [
        [direita + 28, meio],
        [direita + 56, meio],
        [b.left - 24, meio],
        [b.left + 24, b.top - 16],
        [direita + 28, meio + topo.height],
      ] as const)
        if (fundo(x, y)) return pontoEm(area, x, y)
      return null
    },

    temBotao(nome) {
      const wanted = fold(nome)
      return [...doc.querySelectorAll('button')].some(
        (b) => visivel(b) && fold(texto(b)) === wanted,
      )
    },
  }
}
