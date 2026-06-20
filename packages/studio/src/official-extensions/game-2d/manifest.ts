import type { ExtensionManifest } from '#extensions'
import {
  animatedHeroExample,
  asteroidsExample,
  dinoRunExample,
  platformerExample,
  pongExample,
  tilemapExample,
} from './examples'

export const gameTwoDManifest: ExtensionManifest = {
  id: 'game-2d',
  name: 'Jogo 2D',
  version: '0.9.0',
  description:
    'Blocos para criar jogos 2D no Canvas: sprites (cor/imagem/animação), grupos de MUITOS sprites com spawner e colisão de grupo, movimento, física, efeitos (clarão, tremor, partículas), tiles/tilemaps, HUD (placar/vidas/barra), telas/cenas, som, e KITS por tema — Kit espaço (nave, asteroides, estrelas, explosões e sons) e Kit dino (dinossauro que corre/pula/abaixa, obstáculos, ovos de bônus e fundo de floresta com parallax).',
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

### Grupos, HUD e telas (v0.6.0)

Para jogos com MUITOS sprites (tiros, inimigos, estrelas) e telas de início/vitória/derrota:

- **Grupos** — \`Criar grupo\`, \`Criar no grupo … um sprite\` (x/y/vx/vy aceitam número
  aleatório), \`Atualizar/Desenhar o grupo\`, \`Para cada sprite do grupo\`, \`quantos
  sprites tem no grupo\`, \`Esvaziar/Tirar do grupo\`, \`Tirar do grupo quem sair da tela\`.
- **Colisão de grupo** — \`Quando um sprite do grupo A encostar num do grupo B\` roda o
  "fazer" com os dois sprites (use dentro do "a cada quadro").
- **Temporizadores** — \`A cada N quadros/segundos fazer\` (ótimo para criar inimigos).
- **HUD no canvas** — \`Mostrar placar\`, \`Escrever\`, \`Desenhar vidas (corações)\`, \`Barra de … / …\`.
- **Telas/cenas** — \`Ir para a tela\`, \`a tela atual é … ?\`, \`Mostrar tela (título/subtítulo/dica)\`,
  \`Reiniciar o jogo\`. O setup (grupos, sprites, variáveis) fica no TOPO do programa, fora do
  "a cada quadro", para o loop conseguir enxergá-lo; um único "a cada quadro" decide o que
  desenhar com "se a tela atual é X".
- **Cenário** — \`Desenhar fundo de estrelas\` e \`Mover o sprite com o dedo (só na horizontal)\`.

### Kit espaço (v0.7.0)

A categoria **🚀 Kit espaço** reúne atalhos PRONTOS (não genéricos) para jogos de nave
espacial — os desenhos, efeitos e sons já vêm feitos: criar nave (cabine + foguinho animado,
cores do corpo e das asas escolhidas), criar asteroide no grupo (pedra que gira), desenhar
fundo de estrelas (céu com gradiente e estrelas que cintilam), soltar
explosão e tocar som de tiro/explosão. Os blocos genéricos seguem nas categorias normais —
a ideia é ir somando KITS de outros temas (corrida, fazenda…).

### Acabamentos (v0.8.0)

- **Criar tiro no grupo** — um tiro redondo com brilho (em vez de retângulo).
- **Mover o sprite com as setas** — anda só na horizontal com ← → (1 bloco).
- **Fazer o sprite piscar** — o sprite fica intermitente por N quadros (ex.: invencibilidade).
- **A cada N quadros** agora aceita um número OU uma variável (spawn que acelera por fase).
- Asteroides nascem com tamanhos variados sozinhos; a tela de início/fim escurece de leve
  (o jogo aparece atrás) e quebra o subtítulo em linhas.

### Tela responsiva

O bloco **Fazer a tela preencher N% da janela** (genérico) deixa o canvas grande, nítido e responsivo: ocupa quase toda a janela e se reajusta sozinho quando ela muda de tamanho, mantendo a proporção. As coordenadas do jogo continuam as mesmas, mas o desenho passa a ser feito na resolução REAL da tela — fica grande E nítido (sem borrar), em qualquer tamanho.

### Pulo no chão e Kit dino (v0.9.0)

Para jogos de **corrida** (estilo "Dino Run"), em que o personagem não anda para os lados, só pula e abaixa:

- **Fazer o sprite pular no chão** (genérico, em Movimento) — gravidade + pouso na base da tela + pulo
  com ↑/Espaço/W ou um toque. Serve a qualquer jogo de pulo.
- A categoria **🦕 Kit dino** reúne atalhos PRONTOS: **criar dinossauro** (desenhado, com perninhas que
  correm sozinhas), **controlar o dinossauro** (pula e abaixa, com gravidade/chão/poeira já embutidos),
  **criar obstáculo no grupo** (cacto/pedra no chão para pular, pássaro no alto para abaixar, ou sorteado),
  **criar ovo de bônus no grupo** (item para coletar), **desenhar fundo de floresta** (céu, sol, nuvens,
  morros e grama que rola — parallax), e **sons** de pulo, dano e coletar.
- O **recorde** (maior pontuação) que persiste entre partidas usa os blocos genéricos de armazenamento
  (\`localStorage\`), não precisa de bloco novo.

Veja o exemplo **"Nave contra Asteroides"** para um jogo de tiro e **"Dino Run"** para um jogo de corrida — ambos completos, montados só com blocos.
`,
  examples: [
    pongExample,
    animatedHeroExample,
    platformerExample,
    tilemapExample,
    asteroidsExample,
    dinoRunExample,
  ],
}
