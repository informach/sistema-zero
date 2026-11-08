import type { SceneAction, SceneId } from '../../src/learning/scene'
import { comOsCaminhosDoDino } from './caminhos-livres/dino-a'
import { CAMINHOS_LIVRES_DINO_B } from './caminhos-livres/dino-b'
import { CAMINHOS_LIVRES_DINO_C } from './caminhos-livres/dino-c'
import { CAMINHOS_LIVRES_MEU_JEITO_D } from './caminhos-livres/meu-jeito-d'
import { CAMINHOS_LIVRES_MEU_JEITO_E } from './caminhos-livres/meu-jeito-e'
import { CAMINHOS_LIVRES_NAVE_A } from './caminhos-livres/nave-a'
import { CAMINHOS_LIVRES_NAVE_B } from './caminhos-livres/nave-b'
import { CAMINHOS_LIVRES_NAVE_C } from './caminhos-livres/nave-c'
import { CAMINHO_DO_PASSINHO } from './caminhos-livres/nave-passinho'
import { scenePaths } from './exploration-paths'

/** Current free-exploration lessons require comparisons beyond the original guided journeys. */
export const freeExplorationPaths: Partial<Record<SceneId, SceneAction[]>> = {
  // Os caminhos da exploração livre da Nave e do Meu Jeito (02/11/2026). As entradas escritas
  // abaixo vêm depois e vencem se alguma cena se repetir.
  ...CAMINHOS_LIVRES_NAVE_A,
  ...CAMINHOS_LIVRES_NAVE_B,
  ...CAMINHOS_LIVRES_NAVE_C,
  ...CAMINHOS_LIVRES_MEU_JEITO_D,
  ...CAMINHOS_LIVRES_MEU_JEITO_E,
  // O Corre Dino, frente B (02/11/2026): tela, leitor de tela, gravidade, impulso e som do pulo.
  ...CAMINHOS_LIVRES_DINO_B,
  // O Corre Dino, frente C (02/11/2026): começar, área de contato, placar, reta e aceleração.
  ...CAMINHOS_LIVRES_DINO_C,
  // O Corre Dino, frente A (02/11/2026): as cenas que a Nave já usava. O caminho do Dino vai DEPOIS
  // do da Nave na mesma cena, e o mesmo caminho serve aos blocos dos dois cursos.
  ...comOsCaminhosDoDino({
    ...CAMINHOS_LIVRES_NAVE_A,
    ...CAMINHOS_LIVRES_NAVE_B,
    ...CAMINHOS_LIVRES_NAVE_C,
  }),
  'touch-response': [
    { type: 'touch-hiding-place', id: 0 },
    { type: 'connect', port: 'touch', enabled: true },
    { type: 'touch-hiding-place', id: 0 },
    { type: 'touch-hiding-place', id: 1 },
  ],
  // As Moedas em exploração livre (02/11/2026) cobram também "sem sumir, a mesma moeda contou de
  // novo": a comparação que justifica tirar a moeda do grupo.
  'coin-counter': [
    { type: 'coin-disappears', enabled: false },
    { type: 'touch-coin', coin: 0 },
    { type: 'touch-coin', coin: 1 },
    { type: 'touch-coin', coin: 0 },
    { type: 'restart-coins' },
    { type: 'coin-disappears', enabled: true },
    ...scenePaths['coin-counter'],
  ],
  'lighthouse-position': [
    ...scenePaths['lighthouse-position'],
    { type: 'key-position', axis: 'x', value: 300 },
    { type: 'key-position', axis: 'x', value: 160 },
    { type: 'key-position', axis: 'y', value: 300 },
    { type: 'key-position', axis: 'y', value: 250 },
  ],
  'lighthouse-walk': [
    { type: 'movement-command', enabled: false },
    { type: 'hold-arrow', held: true },
    { type: 'walk-frames', count: 1 },
    { type: 'movement-command', enabled: true },
    { type: 'hold-arrow', held: false },
    ...scenePaths['lighthouse-walk'],
    { type: 'hold-arrow', held: false },
    { type: 'walk-frames', count: 1 },
    { type: 'walk-order', order: 'correct' },
    { type: 'test-walk-order' },
    { type: 'walk-order', order: 'reverse' },
    { type: 'test-walk-order' },
    // A beirada (01/11/2026): sai sem o limite e volta ao ligar o limite.
    { type: 'restart-walk' },
    { type: 'keep-on-screen', enabled: false },
    { type: 'hold-arrow', held: true },
    // Seis segundos: no Farol ele parte de x 21 (o lugar do jogo, 08/11/2026).
    { type: 'advance', seconds: 1 },
    { type: 'advance', seconds: 1 },
    { type: 'advance', seconds: 1 },
    { type: 'advance', seconds: 1 },
    { type: 'advance', seconds: 1 },
    { type: 'advance', seconds: 1 },
    { type: 'keep-on-screen', enabled: true },
    { type: 'advance', seconds: 1 / 30 },
    // A câmera lenta (01/11/2026): um segundo de caminhada na velocidade de verdade.
    { type: 'restart-walk' },
    { type: 'walk-pace', pace: 'real' },
    { type: 'hold-arrow', held: true },
    { type: 'advance', seconds: 0.5 },
    { type: 'advance', seconds: 0.6 },
    // O tamanho do passinho da Nave (02/11/2026): os dois passinhos em câmera lenta.
    ...CAMINHO_DO_PASSINHO,
  ],
}
