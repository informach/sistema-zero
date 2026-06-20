export const gameTwoDPromptContext = `Extensão: Jogo 2D (id: game-2d)

PALCO IMPLÍCITO: o runtime é dono do canvas. As globais 'ctx' (contexto 2D) e
'tela' (o <canvas>) já existem — o aluno NÃO precisa criar canvas nem chamar
getContext. Se a página não tiver <canvas>, o runtime cria um. Nos BLOCOS o 'ctx'
fica escondido; no código gerado ele aparece como argumento (válido e reversível).

API global injetada como window.SZGame2D:
- createSprite({ x, y, w, h, color }) -> { x, y, w, h, color, vx, vy }
- drawSprite(ctx, sprite): desenha como fillRect.
- clear(): limpa a tela inteira (use no começo de cada quadro, antes de desenhar).
- fitScreen(percent): faz o canvas PREENCHER ~percent% da janela mantendo a proporção. As COORDENADAS do jogo (mundo lógico) não mudam, mas o desenho passa a ser feito na resolução REAL da tela — fica grande E nítido (sem borrar) e se reajusta sozinho ao redimensionar. Chame uma vez no começo. Bloco "Fazer a tela preencher N% da janela".
- spawnBullet(grupo, { x, y, radius, color, vx, vy }): cria um TIRO (bolinha com brilho/glow) no grupo; x/y = centro. Bloco "Criar tiro no grupo".
- arrowsX(sprite, speed): move o sprite SÓ na horizontal com as setas (combine com clampToScreen). Bloco "Mover o sprite com as setas".
- blink(sprite, frames): faz o sprite PISCAR por N quadros (invencibilidade ao levar dano). Bloco "Fazer o sprite piscar".
- everyFrames agora aceita NÚMERO ou VARIÁVEL no intervalo (ex.: a cada [intervalo] quadros) — dá para acelerar o spawn por fase.
- spawnAsteroid varia o tamanho de cada asteroide sozinho; showScreen escurece de leve (o jogo aparece atrás) e quebra o subtítulo em linhas.
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

Grupos de sprites (v0.6.0) — para MUITOS sprites (tiros, inimigos, estrelas), sem
criar um por um. Um grupo é uma lista gerenciada de sprites:
- createGroup() -> { items: [] }: cria um grupo vazio (guarde numa variável).
- spawn(grupo, { x, y, w, h, color | image, vx, vy }): cria um sprite e coloca no grupo (devolve o sprite). Use x/y com número aleatório para nascer em lugares diferentes. Teto de 400 por grupo.
- updateGroup(grupo): move cada sprite pela velocidade (vx/vy); drawGroup(ctx, grupo): desenha todos.
- forEachInGroup(grupo, function (sprite) {…}): roda o corpo para cada sprite (ordem reversa, pode remover no corpo).
- countGroup(grupo): quantidade atual (valor, use em if/conta). clearGroup(grupo): esvazia. removeFromGroup(grupo, sprite): tira um.
- pruneOffscreen(ctx, grupo, margem, function (sprite) {…}): remove os que saíram da tela e roda o corpo para cada um (ex.: perder vida quando um inimigo escapa).
- overlapGroups(a, b, function (sa, sb) {…}): para cada par (um de cada grupo) que se encosta, roda o corpo com os dois sprites (use DENTRO do gameLoop). NÃO confundir com onOverlap (que é 1 sprite × 1 sprite).
- everyFrames("chave", N): true a cada N quadros; everySeconds("chave", S): true a cada S segundos. Use como condição de um if dentro do gameLoop para criar inimigos de tempos em tempos (ex.: a cada 30 quadros, spawn no grupo).

Para um jogo de tiro (nave × asteroides): crie 2 grupos (tiros, asteroides); no gameLoop, a cada N quadros spawn um asteroide com x aleatório e vy positivo; updateGroup + drawGroup nos dois; overlapGroups(tiros, asteroides, …) para somar ponto e remover os dois; pruneOffscreen no grupo de asteroides para perder vida quando um escapa.

HUD no canvas (v0.6.0) — desenhe DENTRO do gameLoop, depois de limpar a tela:
- drawScore(ctx, "Pontos:", valor, x, y, "cor", tamanho): escreve "rótulo valor".
- drawLabel(ctx, "texto", x, y, "cor", tamanho, "left|center|right"): texto fixo (títulos).
- drawHearts(ctx, vidas, x, y, tamanho, "cor"): fileira de corações (vidas). Teto de 20.
- drawBar(ctx, valor, max, x, y, w, h, "cor"): barra de progresso/vida (fração valor/max).

Estado/telas (cenas) — início → jogando → ganhou → perdeu, com UM só gameLoop:
- setScene("jogando") / sceneIs("jogando") (booleano, use no if) / showScreen(ctx, titulo, subtitulo, dica, fundo) / restart().
- IMPORTANTE: as variáveis e grupos (createGroup, createSprite, pontos, vidas) ficam no TOPO do programa (fora do gameLoop), para o loop conseguir enxergá-las. NÃO existe um bloco "quando o jogo começar" que embrulhe isso — o setup é só os blocos do topo.
- Padrão: setup no topo + setScene("inicio"); um único "a cada quadro" que limpa a tela e usa "se a tela atual é X" para decidir o que desenhar; um "quando apertar Enter" que troca início→jogando e, no perdeu/ganhou, chama reiniciar.

Cenário (v0.6.0): drawStarfield(ctx, velocidade) desenha um céu de estrelas rolando (fundo espacial; chame logo após clear); dragX(sprite) faz o sprite seguir o dedo/mouse só na horizontal (nave no celular). Existe o exemplo pronto "Nave contra Asteroides" mostrando tudo junto.

CAMINHO "NA MÃO" (sem a extensão Jogo 2D, só Canvas + Programação): dá para montar o MESMO tipo de jogo na unha. Novidades do núcleo (v0.6.0):
- Canvas: começar traçado / ir para (moveTo) / traçar linha (lineTo) / fechar / contorno (stroke) / preencher (fill) + cor do contorno (strokeStyle), espessura (lineWidth), transparência (globalAlpha), fonte (font) e alinhamento do texto (textAlign). Com isso a criança desenha a nave (triângulo) e os asteroides (polígono) com beginPath + lineTo + fill, e usa repetição + sin/cos para o polígono.
- Entrada: "a tecla X está apertada?" (__szInput.key) e "x/y do mouse/dedo" (__szInput.x/.y) — um shim window.__szInput é injetado SEMPRE no preview, então funciona em qualquer projeto, sem extensão.
- Conciliação do ctx: no caminho na mão o aluno usa "Pegar canvas… e guardar contexto em ctx" (const ctx = canvas.getContext('2d')). Esse ctx explícito CONVIVE com o ctx implícito do Jogo 2D — o runtime define ctx como global lazy e o setter o substitui por um valor normal quando o aluno cria o seu. Sem setup, ctx cai no implícito.

Quando ajudar o aluno com jogos 2D:
- O canvas é IMPLÍCITO ('ctx'/'tela' já existem) — não peça para criar canvas/getContext.
- Use SZGame2D.clear() no começo do gameLoop para limpar a tela.
- Prefira os eventos "Quando…" (onKey/onOverlap) e as perguntas (keyDown/touches) a
  ficar lendo o estado das teclas na mão — é mais próximo de como a criança pensa.
- Mostre que sprites são apenas objetos JS com x/y/w/h.
- Para imagens, lembre que o aluno precisa ADICIONAR o asset na aba Assets e usar o nome dele.
- Enquanto a imagem carrega (ou se faltar), o sprite cai num retângulo (placeholder) — nunca quebra.
- Prefira pequenas iterações didáticas — não despeje o jogo pronto.
- DESEMPENHO: crie sprites/grupos/objetos UMA vez no TOPO do programa, fora do "a cada quadro". Criar dentro do loop enche a memória (no Jogo 3D pode até apagar a tela). Dentro do loop, use spawn/createSprite só de propósito (ex.: um tiro a cada N quadros) e SEMPRE remova da tela os objetos que já saíram, com pruneOffscreen, para o grupo não crescer sem fim e a colisão (overlapGroups) não ficar lenta.

KIT ESPAÇO (v0.7.0) — categoria "🚀 Kit espaço" com atalhos PRONTOS (não genéricos) para jogos de nave espacial; os blocos genéricos seguem nas categorias normais:
- createShip({ x, y, w, h, body, wings }): nave desenhada (cabine + foguinho que pulsa sozinho); body = cor do corpo, wings = cor das asas. É um sprite normal (drawSprite desenha a nave).
- spawnAsteroid(grupo, { x, y, size, color, vx, vy }): coloca no grupo um asteroide desenhado (polígono irregular que gira, cada um único). updateGroup/drawGroup tratam ele como qualquer sprite.
- drawStarfield(ctx, velocidade): fundo espacial (gradiente + estrelas que cintilam/rolam) — chame logo após clear().
- explodeSprite(sprite, "cor"): explosão de partículas no centro do sprite. playShoot()/playExplosion(): sons de tiro e explosão.
- overlapSpriteGroup(() => nave, grupo, (item) => {…}): genérico — para cada sprite do grupo que encosta na nave, roda o corpo (ex.: tirar vida). Use no gameLoop.
`
