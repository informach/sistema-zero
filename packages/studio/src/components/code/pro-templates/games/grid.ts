import { GRID_LOCKS, GRID_SOURCES } from './grid.sources.generated'

export function gridSources(id: string): Record<string, string> {
  const arena = id === 'canvas-grid-arena'
  const renderer = arena
    ? 'arena-game'
    : id === 'phaser-tactics'
      ? 'phaser-tactics'
      : 'three-tactics'
  if (!GRID_LOCKS[id]) throw new Error(`Kit de grade desconhecido: ${id}`)
  const files = arena
    ? ['grid', 'arena-config', 'arena-model', renderer]
    : ['grid', 'tactics-config', 'tactics-model', 'tactics-controller', renderer]
  const title = arena ? 'Arena dos faróis' : 'Guardiões da ilha'
  const instructions = arena
    ? 'Setas ou WASD movem; Espaço coloca um pulso. Saia da cruz antes de o pavio acabar! Paredes param a luz; caixas recebem o pulso e são removidas. Acenda todos os faróis. Esc pausa.'
    : 'Toque nas casas ou mova o cursor com setas/WASD e confirme com Espaço. Escolha uma unidade, uma casa destacada para mover ou um robô no alcance para agir. Guardião: alcance 1, dano 2. Exploradora: alcance 3, dano 1; água e unidades bloqueiam o disparo. Espere ou encerre o turno pelos botões. Recrutas agem no próximo turno. Esc pausa.'
  return {
    ...Object.fromEntries(files.map((file) => [`src/${file}.ts`, GRID_SOURCES[`src/${file}.ts`]!])),
    'package-lock.json': GRID_LOCKS[id]!,
    'src/game.ts': `export { createGame } from './${renderer}'\n`,
    'src/main.ts': `import { createProgress } from './progress'\nimport { createUI } from './ui'\nimport { createInput } from './input'\nimport { createGame } from './game'\nimport { manageLifetime, exposeGameInspection } from './lifecycle'\nconst ui = createUI(${JSON.stringify(title)}, ${JSON.stringify(instructions)})\nconst input = createInput(ui.controls, () => ui.phase === 'playing', { left: '← Esquerda', right: 'Direita →', up: '↑ Cima', down: '↓ Baixo', action: ${JSON.stringify(arena ? 'Colocar pulso' : 'Selecionar / agir')} })\nconst stopProgress = createProgress(ui, ${JSON.stringify(id)})\nconst game = createGame(ui, input)\nconst stopInspection = exposeGameInspection(game)\nmanageLifetime(() => { stopInspection(); game.dispose(); stopProgress(); input.destroy(); ui.destroy() })\n`,
  }
}
