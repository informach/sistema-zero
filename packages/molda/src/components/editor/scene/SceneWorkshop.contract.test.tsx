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
import { SCENE_PAINT_COPY } from '../../../core/scenePaintCopy'
import { structuredBytes } from '../../../core/structuredBytes'
import { addScenePrimitive } from '../../../scene/commands'
import type { MoldaSceneDocument } from '../../../scene/document'
import { migrateLegacyModel } from '../../../scene/migrateLegacy'
import { createDocumentEditorStore } from '../../../state/editorStore'
import { controlInventory, frontControls, openEveryDisclosure } from '../../../testing/domContract'
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

  test.each([
    ['Animar', copy.animationMode],
    ['Pintar', SCENE_PAINT_COPY.tab],
  ])('a aba %s troca o conjunto; as abas são as ÚNICAS trocas legítimas', async (_name, tab) => {
    const { view } = mount(withPiece())
    choosePiece(view.container)
    // Nome de aba é único na tela: os assuntos dos Primeiros passos não repetem "Pintar" nem
    // "Animar" (com eles abertos, eram DOIS botões "Animar", o modo e o assunto da ajuda).
    const tabButton = view.getByRole('button', { name: tab })
    const modelarMode = view.getByRole('button', { name: copy.modelMode })
    const modelar = inventory(view.container).expanded
    // As abas carregam o que é delas sob demanda; sem drenar aqui, o módulo resolve DEPOIS do
    // teste e vira aviso de `act`. O pacote tem zero desses desde o lote 235.
    await act(async () => {
      tabButton.click()
      await Promise.resolve()
    })
    const trocado = inventory(view.container).expanded
    expect(view.getAllByRole('button', { name: tab })).toHaveLength(1)

    expect(trocado).not.toEqual(modelar)
    // Invariante já escrita no CLAUDE.md: Animar e Pintar escondem os destrutivos de modelagem.
    // Aqui ela deixa de ser prosa e vira teste.
    expect(names(trocado)).not.toContain(`button: ${copy.remove}`)
    // E o caminho de volta devolve tudo: esconder numa aba não é perder.
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
   * São DOIS números, e a diferença entre eles é o redesenho inteiro:
   *
   * - **montados** (`controlInventory`) é tudo o que existe na tela, aberto ou recolhido.
   *   Este só pode subir quando um controle NOVO entra, e o aumento tem de ser explicado
   *   aqui. Ele é a rede contra "acrescentaram mais coisa".
   * - **encarados** (`frontControls`) é o que a criança vê ao chegar: os montados menos o
   *   que está atrás de um `<details>` fechado. Este é o número da queixa, e ele SÓ DESCE.
   *
   * Medido em 10/09/2026, antes de qualquer mudança de layout: 44 montados com a oficina
   * recém-aberta e 67 com uma peça escolhida — e, como nada era recolhido, encarados eram
   * os mesmos 44 e 67. É literalmente o "tudo à vista por igual" dela, em número.
   *
   * ⚠️ Montados subiram para 46/69 no lote do palco, e os dois a mais são exatamente os
   * dois `<summary>` novos ("Vista: ..." e "Mais ajustes do palco"). Um gatilho de
   * revelação É um controle e tem de aparecer aqui; o que ele comprou foi tirar oito
   * controles da frente da criança. Nenhum comando foi removido — quem prova isso é o
   * teste de inventário em duas fases, logo acima.
   *
   * ⚠️ Em 11/09 (plano "Molda para crianças de 9+"), 47/34 na abertura e 87/65 com uma peça.
   * Na abertura, +1: a aba Pintar. Com uma peça, +18, e é DECISÃO, não descuido: as 15 cores
   * e o acabamento (Fosco, Brilhante, Metal) voltaram à vista no Modelar, como no editor antigo
   * que as crianças usam (a medição dela: 15 cores à vista lá, nenhuma aqui). São controles
   * CONCRETOS; o que atrapalhava eram os abstratos. "Materiais e camadas" (1) saiu para o
   * Pintar. Esta catraca mede o PADRÃO, tudo liberado; a medida da criança é a do nível de
   * entrada, sem malha, laço, pivô e medidas, em `SceneWorkshop.toolAccess.test.tsx`.
   *
   * ⚠️ Em 11/09, na CASCA das telas-modelo: 47/32 na abertura e 88/59 com uma peça. As formas
   * ficaram à vista em ladrilhos, como na imagem (+4 encarados: cinco ladrilhos no lugar de um
   * `<summary>`), e quem pagou foi "Mais ferramentas", que recolheu a caixa, o laço, escolher
   * várias, os grupos e a malha (-5), mais "Isolar seleção", que foi para a lista das vistas
   * (-1). Com uma peça, "Mais sobre a peça" recolhe o nome, mostrar, travar e o grupo (-4
   * encarados), e o gatilho dele é o +1 dos montados: é um `<summary>` NOVO, e nada saiu.
   *
   * Alvo do redesenho: **≤30 encarados** com uma peça escolhida, medido no nível de entrada.
   */
  test('a quantidade de controles na tela não cresce, e a que a criança encara desce', () => {
    const vazio = mount(migrateLegacyModel(makeModel()).document)
    const encaradosVazio = frontControls(vazio.view.container)
    expect(controlInventory(vazio.view.container).length).toBeLessThanOrEqual(47)
    expect(
      encaradosVazio.length,
      `encarados na abertura: ${encaradosVazio.join(' | ')}`,
    ).toBeLessThanOrEqual(32)
    cleanup()

    const comPeca = mount(withPiece())
    choosePiece(comPeca.view.container)
    const encaradosPeca = frontControls(comPeca.view.container)
    expect(controlInventory(comPeca.view.container).length).toBeLessThanOrEqual(88)
    expect(
      encaradosPeca.length,
      `encarados com uma peça escolhida: ${encaradosPeca.join(' | ')}`,
    ).toBeLessThanOrEqual(59)
  })

  /**
   * A catraca da aba PINTAR (pedida no review de 11/09: a 800px com a gaveta fechada eram 46
   * controles à vista no Pintar, contra 26 no Modelar). Medida na casca das telas-modelo, com
   * uma peça escolhida e o módulo "Mais jeitos de pintar" já carregado (sem esperar por ele, a
   * conta mudaria com a pressa do teste). Só desce; subir exige a conta escrita aqui.
   */
  test('a aba Pintar tem a catraca dela, medida com o módulo carregado', async () => {
    const { view } = mount(withPiece())
    choosePiece(view.container)
    await act(async () => {
      view.getByRole('button', { name: SCENE_PAINT_COPY.tab }).click()
      await Promise.resolve()
    })
    await view.findByText(SCENE_PAINT_COPY.more, { selector: 'summary' })
    const montados = controlInventory(view.container)
    const encarados = frontControls(view.container)
    expect(montados.length, montados.join(' | ')).toBeLessThanOrEqual(67)
    expect(encarados.length, encarados.join(' | ')).toBeLessThanOrEqual(49)
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
