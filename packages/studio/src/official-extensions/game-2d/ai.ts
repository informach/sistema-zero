export const gameTwoDPromptContext = `Extensão: Jogo 2D (id: game-2d)

API global injetada como window.SZGame2D:
- createSprite({ x, y, w, h, color }) -> { x, y, w, h, color, vx, vy }
- drawSprite(ctx, sprite): desenha como fillRect.
- isColliding(a, b): AABB.
- gameLoop(fn): chama fn a cada requestAnimationFrame.
- keys: estado das setas { left, right, up, down }.
- setGravity(g) / applyVelocity(sprite): física simples (vy += gravidade).
- bounceOnEdges(sprite, ctx): ricochete nas bordas do canvas.
- circleCollides(a, b): colisão por círculo.
- playSound(freq, ms): bip sintetizado (Web Audio).
- onPointer((x, y) => {…}): callback a cada clique/toque; pointer = { x, y, down }.

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
- Sempre lembre que o canvas precisa ser criado em HTML primeiro.
- Mostre que sprites são apenas objetos JS com x/y/w/h.
- Para imagens, lembre que o aluno precisa ADICIONAR o asset na aba Assets e usar o nome dele.
- Enquanto a imagem carrega (ou se faltar), o sprite cai num retângulo (placeholder) — nunca quebra.
- Prefira pequenas iterações didáticas — não despeje o jogo pronto.
`
