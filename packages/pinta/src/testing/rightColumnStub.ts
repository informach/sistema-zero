/**
 * Stub de MEDIDA da coluna direita dos editores para os testes do accordion:
 * happy-dom não faz layout (`scrollHeight`/`clientHeight` = 0), então a régua
 * de encaixe (`VectorRightColumn`) é inerte por padrão. Aqui a coluna ganha
 * uma altura "medida" derivada do DOM: painel aberto = 250, recolhido = 50,
 * vãos de 8 — números redondos só para a régua ter o que comparar.
 *
 * ⚠️ O modelo não sabe que a Aparência CRESCE (sub-painéis condicionais de
 * fonte/alinhamento/cantos): o caso "texto selecionado rola a coluna" é
 * inexprimível aqui e fica no QA de navegador.
 */
import { COPY } from '../core/copy'

export const RIGHT_COLUMN_STUB = { opened: 250, collapsed: 50, gap: 8 } as const

const PANEL_TITLES = [
  COPY.animation.preview,
  COPY.layers.title,
  COPY.palette.title,
  COPY.vector.appearance,
]

/** A coluna direita do editor aberto (vetor ou pixel). */
export function rightColumn(): HTMLElement {
  const column = document.querySelector<HTMLElement>('[data-pin-right-column]')
  if (!column) throw new Error('coluna direita esperada')
  return column
}

/** Altura "medida" pela contagem dos botões Recolher/Mostrar de cada painel. */
export function stubbedColumnHeight(column: HTMLElement): number {
  const count = (label: (title: string) => string): number =>
    PANEL_TITLES.filter((title) => column.querySelector(`button[aria-label="${label(title)}"]`))
      .length
  const opened = count(COPY.panel.collapse)
  const closed = count(COPY.panel.expand)
  const { opened: o, collapsed: c, gap } = RIGHT_COLUMN_STUB
  return opened * o + closed * c + Math.max(0, opened + closed - 1) * gap
}

/** Stub VIVO na instância: `clientHeight` fixo, `scrollHeight` recontado a cada leitura. */
export function stubColumn(column: HTMLElement, clientHeight: number): void {
  Object.defineProperties(column, {
    clientHeight: { configurable: true, value: clientHeight },
    scrollHeight: {
      configurable: true,
      get: () => stubbedColumnHeight(column),
    },
  })
}

/** O protótipo que de fato define a propriedade (happy-dom a põe em Element ou HTMLElement). */
function findOwner(property: string): object {
  let proto: object | null = HTMLElement.prototype
  while (proto && !Object.getOwnPropertyDescriptor(proto, property)) {
    proto = Object.getPrototypeOf(proto)
  }
  if (!proto) throw new Error(`nenhum protótipo define ${property}`)
  return proto
}

/**
 * Para o encaixe no MOUNT: a coluna só existe depois do render, então o stub
 * vai no PROTÓTIPO e vale só para o elemento marcado (os outros seguem com o
 * 0 de sempre). Instala e RESTAURA dentro do mesmo try/finally: o bun roda os
 * arquivos no mesmo processo, e um protótipo vazado quebraria outros testes.
 */
export async function withRightColumnPrototypeStub(
  clientHeight: number,
  run: () => Promise<void>,
): Promise<void> {
  const owners = {
    scrollHeight: findOwner('scrollHeight'),
    clientHeight: findOwner('clientHeight'),
  }
  const saved = {
    scrollHeight: Object.getOwnPropertyDescriptor(owners.scrollHeight, 'scrollHeight'),
    clientHeight: Object.getOwnPropertyDescriptor(owners.clientHeight, 'clientHeight'),
  }
  if (!saved.scrollHeight || !saved.clientHeight) throw new Error('descritores esperados')
  const isColumn = (el: unknown): el is HTMLElement =>
    el instanceof HTMLElement && el.hasAttribute('data-pin-right-column')
  try {
    Object.defineProperty(owners.clientHeight, 'clientHeight', {
      configurable: true,
      get(this: unknown) {
        return isColumn(this) ? clientHeight : 0
      },
    })
    Object.defineProperty(owners.scrollHeight, 'scrollHeight', {
      configurable: true,
      get(this: unknown) {
        return isColumn(this) ? stubbedColumnHeight(this) : 0
      },
    })
    await run()
  } finally {
    Object.defineProperty(owners.scrollHeight, 'scrollHeight', saved.scrollHeight)
    Object.defineProperty(owners.clientHeight, 'clientHeight', saved.clientHeight)
  }
}
