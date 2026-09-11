/**
 * O registro só vale se ele contar a verdade sobre a tela. Estes testes são o que impede
 * ele de virar uma lista bonita que ninguém confere.
 */
import { afterEach, describe, expect, test } from 'bun:test'
import { act, cleanup, render } from '@testing-library/react'
import { structuredBytes } from '../../../core/structuredBytes'
import { migrateLegacyModel } from '../../../scene/migrateLegacy'
import { createDocumentEditorStore } from '../../../state/editorStore'
import { controlInventory, openEveryDisclosure } from '../../../testing/domContract'
import { makeModel } from '../../../testing/fixtures'
import { sceneViewportProbe } from '../../../testing/sceneViewportProbe'
import { SceneWorkshop } from './SceneWorkshop'
import {
  contextualSceneCommands,
  SCENE_COMMANDS,
  sceneCommand,
  sceneCommandForShortcut,
  sceneRailGroups,
} from './sceneCommandRegistry'

afterEach(() => {
  cleanup()
})

describe('registro de comandos da oficina', () => {
  test('ids únicos, e todo comando do trilho declara o grupo que vira a legenda', () => {
    const ids = SCENE_COMMANDS.map((command) => command.id)
    expect(ids.length).toBe(new Set(ids).size)
    for (const command of SCENE_COMMANDS)
      if (command.slot === 'rail')
        expect(command.group, `${command.id} está no trilho sem grupo`).toBeTruthy()
    expect(() => sceneCommand('nao.existe' as never)).toThrow('Comando desconhecido')
  })

  /**
   * ⚠️ A regra que só passa a doer quando o botão perde o texto. Hoje o editor antigo mapeia
   * o MESMO ícone para seis comandos, e é inofensivo porque cada botão tem rótulo escrito ao
   * lado. Num trilho só de glifos, dois comandos com o mesmo desenho no mesmo conjunto
   * visível é a criança clicando no errado.
   */
  test('ícone único dentro de cada conjunto visível', () => {
    for (const context of ['model', 'mesh-face', 'animate'] as const)
      for (const slot of ['rail', 'stage', 'app'] as const) {
        const visiveis = contextualSceneCommands(context, slot)
        const porIcone = new Map<unknown, string[]>()
        for (const command of visiveis)
          porIcone.set(command.icon, [...(porIcone.get(command.icon) ?? []), command.label])
        const repetidos = [...porIcone.values()].filter((labels) => labels.length > 1)
        expect(
          repetidos,
          `${context}/${slot}: mesmo ícone em ${JSON.stringify(repetidos)}`,
        ).toEqual([])
      }
  })

  test('atalho único por contexto, contando o modificador', () => {
    for (const context of ['global', 'model', 'mesh-face', 'animate'] as const) {
      const vistos = new Map<string, string>()
      for (const command of SCENE_COMMANDS) {
        if (!command.shortcut || !command.contexts.includes(context)) continue
        for (const tecla of command.shortcut.keys) {
          const chave = `${command.shortcut.modifier ?? 'sem'}+${tecla}`
          expect(vistos.get(chave), `${context}: ${chave} em dois comandos`).toBeUndefined()
          vistos.set(chave, command.id)
        }
      }
    }
  })

  test('Ctrl+Z e Ctrl+Shift+Z não se confundem', () => {
    const evento = (shiftKey: boolean) => ({
      key: 'z',
      ctrlKey: true,
      metaKey: false,
      shiftKey,
      altKey: false,
    })
    expect(sceneCommandForShortcut('global', evento(false))).toBe('app.undo')
    expect(sceneCommandForShortcut('global', evento(true))).toBe('app.redo')
    // Sem o modificador não é atalho de desfazer: `z` sozinho fica livre para outra coisa.
    expect(
      sceneCommandForShortcut('global', {
        key: 'z',
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
        altKey: false,
      }),
    ).toBeNull()
  })

  /** A invariante do CLAUDE.md deixa de ser prosa: quem filtra é o próprio registro. */
  test('Animar esconde os destrutivos de modelagem, inclusive o Apagar', () => {
    const modelar = contextualSceneCommands('model', 'rail').map((c) => c.id)
    const animar = contextualSceneCommands('animate', 'rail').map((c) => c.id)
    expect(modelar).toContain('node.remove')
    expect(animar).not.toContain('node.remove')
    expect(animar).not.toContain('node.ungroup')
    // E o que não é destrutivo continua: mover a peça é o que se faz em Animar.
    expect(animar).toContain('tool.move')
    // Pintar também: nenhum comando que apaga ou desfaz peças mora na aba da tinta.
    for (const slot of ['rail', 'stage', 'app', 'menu', 'dock', 'dialog'] as const)
      expect(
        contextualSceneCommands('paint', slot).some((command) => command.destructive),
        `paint/${slot}`,
      ).toBe(false)
  })

  test('os grupos do trilho saem na ordem declarada, e grupo vazio não vira legenda solta', () => {
    const grupos = sceneRailGroups('model').map((entry) => entry.group)
    expect(grupos).toEqual(['create', 'tools', 'piece', 'edit', 'pinned'])
    for (const entry of sceneRailGroups('model')) expect(entry.commands.length).toBeGreaterThan(0)
  })

  /**
   * ⚠️⚠️ O teste que impede o registro de mentir. Todo rótulo declarado precisa existir de
   * verdade na oficina de hoje, senão o registro é uma lista de intenções e a hierarquização
   * seria construída em cima de um mapa errado. Só os comandos que a oficina já mostra num
   * documento vazio entram na conta: os de malha e de pintura pedem contexto que este estado
   * não tem, e cobrá-los aqui seria cobrar o que a tela não deve mostrar mesmo.
   */
  test('todo rótulo do registro existe na oficina de verdade', () => {
    const editor = createDocumentEditorStore({
      asset: migrateLegacyModel(makeModel()).document,
      sizeOf: structuredBytes,
      persistence: { save: async () => undefined },
      autosaveMs: 60_000,
    })
    const probe = sceneViewportProbe()
    const view = render(
      <SceneWorkshop editor={editor} viewportFactory={probe.factory} onExit={() => {}} />,
    )
    act(() => {
      openEveryDisclosure(view.container)
    })
    const naTela = new Set(
      controlInventory(view.container).map((linha) =>
        linha.replace(/^[a-z]+: /, '').replace(' [desligado]', ''),
      ),
    )
    const cobrados = SCENE_COMMANDS.filter(
      (command) => command.contexts.includes('global') || command.contexts.includes('model'),
    ).filter((command) => command.slot !== 'dialog' && command.slot !== 'dock')
    const faltando = cobrados.filter((command) => !naTela.has(command.label))
    expect(
      faltando.map((command) => `${command.id} → "${command.label}"`),
      'o registro promete comandos que a oficina não mostra',
    ).toEqual([])
  })
})
