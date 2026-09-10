/**
 * O INVENTÁRIO da oficina: tudo o que a criança alcança, em estados canônicos.
 *
 * ⚠️⚠️ Este arquivo existe por causa do redesenho da interface, e o motivo é preciso: o
 * redesenho **esconde coisas de propósito** (comum e fácil à vista, raro e difícil recolhido),
 * e o risco central não é quebrar — é PERDER um comando pelo caminho sem ninguém notar.
 *
 * O que ele prova e o que não prova, para ninguém confundir depois:
 *
 * - **Prova**: nenhum controle foi DESMONTADO nem foi parar dentro de um painel que não abre.
 *   São duas fases — como renderizado, e depois de abrir toda revelação. A fase 1 pega
 *   "sumiu"; a fase 2 pega "foi para dentro de um `<details>` preguiçoso".
 * - **NÃO prova** que a criança VÊ o controle. O happy-dom mostra `<details>` fechado
 *   (`DETAILS: 'display: block;'`, sem ramo `open`) e não aplica classe do Tailwind, então
 *   `hidden` de utilitária é invisível aqui. Visibilidade real é do Playwright, em
 *   `e2e/scene-workshop-layout.spec.ts`.
 *
 * Por isso o inventário é comparado como CONJUNTO, nunca como ordem: reordenar é exatamente
 * o que o redesenho faz, e reordenar não pode reprovar.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { act, cleanup, render } from '@testing-library/react'
import { COPY } from '../../../core/copy'
import { structuredBytes } from '../../../core/structuredBytes'
import { addScenePrimitive } from '../../../scene/commands'
import type { MoldaSceneDocument } from '../../../scene/document'
import { migrateLegacyModel } from '../../../scene/migrateLegacy'
import { createDocumentEditorStore } from '../../../state/editorStore'
import { controlInventory, openEveryDisclosure } from '../../../testing/domContract'
import { makeModel } from '../../../testing/fixtures'
import { sceneViewportProbe } from '../../../testing/sceneViewportProbe'
import { SceneWorkshop } from './SceneWorkshop'

const copy = COPY.scene

function mount(asset: MoldaSceneDocument) {
  const editor = createDocumentEditorStore({
    asset,
    sizeOf: structuredBytes,
    persistence: { save: async () => undefined },
    autosaveMs: 60_000,
  })
  const probe = sceneViewportProbe()
  const view = render(
    <SceneWorkshop editor={editor} viewportFactory={probe.factory} onExit={() => {}} />,
  )
  return { editor, view, probe }
}

/**
 * Só o papel e o nome, sem "ligado/desligado". A comparação de "nada sumiu" é POR NOME: um
 * comando que passa de desligado a ligado quando a criança escolhe uma peça continua sendo o
 * mesmo comando, e isso é comportamento certo, não perda.
 */
const names = (controls: string[]): string[] => controls.map((c) => c.replace(' [desligado]', ''))

/** Os dois retratos: o que está montado, e o que aparece ao abrir tudo o que dá para abrir. */
function inventory(container: HTMLElement): { rendered: string[]; expanded: string[] } {
  const rendered = controlInventory(container)
  act(() => {
    openEveryDisclosure(container)
  })
  return { rendered, expanded: controlInventory(container) }
}

/** Escolher como a criança escolhe: pelo botão da peça na hierarquia. */
function choosePiece(container: HTMLElement): void {
  const button = container.querySelector<HTMLButtonElement>('button[aria-label^="Escolher "]')
  if (!button) throw new Error('a hierarquia não ofereceu nenhuma peça para escolher')
  act(() => {
    button.click()
  })
}

const withPiece = (): MoldaSceneDocument => {
  const base = migrateLegacyModel(makeModel()).document
  return addScenePrimitive(base, 'box', 'Bloco')
}

beforeEach(() => {
  cleanup()
})
afterEach(() => {
  cleanup()
})

describe('inventário da oficina: o que a criança alcança', () => {
  test('o estado padrão tem os comandos de sempre, e abrir revelações só ACRESCENTA', () => {
    const { view } = mount(migrateLegacyModel(makeModel()).document)
    const { rendered, expanded } = inventory(view.container)

    // A âncora é por NOME acessível, que é o que `ToolButton` preserva ao virar ícone: este
    // teste continua valendo depois de o texto virar glifo. Ligado ou desligado não importa
    // aqui — o que se prova é que o comando EXISTE e tem nome.
    const present = (name: string): boolean =>
      rendered.some((control) => control.startsWith(`button: ${name}`))
    for (const name of [copy.addSelection, copy.save, copy.backup, COPY.editor.undo])
      expect(present(name), `sumiu do estado padrão: ${name}`).toBe(true)

    // Abrir revelação nunca TIRA nada: é a invariante que a hierarquização não pode violar.
    for (const control of names(rendered)) expect(names(expanded)).toContain(control)
    expect(expanded.length).toBeGreaterThanOrEqual(rendered.length)
  })

  test('com uma peça escolhida o inventário CRESCE, e não troca de conjunto', () => {
    const vazio = mount(migrateLegacyModel(makeModel()).document)
    const base = inventory(vazio.view.container).expanded
    cleanup()

    const comPeca = mount(withPiece())
    choosePiece(comPeca.view.container)
    const escolhida = inventory(comPeca.view.container).expanded

    // Escolher uma peça só ACRESCENTA: nada do estado vazio pode desaparecer por isso.
    // (Vários passam de desligado a ligado; isso é o certo, e por isso a conta é por nome.)
    const alcancados = names(escolhida)
    const perdidos = names(base).filter((control) => !alcancados.includes(control))
    expect(perdidos, `escolher uma peça não pode esconder: ${perdidos.join(' · ')}`).toEqual([])
  })

  test('o modo Animar troca o conjunto, e é a ÚNICA troca legítima', async () => {
    const { view } = mount(withPiece())
    // ⚠️ ACHADO, e o redesenho precisa resolver: com os primeiros passos abertos existem DOIS
    // botões chamados "Animar" (o modo e a aba de assunto da ajuda). Nome repetido no mesmo
    // conjunto visível confunde a criança e o leitor de tela igual, e é o irmão da regra de
    // "ícone único" que o registro de comandos vai cobrar. Aqui a referência é guardada ANTES
    // de abrir tudo, para o teste falar do botão de MODO.
    const animarMode = view.getByRole('button', { name: copy.animationMode })
    const modelarMode = view.getByRole('button', { name: copy.modelMode })
    const modelar = inventory(view.container).expanded
    // Animar carrega clipes e linha do tempo sob demanda; sem drenar aqui, o módulo resolve
    // DEPOIS do teste e vira aviso de `act`. O pacote tem zero desses desde o lote 235.
    await act(async () => {
      animarMode.click()
      await Promise.resolve()
    })
    const animar = inventory(view.container).expanded

    expect(animar).not.toEqual(modelar)
    // Invariante já escrita no CLAUDE.md: Animar esconde os destrutivos de modelagem.
    // Aqui ela deixa de ser prosa e vira teste.
    expect(names(animar)).not.toContain(`button: ${copy.remove}`)
    // E o caminho de volta devolve tudo: esconder em Animar não é perder.
    await act(async () => {
      modelarMode.click()
      await Promise.resolve()
    })
    const devolta = names(inventory(view.container).expanded)
    const perdidos = names(modelar).filter((control) => !devolta.includes(control))
    expect(perdidos, `voltar para Modelar não devolveu: ${perdidos.join(' · ')}`).toEqual([])
  })

  /**
   * A CATRACA da queixa que originou o redesenho: "hoje é tudo à vista por igual".
   *
   * Medido em 10/09/2026, antes de qualquer mudança de layout: **44 controles** com a oficina
   * recém-aberta e **67** com uma peça escolhida. O alvo do redesenho é ≤30 com uma peça
   * escolhida. Estes tetos só descem: cada lote que hierarquiza baixa o número aqui, e nada
   * pode empurrá-lo de volta em silêncio.
   *
   * ⚠️ Isto conta o que está MONTADO, não o que está visível — o happy-dom mostra `<details>`
   * fechado. Um lote que só recolhe controles não muda este número, e é por isso que ele
   * sozinho não prova hierarquização: ele prova que ninguém ACRESCENTOU mais coisa à tela.
   */
  test('a quantidade de controles na tela não cresce', () => {
    const vazio = mount(migrateLegacyModel(makeModel()).document)
    expect(controlInventory(vazio.view.container).length).toBeLessThanOrEqual(44)
    cleanup()

    const comPeca = mount(withPiece())
    choosePiece(comPeca.view.container)
    expect(controlInventory(comPeca.view.container).length).toBeLessThanOrEqual(67)
  })

  test('todo controle tem nome: sem nome, a criança não acha e o leitor de tela não fala', () => {
    const { view } = mount(withPiece())
    act(() => {
      openEveryDisclosure(view.container)
    })
    const semNome = [...view.container.querySelectorAll('button, select, textarea')].filter(
      (element) =>
        !(element.getAttribute('aria-label') ?? element.textContent ?? '').trim() &&
        !element.getAttribute('aria-labelledby') &&
        !element.getAttribute('id'),
    )
    expect(semNome.map((element) => element.outerHTML.slice(0, 120))).toEqual([])
  })
})
