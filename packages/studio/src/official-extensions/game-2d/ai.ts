export const gameTwoDPromptContext = `Extensão: Jogo 2D (id: game-2d)

PALCO IMPLÍCITO: o runtime é dono do canvas. As globais 'ctx' (contexto 2D) e
'tela' (o <canvas>) já existem — o aluno NÃO precisa criar canvas nem chamar
getContext. Se a página não tiver <canvas>, o runtime cria um. Nos BLOCOS o 'ctx'
fica escondido; no código gerado ele aparece como argumento (válido e reversível).

API global injetada como window.SZGame2D:
- createSprite({ x, y, w, h, color }) -> { x, y, w, h, color, vx, vy }
- drawSprite(ctx, sprite): desenha como fillRect.
- clear(): limpa a tela inteira (use no começo de cada quadro, antes de desenhar).
- isColliding(a, b): AABB.
- gameLoop(fn): chama fn a cada requestAnimationFrame.
- keys: estado das setas { left, right, up, down }.
- setGravity(g) / applyVelocity(sprite): física simples (vy += gravidade).
- bounceOnEdges(sprite, ctx): quica nas bordas do canvas.
- circleCollides(a, b): colisão por círculo.
- playSound(freq, ms): bip sintetizado (Web Audio).
- onPointer((x, y) => {…}): callback a cada clique/toque; pointer = { x, y, down }.

Eventos "Quando…" e perguntas (booleanos) — o modelo Scratch/MakeCode:
- onKey('ArrowRight', fn): roda fn a cada vez que a tecla é apertada (keydown).
- onOverlap(() => a, () => b, fn): roda fn quando os sprites a/b COMEÇAM a se tocar
  (edge-triggered, num loop interno). Os sprites entram como thunks (() => sprite).
- keyDown('ArrowRight'): true enquanto a tecla está segurada — use dentro de if/gameLoop.
- touches(a, b): true enquanto os dois sprites se tocam — use dentro de if.

Imagens e animação (v0.3.0) — as imagens vivem como ASSETS do projeto (aba Assets);
nos blocos/código você usa o NOME do asset (string):
- createSprite({ x, y, w, h, image: 'nome' }): sprite que mostra uma imagem (sem image, fica colorido).
- setImage(sprite, 'nome'): troca a imagem fixa do sprite (cancela a animação).
- loadSpriteSheet('nome', fw, fh): folha de sprites; fw/fh = tamanho de cada quadro em px.
- setAnimation(sprite, sheet, from, to, fps): anima o sprite entre os quadros [from..to].
- drawFrame(ctx, sheet, index, x, y, w, h): desenha um quadro específico (manual).
- loadImage('nome'): handle { img, loaded } (aceita nome do asset OU url/dataUrl direta).

Movimento e efeitos (v0.4.0) — sempre DENTRO do gameLoop:
- platformer(sprite, ctx, speed, jump): esq/dir + pulo (seta pra cima, só no chão) + gravidade; chão = base do canvas.
- topDown(sprite, speed): 4 direções com diagonal normalizada.
- followPointer(sprite, speed): anda em direção ao ponteiro.
- clampToScreen(sprite, ctx): prende o sprite dentro do canvas.
- flash(ctx, 'cor'): pinta a tela com cor translúcida (efeito de flash num frame).
- shake(ctx, intensidade): treme o canvas e PARA SOZINHO (chame uma vez, ex.: colisão).
- emitParticles(x, y, count, 'cor'): explosão de partículas; drawParticles(ctx) move+desenha a cada frame.

Tiles e tilemaps (v0.5.0) — cenários a partir de um tileset (asset com vários quadros lado a lado):
- createTileMap({ image: 'tileset', tile: 32, solid: '1', grid: '1 1 1;1 0 1;1 1 1' }): cria o mapa.
  grid = texto da grade (cada número = um quadro do tileset; ';' separa linhas, espaço separa colunas, '.' = vazio);
  solid = índices que barram o sprite (separados por vírgula).
- drawTileMap(ctx, map, x, y): desenha o mapa com o canto superior esquerdo em x/y.
- collideTileMap(sprite, map): impede o sprite de atravessar os tiles sólidos (pousa no chão, bate nas paredes).
- tileAt(map, px, py): índice do tile no pixel (px,py) — -1 se vazio/fora.

Quando ajudar o aluno com jogos 2D:
- O canvas é IMPLÍCITO ('ctx'/'tela' já existem) — não peça para criar canvas/getContext.
- Use SZGame2D.clear() no começo do gameLoop para limpar a tela.
- Prefira os eventos "Quando…" (onKey/onOverlap) e as perguntas (keyDown/touches) a
  ficar lendo o estado das teclas na mão — é mais próximo de como a criança pensa.
- Mostre que sprites são apenas objetos JS com x/y/w/h.
- Para imagens, lembre que o aluno precisa ADICIONAR o asset na aba Assets e usar o nome dele.
- Enquanto a imagem carrega (ou se faltar), o sprite cai num retângulo (placeholder) — nunca quebra.
- Prefira pequenas iterações didáticas — não despeje o jogo pronto.
`
