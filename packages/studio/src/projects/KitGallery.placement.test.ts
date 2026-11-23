import { expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import { normalizeSZIR } from '#ir'
import { registerExtensionBlocks } from '../blockly/blocks'
import { HTMLConnectionChecker } from '../blockly/htmlConnectionChecker'
import { ensureBlocklyInitialized } from '../blockly/setup'
import { gameThreeDBlocks } from '../official-extensions/game-3d/blocks'
import { parseJS } from '../parsers/js'
import { buildProjectFromKitEntry } from './KitGallery'

/**
 * Conferência logada no staging (22/11/2026): o jogo E da galeria abria com "Não deu para abrir
 * estes blocos". O programa põe "Dar corpo físico" (só vale direto no Ao iniciar) dentro de "para
 * cada objeto do grupo". O construtor dos blocos troca por código o bloco que não cabe no lugar,
 * mas só conhece o lugar de um bloco de extensão depois que as regras dela são registradas, e a
 * galeria montava os blocos ANTES de o editor registrar o Jogo 3D: o bloco ficava no lugar errado
 * e a carga inteira falhava. Este arquivo roda sem nada registrado antes do clique, como a galeria.
 */
it('um exemplo com um bloco fora do lugar dele abre nos blocos, com aquele trecho em código', () => {
  const ir = normalizeSZIR({
    html: [],
    css: [],
    js: parseJS(
      [
        'const cena = SZGame3D.createFullscreenScene("#000000");',
        'const moedas = SZGame3D.createGroup();',
        'SZGame3D.forEachInGroup(moedas, (moeda) => {',
        '  SZGame3D.body(moeda, 20);',
        '});',
      ].join('\n'),
    ),
    extensions: [{ extensionId: 'game-3d' }],
  })
  const projeto = buildProjectFromKitEntry({
    key: 'game-3d:teste',
    name: 'Teste',
    description: '',
    experience: 'game',
    emoji: '🎮',
    ir,
    assets: [],
  })
  // O editor registra os blocos da extensão só depois, ao abrir o projeto.
  ensureBlocklyInitialized()
  registerExtensionBlocks(gameThreeDBlocks)
  const workspace = new Blockly.Workspace({
    plugins: { connectionChecker: HTMLConnectionChecker },
  } as Blockly.BlocklyOptions)
  try {
    expect(() =>
      Blockly.serialization.workspaces.load(projeto.blocksState as never, workspace),
    ).not.toThrow()
    const tipos = workspace.getAllBlocks(false).map((bloco) => bloco.type)
    expect(tipos).toContain('sz_g3d_for_each_in_group')
    expect(tipos).not.toContain('sz_g3d_body')
    expect(tipos).toContain('sz_adv_raw_js')
  } finally {
    workspace.dispose()
  }
})
