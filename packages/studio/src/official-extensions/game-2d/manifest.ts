import type { ExtensionManifest } from '#extensions'
import { pongExample } from './examples'

export const gameTwoDManifest: ExtensionManifest = {
  id: 'game-2d',
  name: 'Jogo 2D',
  version: '0.1.0',
  description:
    'Blocos e comandos para criar jogos 2D simples usando Canvas API: sprites, colisão, loop de jogo, teclado e pontuação.',
  category: 'games',
  official: true,
  enabledByDefault: false,
  permissions: ['canvas', 'keyboard'],
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
`,
  examples: [pongExample],
}
