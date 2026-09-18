/**
 * Ordem editorial do menu "⋯" da barra do Estúdio — dado PURO, no molde do
 * `official-extensions/game-2d/palette.ts`. Só grupo, ordem e chave de texto:
 * nenhum ícone, nenhum handler, nenhuma condição (isso é da `Topbar`, que
 * DERIVA a lista daqui).
 *
 * A régua é a da reorganização da paleta do Jogo 2D (13/09/2026):
 * - grupo = a COISA do mundo da criança (substantivo curto), nunca o nome da API;
 * - ordem = ordem de uso, do preparar ao levar embora, nunca alfabética;
 * - cada item em UM grupo só;
 * - ⚠️ NENHUM grupo de despejo ("Mais", "Outros", "Tudo") — quem não cabe em
 *   grupo nenhum é sinal de que falta um grupo, não de que falta um balde.
 * Os três invariantes são travados em `__tests__/menuLayout.test.ts`.
 */
export const STUDIO_MENU_LAYOUT = [
  {
    id: 'edit',
    labelKey: 'topbar.group.edit',
    // Só aparece abaixo de STUDIO_BAR_UNDO_MIN_PX: acima disso os dois são
    // botões da própria barra.
    items: [
      { id: 'undo', labelKey: 'topbar.undo' },
      { id: 'redo', labelKey: 'topbar.redo' },
    ],
  },
  {
    id: 'myGame',
    labelKey: 'topbar.group.myGame',
    items: [
      { id: 'save', labelKey: 'topbar.save' },
      { id: 'sync', labelKey: 'topbar.cloudSync' },
      { id: 'extensions', labelKey: 'topbar.extensions' },
    ],
  },
  {
    // As portas dos materiais do projeto. O som e o modelo 3D ganham as suas no
    // lote seguinte (hoje moram atrás da palavra "Imagens", que a criança não tem
    // como adivinhar).
    id: 'materials',
    labelKey: 'topbar.group.materials',
    items: [{ id: 'assetsImages', labelKey: 'assets.tab.images' }],
  },
  {
    id: 'show',
    labelKey: 'topbar.group.show',
    items: [
      { id: 'console', labelKey: 'panel.console' },
      { id: 'terminal', labelKey: 'panel.terminal' },
      { id: 'ai', labelKey: 'panel.ai' },
    ],
  },
  {
    // Os três jeitos de o jogo sair daqui tinham o MESMO ícone e nomes que não
    // se distinguiam. Cada um diz o DESTINO e leva uma linha de apoio.
    id: 'take',
    labelKey: 'topbar.group.take',
    items: [
      { id: 'exportStudio', labelKey: 'topbar.exportStudio', hintKey: 'topbar.hint.exportStudio' },
      { id: 'download', labelKey: 'topbar.download', hintKey: 'topbar.hint.download' },
      { id: 'export', labelKey: 'topbar.export', hintKey: 'topbar.hint.export' },
      { id: 'convert', labelKey: 'topbar.convertPro', hintKey: 'topbar.hint.convertPro' },
    ],
  },
  {
    id: 'studio',
    labelKey: 'topbar.group.studio',
    items: [
      { id: 'theme', labelKey: 'topbar.theme' },
      { id: 'projects', labelKey: 'topbar.projects' },
    ],
  },
] as const

export type StudioMenuGroupId = (typeof STUDIO_MENU_LAYOUT)[number]['id']
export type StudioMenuItemId = (typeof STUDIO_MENU_LAYOUT)[number]['items'][number]['id']
