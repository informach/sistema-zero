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
- setupStageFull(bg): "ocupar a tela toda" — SEM dimensões e SEM proporção fixa: o canvas preenche 100% da viewport e a resolução LÓGICA do jogo acompanha o tamanho real da tela (a área do jogo É a tela; muda com a janela; nítido via devicePixelRatio). Diferente do setupStage/fitScreen (que mantêm a proporção e deixam barras). Centralize por "a largura/altura da tela", não por número fixo. Bloco "Preparar o jogo para ocupar a tela toda".
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
- playFx("coin"|"jump"|"laser"|"explosion"|"hit"|"hurt"|"powerup"|"levelup"|"win"|"gameover"|"click"|"confirm"|"error"|"coin"|...): efeito sonoro PRONTO por nome (sintetizado, sem arquivo). Veja a lista completa no bloco "Tocar efeito".
- playNote("C"|"D"|"E"|"F"|"G"|"A"|"B"|"C5", ms): toca uma nota musical (dó ré mi…); junte várias para uma melodia.
- playMusic("adventure"|"happy"|"tense"|"calm"|"victory") / stopMusic(): música de fundo em loop (só uma por vez). Som só toca DEPOIS de um clique/tecla (exigência do navegador).
- onPointer((x, y) => {…}): callback a cada clique/toque; pointer = { x, y, down }.

Eventos "Quando…" e perguntas (booleanos) — o modelo Scratch/MakeCode:
- onKey('ArrowRight', fn): roda fn a cada vez que a tecla é apertada (keydown).
- onOverlap(() => a, () => b, fn): roda fn quando os sprites a/b COMEÇAM a se tocar
  (edge-triggered, num loop interno). Os sprites entram como thunks (() => sprite).
- keyDown('ArrowRight'): true enquanto a tecla está segurada — use dentro de if/gameLoop.
- touches(a, b): true enquanto os dois sprites se tocam — use dentro de if.

Tier 1 — mira/contas, vida/tempo, aparência, mundo e pausa (v0.15.0):
- distance(a, b) / angleTo(a, b): distância (px) e ângulo (graus, 0=cima, horário) entre dois sprites.
- aimAt(a, b): gira o sprite a para apontar para b. moveToward(a, b, speed): move a em direção a b (px/quadro).
- randomBetween(min, max): inteiro sorteado (inclusive). randomChance(percent): true em ~percent% das vezes (use em if).
- setHealth(s, n)/changeHealth(s, delta)/getHealth(s)/hasHealth(s): vida do sprite (delta negativo = dano; não passa de 0 nem do máximo).
- cooldownReady(s, frames): true no máximo a cada N quadros, POR sprite (cadência de tiro) — use em if.
- spriteX(s)/spriteY(s)/spriteW(s)/spriteH(s): posição (x/y) e tamanho (largura/altura) do sprite, em px.
- centerX(s)/centerY(s): o MEIO do sprite (x+largura/2, y+altura/2) — atirar/mirar/posicionar pelo centro.
- spriteVx(s)/spriteVy(s)/spriteSpeed(s): velocidade horizontal/vertical e a total (magnitude) do sprite.
- isMoving(s)/isMovingH(s)/isMovingV(s): true se o sprite se move (geral/horizontal/vertical) — use em if (limiar 0.01).
- randomX()/randomY(): posição x/y aleatória NA TELA (0..largura/altura) — fazer um sprite nascer num lugar sorteado (asteroides, estrelas). Evita Math.random()*largura na mão.
- pruneOld(grupo, segundos): tira do grupo quem viveu mais que o tempo (tiros somem sozinhos).
- flipSprite(s, 'left'|'right') / setOpacity(s, percent) / setSize(s, w, h) / scaleSprite(s, fator): espelhar/transparência/tamanho.
- wrapEdges(s): dá a volta na tela (sai de um lado, reaparece no outro).
- pauseGame()/resumeGame()/isPaused(): estado de pausa (embrulhe o movimento em "se não estiver pausado").

Tier 2 — câmera, mapa destrutível, ordem de desenho e depuração (v0.16.0):
- cameraFollow(s, worldW, worldH): centraliza a câmera no sprite (mundo maior que a tela), preso às bordas.
  setCamera(x, y) posiciona na mão; cameraX()/cameraY() leem a posição (útil p/ parallax). A câmera rola
  só o MUNDO (drawSprite/drawGroup/drawTileMap/drawParticles) — desenhe o HUD DEPOIS, que ele fica fixo.
  ⚠️ onPointer/pointer continuam em coordenadas de TELA; com câmera, mundo = tela + câmera.
- breakTileAtSprite(map, s)/setTileAtSprite(map, index, s)/tileAtSprite(map, s): muda/quebra/lê o tile na
  célula onde está o sprite (mineração, terreno destrutível, construir).
- bringToFront(grupo, s)/sendToBack(grupo, s): muda a ordem de desenho do sprite dentro do grupo.
- drawHitbox(s): contorno da área de colisão (depurar). showFps(x, y): contador de quadros por segundo.

Imagens e animação (v0.3.0) — as imagens vivem como ASSETS do projeto (aba Assets);
nos blocos/código você usa o NOME do asset (string):
- createSprite({ x, y, w, h, image: 'nome' }): sprite que mostra uma imagem (sem image, fica colorido).
- setImage(sprite, 'nome'): troca a imagem fixa do sprite (cancela a animação).
- loadSpriteSheet('nome', fw, fh): folha de sprites; fw/fh = tamanho de cada quadro em px.
- setAnimation(sprite, sheet, from, to, fps): anima o sprite entre os quadros [from..to].
- setStateAnimation(sprite, 'estado', sheet, from, to, fps): guarda a animação de UM estado do
  sprite ('parado'|'andando'|'vertical'|'pulando'|'caindo'|'dano'). Configuração: FORA do gameLoop.
- autoAnimate(sprite): DENTRO do gameLoop; troca a animação sozinho conforme o estado (dano >
  pulando/caindo > andando > vertical > parado) e vira o sprite (facing) pelo sinal do vx.
  Estado sem animação cai no parente (caindo->pulando->andando->parado). Perder vida
  (changeHealth negativo) ou piscar (blink) conta como 'dano'. Pulando/caindo exigem chão
  (platformer/jumpOnGround/collideTileMap marcam sprite.onGround).
- drawFrame(ctx, sheet, index, x, y, w, h): desenha um quadro específico (manual).

Figuras: sprite desenhado por código (v0.23.0) — o visual do sprite feito com formas, sem imagem:
- defineShape('nome', function (ctx) {...}): registra um desenho nomeado. O corpo desenha em
  coords LOCAIS (0,0 = canto do sprite); pode usar os paint_* OU os blocos de Canvas (ctx é o
  parâmetro). Configuração: FORA do gameLoop.
- createShapeSprite('figura', { x, y, w, h }): cria um sprite que usa a figura (anda/gira/vira/
  colide como qualquer sprite). setShape(sprite, 'figura'): troca a figura de um sprite.
- paintRect/paintCircle/paintEllipse/paintTriangle/paintLine(ctx, ...coords..., 'cor'): formas
  simples dentro da figura (recebem o ctx da figura).
- shapeW()/shapeH(): tamanho do sprite que está sendo desenhado (para centralizar).
- Gotcha: a figura desenha em coords locais e ganha giro/flip/piscar do sprite de graça.

Tipos de inimigo (v0.22.0) — classes com comportamento pronto; o TIPO é um grupo estendido
({ items, bullets: {items}, config }), então os helpers de grupo funcionam nele:
- createEnemyType({ behavior, color, image, hp, speed, dmg, w, h }): behavior em
  'patrulha'|'perseguidor'|'voador'|'voador-vertical'|'saltador'|'atirador'.
- spawnEnemy(tipo, x, y): solta um inimigo com a vida/dano/animações do tipo.
- updateEnemyType(tipo, ctx, alvo): DENTRO do gameLoop; comportamento + autoAnimate + tiros do
  atirador + remove derrotados (hp<=0 -> particulas + onDefeat). Alvo = quem perseguir/mirar.
- drawEnemyType(ctx, tipo): desenha inimigos + tiros.
- onEnemyDefeated(tipo, function (inimigo) {...}): registrar UMA vez, fora do gameLoop.
- overlapEnemyShots(() => sprite, tipo, function (tiro) {...}): DENTRO do gameLoop; remove o
  tiro ao acertar.
- hurtByEnemy(sprite, inimigoOuTiro): tira enemyDamage() da vida + blink(45); piscando =
  invencivel (nao drena no contato continuo).
- enemyDamage(inimigoOuTiro): o dano de contato (default 1).
- setEnemyStateAnimation(tipo, 'estado', sheet, from, to, fps): animação por estado do TIPO.
- setEnemyTypeParam(tipo, 'pulo'|'ritmo'|'alcance'|'cadencia'|'tiro', valor): sintonia fina.
- Patrulha em mapa de tiles: collideTileMap zera o vx na parede -> o inimigo vira sozinho
  (use forEachInGroup(tipo, ...) + collideTileMap dentro do gameLoop).
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
- createTileMapFromAsset('meu-mapa'): mapa PRONTO de um desenho de MAPA (Pinta/fatiador — asset
  com metadado de mapa: grade/peças/sólidos embutidos). Sem metadado -> mapa vazio + aviso.
- createTileMap({ image: 'tileset', tile: 32, solid: '1', grid: '1 1 1;1 0 1;1 1 1' }): cria o mapa.
  grid = texto da grade (cada número = um quadro do tileset; ';' separa linhas, espaço separa colunas, '.' = vazio);
  solid = índices que barram o sprite (separados por vírgula).
- drawTileMap(ctx, map, x, y, size): desenha o mapa. size = tamanho do tile NA TELA (px);
  0 (ou ausente) = encaixa sozinho no canvas, centralizado. x/y deslocam o mapa (câmera).
- collideTileMap(sprite, map): impede o sprite de atravessar os tiles sólidos (pousa no chão, bate nas paredes).
- collideGroup(sprite, group): impede o sprite de atravessar os sprites de um grupo (obstáculos SEM
  tilemap: pedras/casas/paredes desenhadas à mão, inclusive por figura). Mesma física do collideTileMap
  (empurra pra fora + desliza). Use no gameLoop, depois de mover o sprite.
- collideSprite(sprite, other): a mesma colisão sólida, mas contra UM sprite só (uma parede/plataforma
  solta), sem precisar montar um grupo. Bloco "Impedir de atravessar o sprite".
- tileAt(map, px, py): índice do tile no pixel (px,py) — -1 se vazio/fora.

Grupos de sprites (v0.6.0) — para MUITOS sprites (tiros, inimigos, estrelas), sem
criar um por um. Um grupo é uma lista gerenciada de sprites:
- createGroup() -> { items: [] }: cria um grupo vazio (guarde numa variável).
- spawn(grupo, { x, y, w, h, color | image, vx, vy }): cria um sprite e coloca no grupo (devolve o sprite). Use x/y com número aleatório para nascer em lugares diferentes. Teto de 400 por grupo.
- updateGroup(grupo): move cada sprite pela velocidade (vx/vy); drawGroup(ctx, grupo): desenha todos.
- updateGroupNoGravity(grupo): move cada sprite pela velocidade SEM somar gravidade — para os TIROS do
  jogador num jogo COM gravidade (senão os tiros arqueiam). Bloco "Mover o grupo sem gravidade".
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

Estado/telas (cenas) — início → jogando → ganhou → perdeu, ou qualquer nome livre
inventado pela criança (ex.: ganhou1), com UM só gameLoop:
- setScene("jogando") / sceneIs("jogando") (booleano, use no if) / showScreen(ctx, titulo, subtitulo, dica, fundo) / restart(). O titulo/subtitulo/dica aceitam texto fixo OU expressão (variável, "juntar texto", resultado de função) — ex.: "Destrua " + alvo + " asteroides" mostra a meta vinda de uma variável.
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

NAVE CLÁSSICA — girar + impulsionar na direção apontada (v0.10.0), para o Asteroids clássico (a nave gira e acelera pra onde aponta). Os sprites ganham um ÂNGULO em GRAUS (0 = pra cima, horário) que o desenho passa a respeitar (a nave/sprite aparece girada):
- steerThrust(sprite, velocidade, giro): controle pronto de nave — vira com ←/A e →/D, acelera com ↑/W na direção apontada e desliza com atrito ao soltar; já move o sprite. Bloco "Controlar o sprite como nave". É o atalho recomendado para a criança.
- rotateSprite(sprite, graus) / pointSprite(sprite, graus): girar o sprite um tanto / apontar direto para um ângulo. thrust(sprite, força): acelerar na direção apontada (soma à velocidade — combine com applyVelocity). applyFriction(sprite, fator): frear aos poucos (multiplica a velocidade por 0..1). spriteAngleDeg(sprite): valor — a direção atual em graus.
- shootFrom(sprite, grupo, { speed, color }): cria um tiro na PONTA do sprite, indo na direção que ele aponta (use no "quando apertar Espaço"). spawnAsteroidFromEdge(grupo, { size, color, speed }): solta um asteroide de uma borda aleatória rumo ao centro (use no "a cada X segundos"). Existe o exemplo pronto "Asteroides clássico" mostrando tudo junto.

PULO NO CHÃO (genérico, v0.9.0) — para jogos de corrida/pulo SEM andar para os lados:
- jumpOnGround(sprite, ctx, força): aplica gravidade, pousa o sprite na BASE da tela e pula com ↑/Espaço/W OU um toque. Use dentro do gameLoop. Bloco "Fazer o sprite pular no chão". Diferente do platformer (que também anda esquerda/direita).

KIT DINO (v0.9.0) — categoria "🦕 Kit dino" com atalhos PRONTOS (não genéricos) para um jogo de corrida estilo "Dino Run"; os blocos genéricos seguem nas categorias normais:
- createDino({ x, y, size, color }): dinossauro desenhado (perninhas que correm sozinhas; a pose muda no pulo/agachar). É um sprite normal (drawSprite desenha o dino).
- controlDino(dino, ctx, força): controla o dino estilo corrida — pula com ↑/Espaço ou toque na metade de CIMA; abaixa com ↓ ou segurando o dedo embaixo. Já vem com gravidade, chão (linha um pouco acima da base, sobre a grama) e poeira. Use no gameLoop.
- spawnObstacle(grupo, ctx, { type, x, size, vx }): coloca no grupo um obstáculo desenhado. type = 'cactus'/'rock' (no chão, pule por cima), 'bird' (no alto, abaixe por baixo) ou 'random' (sorteia). O y é automático pelo tipo; ligue x na borda direita e vx negativo. updateGroup/drawGroup tratam como sprite normal.
- spawnEgg(grupo, { x, y, vx }): coloca no grupo um OVO (item de bônus). Quando o dino encosta, dê pontos extras e remova o ovo.
- drawForest(ctx, velocidade): fundo de FLORESTA com parallax (céu, sol, nuvens, morros e grama que rola) — chame logo após clear(). O dino corre sobre a grama.
- playJump()/playDinoHurt()/playCollect(): sons de pulo, dano e coletar (sintetizados).
- Recorde que PERSISTE: use os blocos genéricos de armazenamento (storageSet/storageGet, localStorage) — não há bloco específico de recorde. Existe o exemplo pronto "Dino Run" mostrando tudo junto.

KIT GORILAS (v0.11.0) — categoria "🦍 Kit gorilas" com atalhos PRONTOS para um jogo de artilharia por TURNOS estilo "Gorillas", para 2 jogadores no mesmo aparelho. O estado pesado (cidade, banana, mira) mora no runtime; a criança só guarda a cidade, os gorilas e uma variável "vez" (0/1). Coordenadas de tela normais (Y para baixo); NÃO precisa de flip de Y nem fullscreen.
- createCity(): sorteia uma cidade { buildings, holes, wind, W, H } (prédios com janelas + vento). Guarde numa variável (ex.: cidade). É nela que os gorilas ficam e a banana abre crateras.
- drawCity(ctx, city): desenha céu, lua e prédios — JÁ com as crateras "furadas" (usa rect+arc+clip internamente). Use no começo do gameLoop, após clear().
- placeThrower(city, { side, color }): cria um gorila (sprite normal, drawSprite desenha) no alto de um prédio perto da ponta ('left'/'right'). Faça um por jogador.
- newWind(city): sorteia um novo vento (empurra a banana). drawWind(ctx, city): seta no topo (tamanho = força, lado = direção). Re-sorteie a cada troca de turno.
- aimDrag(ctx, thrower): mira ARRASTANDO — enquanto segura o mouse/dedo, aponte para onde quer jogar (mais longe = mais forte) e veja a trajetória pontilhada; ao SOLTAR, congela a mira. Não faz nada enquanto uma banana está voando (um tiro por vez). Use no gorila da VEZ, no gameLoop.
- aimReleased(thrower): valor (booleano) — verdadeiro no instante em que solta a mira. Use num "se" para então throwBanana.
- throwBanana(thrower, city): lança a banana com a mira atual. updateBanana(city): move a banana (gravidade + vento). drawBanana(ctx, city): desenha a banana voando com rastro. Só existe UMA banana por vez.
- bananaHitThrower(city, thrower): valor — a banana acertou o gorila? (passe o INIMIGO; acerto = vitória; some com a banana). bananaHitCity(city): valor — a banana bateu num prédio (abre cratera) ou saiu da tela? (some com a banana; é a hora de trocar a vez: vez = 1 - vez e newWind).
- playWhistle()/playBoom(): assobio de banana caindo e explosão (sintetizados). Existe o exemplo pronto "Guerra de Gorilas" mostrando tudo junto.
- computerTurn(thrower, city, enemy): vez do ROBÔ (IA). Use no gameLoop, na vez dele. Simula vários arremessos (mesma física da banana, sem ctx), escolhe o melhor mira no inimigo, "pensa" ~0,8s e joga sozinho. Respeita _banana (um tiro por vez). Para 1-jogador-vs-computador troque o ramo de um gorila por este bloco; para autoplay, os dois. Veja "Guerra de Gorilas vs Robô".
- drawAimReadout(ctx): desenha "angulo X / forca Y" no canto (lê _aim) — útil para ver a escolha do robô.

KIT EQUILIBRISTA (v0.13.0) — categoria "🤸 Kit equilibrista" com atalhos PRONTOS para um jogo estilo "Stick Hero" (estica o bastão e atravessa). O estado pesado (herói, plataformas, bastões, fase) mora no runtime; a criança só guarda o jogo numa variável. Controle pelo PONTEIRO global (segurar = esticar, soltar = derrubar) — NÃO precisa registrar listeners. Canvas em pé (ex.: 360×480).
- createStickHero(ctx): monta o jogo (herói, plataformas, colinas, árvores) lendo o tamanho do canvas. Guarde numa variável (ex.: jogo). Faça UMA vez, fora do "a cada quadro".
- updateStickHero(jogo): um passo do jogo + desenha tudo (placar e dicas inclusos). Use DENTRO do "a cada quadro". Acerto no meio (faixa vermelha) vale 2 pontos. Recomeça sozinho ao tocar depois de cair.
- stickHeroScore(jogo): valor — pontos. stickHeroOver(jogo): valor (booleano) — caiu? restartStickHero(jogo): zera o jogo (bom para um botão). Exemplo pronto "Equilibrista".

KIT BALÃO (v0.13.0) — categoria "🎈 Kit balão" com atalhos PRONTOS para um jogo estilo "Hot-Air-Balloon" (sobe segurando, economiza combustível, desvia das árvores). Estado no runtime; a criança guarda o jogo numa variável. Segurar o ponteiro = aquecer/subir (gasta combustível); voar baixo economiza. Canvas deitado (ex.: 560×360).
- createBalloon(ctx): monta o jogo (céu, colinas, árvores, combustível) lendo o tamanho do canvas. Guarde numa variável. Faça UMA vez.
- updateBalloon(jogo): um passo do jogo + desenha tudo (medidor de combustível, metros e dicas). Use DENTRO do "a cada quadro". Recomeça ao tocar depois do fim.
- balloonScore(jogo): valor — metros voados. balloonFuel(jogo): valor — combustível 0..100. balloonOver(jogo): valor (booleano) — bateu numa árvore ou acabou o combustível? restartBalloon(jogo): zera o jogo. Exemplo pronto "Balão".

CANVAS NA MÃO (genérico) — novos blocos de ✏️ Traçado úteis para crateras/máscaras: ctx.rect(x,y,w,h) adiciona um retângulo ao traçado; ctx.clip() recorta o desenho pelo traçado atual; ctx.isPointInPath(x,y)/ctx.isPointInStroke(x,y) são perguntas (o ponto está dentro/na linha do traçado?). Para "furar" um buraco: traçado com o retângulo da tela inteira + um arco no sentido anti-horário, depois clip. Há também os eventos "apertar o mouse"/"soltar o mouse" (mousedown/mouseup) na programação normal, para mira por arrastar.
`
