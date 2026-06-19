import type { ExtensionManifest } from '#extensions'
import { animatedHeroExample, platformerExample, pongExample, tilemapExample } from './examples'

export const gameTwoDManifest: ExtensionManifest = {
  id: 'game-2d',
  name: 'Jogo 2D',
  version: '0.5.0',
  description:
    'Blocos e comandos para criar jogos 2D usando Canvas API: sprites com imagem e animação (spritesheet), movimento (plataforma, top-down, seguir o ponteiro), efeitos (clarão, tremor de tela, partículas), tiles/tilemaps com colisão, loop de jogo, teclado, mouse/toque, física, som e pontuação.',
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
- **Mover em 4 direções** — move o sprite com as setas do teclado (ver "Movimento" abaixo).
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

### Imagens e animação (v0.3.0)

Use a aba **Assets** para enviar imagens do computador ou escolher da biblioteca;
depois é só usar o **nome** da imagem nos blocos.

- **Criar sprite com imagem** — um sprite que mostra uma imagem (em vez de um retângulo colorido).
- **Trocar imagem do sprite** — troca a imagem fixa do sprite.
- **Carregar spritesheet** — prepara uma folha com vários quadros (informe o tamanho de cada quadro).
- **Animar sprite** — percorre os quadros da spritesheet a N fps.
- **Desenhar quadro** — desenha um quadro específico da spritesheet (controle manual).

Enquanto a imagem carrega (ou se o nome não existir), o sprite aparece como um
retângulo da cor — o jogo nunca quebra por falta de imagem.

### Movimento e efeitos (v0.4.0)

Use estes blocos dentro do **"A cada frame do jogo"**:

- **Plataforma** — esquerda/direita + pulo com gravidade (chão = base da tela).
- **4 direções (top-down)** — anda nas 4 direções; a diagonal não fica mais rápida.
- **Seguir o ponteiro** — o sprite persegue o mouse/dedo.
- **Manter dentro da tela** — gruda nas bordas em vez de sumir.
- **Clarão** — pinta a tela com uma cor translúcida (ex.: ao levar dano).
- **Tremer a tela** — sacode e para sozinho (chame uma vez, ex.: numa explosão).
- **Soltar partículas** + **Atualizar e desenhar as partículas** — uma explosão de
  partículas no ponto x/y; lembre de desenhá-las a cada frame (somem sozinhas).

### Tiles / tilemaps (v0.5.0)

Tiles montam cenários (chão, paredes, plataformas) a partir de UMA imagem com vários
quadros (o **tileset**) — escolha um da aba **Assets** (ex.: \`tileset\`).

- **Criar mapa de tiles** — informe o tileset, o tamanho do tile (px) e a **grade**:
  cada número escolhe um quadro do tileset; \`;\` separa as linhas e espaço separa as
  colunas; \`.\` é uma célula vazia. Em **tiles sólidos**, liste os números que barram o
  jogador (ex.: \`1\`).
- **Desenhar mapa** — desenha o mapa na tela (use no "a cada frame", antes do sprite).
- **Impedir de atravessar tiles sólidos** — o sprite pousa no chão e bate nas paredes;
  use a cada frame, depois de mover o sprite.

Enquanto o tileset carrega (ou se faltar), os tiles aparecem como retângulos — o jogo
nunca quebra por falta de imagem.
`,
  examples: [pongExample, animatedHeroExample, platformerExample, tilemapExample],
}
