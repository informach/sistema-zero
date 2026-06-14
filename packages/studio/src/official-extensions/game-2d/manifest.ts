import type { ExtensionManifest } from '#extensions'
import { pongExample } from './examples'

export const gameTwoDManifest: ExtensionManifest = {
  id: 'game-2d',
  name: 'Jogo 2D',
  version: '0.2.0',
  description:
    'Blocos e comandos para criar jogos 2D usando Canvas API: sprites, colisão, loop de jogo, teclado, mouse/toque, física (gravidade, ricochete, colisão por círculo), som e pontuação.',
  category: 'games',
  official: true,
  enabledByDefault: false,
  // mouse: listeners de pointer (onPointer). audio: Web Audio em playSound.
  permissions: ['canvas', 'keyboard', 'mouse', 'audio'],
  docs: `## Jogo 2D

Esta extensão adiciona um pequeno runtime didático em \`window.SZGame2D\`
que ajuda a montar jogos 2D simples sobre Canvas API. O código gerado é
intencionalmente legível — quando você abrir o modo Código vai ver
chamadas explícitas para \`SZGame2D.createSprite(...)\` e \`SZGame2D.gameLoop(...)\`.

### Blocos disponíveis

- **Criar sprite** — define um objeto com \`x\`, \`y\`, \`largura\`, \`altura\`, \`cor\`.
- **Desenhar sprite** — desenha o sprite no contexto do canvas.
- **Mover sprite com setas** — move o sprite com as setas do teclado.
- **Definir posição** / **Definir velocidade** — atualiza propriedades.
- **Colisão entre A e B** — devolve booleano por interseção retangular.
- **Pontuação** — declara variável de pontos.
- **Game over** — escreve mensagem em vermelho no canvas.
- **A cada frame...** — abre um loop de \`requestAnimationFrame\`.

### Física, áudio e mouse (v0.2.0)

- **Definir gravidade** / **Aplicar velocidade** — integra vx/vy e soma a gravidade.
- **Ricochetear nas bordas** — quica o sprite nas bordas do canvas.
- **Colisão por círculo** — colisão mais justa para objetos redondos.
- **Tocar som** — bip sintetizado via Web Audio (sem arquivos) — permissão \`audio\`.
- **Quando clicar/tocar** — roda um bloco com a posição do ponteiro — permissão \`mouse\`.
`,
  examples: [pongExample],
}
