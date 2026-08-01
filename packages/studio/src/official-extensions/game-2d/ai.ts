import { withGameTwoDLifecycleGuidance } from './pedagogy'

export const gameTwoDPromptContext = withGameTwoDLifecycleGuidance(`Extensão: Jogo 2D (id: game-2d)

CICLO DE VIDA:
- [[G2D_LIFECYCLE_START]]
- [[G2D_LIFECYCLE_EVENTS]]
- [[G2D_LIFECYCLE_LOOP]]

PALCO IMPLÍCITO: o runtime é dono do canvas. As globais 'ctx' (contexto 2D) e
'tela' (o <canvas>) já existem — o aluno NÃO precisa criar canvas nem chamar
getContext. Se a página não tiver <canvas>, o runtime cria um. Nos BLOCOS o 'ctx'
fica escondido; no código gerado ele aparece como argumento (válido e reversível).

API global injetada como window.SZGame2D:
- setupStage(largura, altura, fundo): prepara o canvas responsivo com proporção fixa.
- createSprite({ x, y, w, h, color }) -> { x, y, w, h, color, vx, vy }
- drawSprite(ctx, sprite): desenha como fillRect.
- clear(): limpa a tela inteira (use no começo de cada quadro, antes de desenhar).
- fitScreen(percent): faz o canvas PREENCHER ~percent% da janela mantendo a proporção. As COORDENADAS do jogo (mundo lógico) não mudam, mas o desenho passa a ser feito na resolução REAL da tela — fica grande E nítido (sem borrar) e se reajusta sozinho ao redimensionar. Chame uma vez no começo. Bloco "Fazer a tela preencher N% da janela".
- showStageBorder(cor, espessura): põe uma moldura colorida em volta do canvas (CSS no elemento, não desenhada por dentro), para enxergar onde começa e termina a área do jogo. É de ensino/depuração, como o drawHitbox. Chame uma vez no começo; espessura capada em 40. Bloco "Mostrar a borda da tela".
- setupStageFull(bg): "ocupar a tela toda" — SEM dimensões e SEM proporção fixa: o canvas preenche 100% da viewport e a resolução LÓGICA do jogo acompanha o tamanho real da tela (a área do jogo É a tela; muda com a janela; nítido via devicePixelRatio). Diferente do setupStage/fitScreen (que mantêm a proporção e deixam barras). Centralize por "a largura/altura da tela", não por número fixo. Bloco "Preparar o jogo para ocupar a tela toda".
- spawnBullet(grupo, { x, y, radius, color, vx, vy }): cria um TIRO (bolinha com brilho/glow) no grupo; x/y = centro. Bloco "Criar tiro no grupo".
- arrowsX(sprite, speed): move o sprite SÓ na horizontal com as setas (combine com clampToScreen). Bloco "Mover o sprite com as setas".
- blink(sprite, frames): faz o sprite PISCAR por N quadros (invencibilidade ao levar dano). Bloco "Fazer o sprite piscar".
- everyFrames agora aceita NÚMERO ou VARIÁVEL no intervalo (ex.: a cada [intervalo] quadros) — dá para acelerar o spawn por fase.
- spawnAsteroid varia o tamanho de cada asteroide sozinho; showScreen escurece de leve (o jogo aparece atrás) e quebra o subtítulo em linhas.
- isColliding(a, b): AABB.
- onStart(fn): adapter interno usado pelo gerador para reinício; NÃO gere essa
  chamada nem ofereça o bloco legado. Use as Áreas do projeto.
- gameLoop(fn): adiciona fn ao agendador do jogo, com passo fixo de 60 Hz. Vários loops coexistem.
- keys: estado das setas { left, right, up, down }.
- setGravity(g) / applyVelocity(sprite): física simples com valor finito explícito
  (vy += gravidade). Zero desliga e valores negativos puxam para cima; platformer,
  jumpOnGround e inimigos terrestres respeitam o mesmo valor.
- bounceOnEdges(sprite, ctx): quica nas bordas do canvas.
- circleCollides(a, b): colisão por círculo.
- setHitboxScale(sprite, percent): dial da colisão PERDOADORA — a área usada nas perguntas de
  encostar vira percent% do tamanho, centrada (menor = mais justo p/ DANO; maior = mais fácil
  de PEGAR). Vale p/ touches/onOverlap/overlapGroups/circleCollides; a física de EMPURRAR
  (collideGroup/collideSprite/collideTileMap) usa o tamanho cheio de propósito. drawHitbox
  mostra a área efetiva. Bloco "Usar área de colisão de N% do tamanho".
- playSound(freq, ms): bip sintetizado (Web Audio).
- playFx("coin"|"jump"|"laser"|"explosion"|"hit"|"hurt"|"powerup"|"levelup"|"win"|"gameover"|"click"|"confirm"|"error"|"coin"|...): efeito sonoro PRONTO por nome (sintetizado, sem arquivo). Veja a lista completa no bloco "Tocar efeito".
- playNote("C"|"D"|"E"|"F"|"G"|"A"|"B"|"C5", ms): toca uma nota musical (dó ré mi…); junte várias para uma melodia.
- playMusic("adventure"|"happy"|"tense"|"calm"|"victory") / stopMusic(): música de fundo persistente em loop (só uma por vez). Gere em ⚙️ Ao iniciar, ⚡ Quando acontecer ou diretamente numa função, nunca dentro de 🔁 Enquanto estiver rodando. Repetir a mesma música não reinicia a faixa. Som só toca DEPOIS de um clique/tecla (exigência do navegador).
- onPointer((x, y) => {…}): callback a cada clique/toque; pointer = { x, y, down }.

Eventos "Quando…" e perguntas (booleanos) — o modelo Scratch/MakeCode:
- onKey('ArrowRight', fn): roda fn a cada vez que a tecla é apertada (keydown).
- onOverlap(() => a, () => b, fn): roda fn quando os sprites a/b COMEÇAM a se tocar
  (edge-triggered, num loop interno). Os sprites entram como thunks (() => sprite).
- keyDown('ArrowRight'): true enquanto a tecla está segurada — use dentro de if/gameLoop.
- touches(a, b): true enquanto os dois sprites se tocam — use dentro de if.

Funções gerais — mira/contas, vida/tempo, aparência, mundo e pausa:
- distance(a, b) / angleTo(a, b): distância (px) e ângulo (graus, 0=cima, horário) entre dois sprites.
- aimAt(a, b): gira o sprite a para apontar para b. moveToward(a, b, speed): move a em direção a b (px/quadro).
- randomBetween(min, max): inteiro sorteado (inclusive). randomChance(percent): true em ~percent% das vezes (use em if).
- setHealth(s, n): inicializa vida atual e máxima; use UMA vez em ⚙️ Ao iniciar. Valores viram inteiros >= 0.
- changeHealth(s, delta)/getHealth(s)/getMaxHealth(s)/hasHealth(s): muda e consulta a vida sem passar de 0 ou do máximo. Sprite não inicializado não é considerado morto e recebe orientação no console.
- healthDepleted(s): true só quando a vida foi inicializada e chegou a 0. É a pergunta positiva “as vidas acabaram?”.
- isInvincible(s): true enquanto o sprite pisca e damageSprite ignora novos danos. Use com “não” para disparar efeitos apenas quando o dano puder acontecer.
- damageSprite(s, amount, frames): tira vida uma vez e dá invencibilidade piscando; prefira para contato contínuo.
- cooldownReady(s, frames, key): true no máximo a cada N quadros. Cada bloco gerado passa uma chave própria, então duas recargas no mesmo sprite são independentes.
- spriteX(s)/spriteY(s)/spriteW(s)/spriteH(s): posição (x/y) e tamanho (largura/altura) do sprite, em px.
- centerX(s)/centerY(s): o MEIO do sprite (x+largura/2, y+altura/2) — atirar/mirar/posicionar pelo centro.
- spriteVx(s)/spriteVy(s)/spriteSpeed(s): velocidade horizontal/vertical e a total (magnitude) do sprite.
- isMoving(s)/isMovingH(s)/isMovingV(s): true se o sprite se move (geral/horizontal/vertical) — use em if (limiar 0.01).
- randomX()/randomY(): posição x/y aleatória NA TELA (0..largura/altura) — fazer um sprite nascer num lugar sorteado (asteroides, estrelas). Evita Math.random()*largura na mão.
- pruneOld(grupo, segundos): tira do grupo quem viveu mais que o tempo (tiros somem sozinhos).
- flipSprite(s, 'left'|'right') / setOpacity(s, percent) / setSize(s, w, h) / scaleSprite(s, fator): espelhar/transparência/tamanho.
- wrapEdges(s): dá a volta na tela (sai de um lado, reaparece no outro).
- pauseGame()/resumeGame()/isPaused(): pausa congela os loops e contatos; teclas/cliques continuam ativos para permitir retomar.

Funções para mundos maiores — câmera, mapa destrutível, ordem de desenho e depuração:
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
  Patrulha não cai num top-down; para fazê-la cair em plataforma, gere setGravity
  em Ao iniciar, sem inferir o modo a partir de platformer/jumpOnGround.
- spawnEnemy(tipo, x, y): solta um inimigo com a vida/dano/animações do tipo.
- updateEnemyType(tipo, ctx, alvo): DENTRO do gameLoop; comportamento + autoAnimate + tiros do
  atirador + remove derrotados (hp<=0 -> particulas + onDefeat). Alvo = quem perseguir/mirar.
- drawEnemyType(ctx, tipo): desenha inimigos + tiros.
- onEnemyDefeated(tipo, function (inimigo) {...}): registrar UMA vez, fora do gameLoop.
- overlapEnemyShots(() => sprite, tipo, function (tiro) {...}): DENTRO do gameLoop; remove o
  tiro ao acertar.
- hurtByEnemy(sprite, inimigoOuTiro): usa damageSprite com enemyDamage() e 45 quadros; piscando =
  invencivel (nao drena no contato continuo).
- enemyDamage(inimigoOuTiro): o dano de contato (default 1).
- setEnemyStateAnimation(tipo, 'estado', sheet, from, to, fps): animação por estado do TIPO.
- setEnemyTypeParam(tipo, 'pulo'|'ritmo'|'alcance'|'cadencia'|'tiro', valor): sintonia fina.
- Patrulha em mapa de tiles: collideTileMap zera o vx na parede -> o inimigo vira sozinho
  (use forEachInGroup(tipo, ...) + collideTileMap dentro do gameLoop).
- loadImage('nome'): handle { img, loaded } (aceita nome do asset OU url/dataUrl direta).

Movimento e efeitos (v0.4.0) — sempre DENTRO do gameLoop:
- platformer(sprite, ctx, speed, jump): esq/dir + pulo (seta pra cima, só no chão) + gravidade; a borda atraída é o chão (base com gravidade positiva, teto com gravidade negativa).
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
  O bloco "Criar no grupo … um sprite" tem um campo "chamado" OPCIONAL: preenchido, gera "const nome = SZGame2D.spawn(...)" e a criança usa esse nome nos blocos seguintes (é assim que se anima um sprite de grupo — setAnimation(nome, folha, …) logo depois de criar, UMA vez; chamar todo quadro reiniciaria a animação). O nome vale só no trecho onde o sprite nasce.
- updateGroup(grupo): move cada sprite pela velocidade (vx/vy); drawGroup(ctx, grupo): desenha todos.
- drawGroupByY(ctx, grupo): desenha o grupo ordenado pela BASE (y+h) — quem está mais para baixo
  na tela fica na FRENTE (profundidade de jogo top-down: o herói passa atrás da árvore). Ordena
  uma cópia; a ordem lógica do grupo (trazer p/ frente/fundo) não muda. Bloco "Desenhar o grupo
  ordenado pela base".
- updateGroupNoGravity(grupo): move cada sprite pela velocidade SEM somar gravidade — para os TIROS do
  jogador num jogo COM gravidade (senão os tiros arqueiam). Bloco "Mover o grupo sem gravidade".
- forEachInGroup(grupo, function (sprite) {…}): roda o corpo para cada sprite (ordem reversa, pode remover no corpo).
- countGroup(grupo): quantidade atual (valor, use em if/conta). clearGroup(grupo): esvazia. removeFromGroup(grupo, sprite): tira um.
- pruneOffscreen(ctx, grupo, margem, function (sprite) {…}): remove os que saíram da tela e roda o corpo para cada um (ex.: perder vida quando um inimigo escapa).
- overlapGroups(a, b, function (sa, sb) {…}): para cada par (um de cada grupo) que se encosta, roda o corpo com os dois sprites (use DENTRO do gameLoop). NÃO confundir com onOverlap (que é 1 sprite × 1 sprite).
- overlapSpriteGroup(() => sprite, grupo, (item) => {…}): genérico — para cada item do grupo que encosta no sprite, roda o corpo (ex.: coletar moeda ou tirar vida). Fica em “💥 Colisões” e deve ser usado no gameLoop.
- everyFrames("chave", N) / everySeconds("chave", S): mecanismos internos usados pelas raízes “A cada N quadros/segundos”. No projeto da criança, essas raízes ficam diretamente em “🔁 Enquanto estiver rodando”, nunca dentro de outro gameLoop. Elas continuam rodando nas telas de início, vitória e derrota; para criar objetos apenas durante a partida, coloque um “se a tela atual é jogando?” dentro da raiz periódica.
- afterSeconds("chave", S): mecanismo interno da raiz “Depois de N segundos fazer” — one-shot: roda o corpo UMA vez por partida, S segundos depois do início (reiniciar o jogo re-arma). Para repetição use everySeconds. Mesma regra de raiz: fica direto em “🔁 Enquanto estiver rodando”.

Para um jogo de tiro (nave × asteroides): crie 2 grupos (tiros, asteroides); numa raiz “A cada N quadros”, teste se a tela atual é “jogando” e só então crie um asteroide com x aleatório e vy positivo. No “A cada quadro” da partida, use updateGroup + drawGroup nos dois; overlapGroups(tiros, asteroides, …) para somar ponto e remover os dois; pruneOffscreen no grupo de asteroides para perder vida quando um escapa.

HUD no canvas (v0.6.0) — desenhe DENTRO do gameLoop, depois de limpar a tela:
- drawScore(ctx, "Pontos:", valor, x, y, "cor", tamanho): escreve "rótulo valor".
- drawLabel(ctx, "texto", x, y, "cor", tamanho, "left|center|right"): texto fixo (títulos).
- drawSpriteHealth(ctx, sprite, "hearts|bar", x, y, tamanho, "cor"): HUD recomendado. Lê hp/hpMax do sprite; em hearts, tamanho é o diâmetro; em bar, é a largura e a altura é automática.
- drawHearts(ctx, vidas, x, y, tamanho, "cor"): API legada para projetos salvos e contadores que não pertencem a um sprite. Teto de 20.
- drawBar(ctx, valor, max, x, y, w, h, "cor"): barra de progresso/vida (fração valor/max).

Estado/telas (cenas) — início → jogando → ganhou → perdeu, ou qualquer nome livre
inventado pela criança (ex.: ganhou1), com UM só gameLoop:
- setStageDescription("objetivo e controles"): use em ⚙️ Ao iniciar para descrever o canvas a leitores de tela.
- setScene("jogando") / sceneIs("jogando") (booleano, use no if) / showScreen(ctx, titulo, subtitulo, dica, fundo) / restart(). O titulo/subtitulo/dica aceitam texto fixo OU expressão (variável, "juntar texto", resultado de função) — ex.: "Destrua " + alvo + " asteroides" mostra a meta vinda de uma variável.
- IMPORTANTE: variáveis, grupos e sprites ficam em “⚙️ Ao iniciar”; registros de
  evento ficam em “⚡ Quando acontecer”; raízes gameLoop ficam em “🔁 Enquanto estiver rodando”. As três
  áreas compartilham o mesmo escopo da partida sem recriar objetos a cada quadro.
- Comandos contínuos, inclusive as varreduras de colisão entre grupos, ficam no
  corpo do gameLoop ou em funções/métodos chamados por ele; nunca diretamente em
  Ao iniciar, eventos ou construtores.
- Padrão: setup + setScene("inicio") em ⚙️ Ao iniciar; Enter em ⚡ Quando acontecer; um “A cada
  quadro” em 🔁 Enquanto estiver rodando limpa a tela e usa “se a tela atual é X” para decidir
  o que desenhar. No perdeu/ganhou, restart() dentro de evento, laço ou função encerra a execução
  antiga e começa uma limpa; nunca coloque restart() em ⚙️ Ao iniciar.

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
- Enquanto a imagem carrega, o cenário permanece visível; se a carga falhar, o sprite cai num retângulo (placeholder) — nunca quebra.
- Prefira pequenas iterações didáticas — não despeje o jogo pronto.
- DESEMPENHO: crie sprites/grupos/objetos UMA vez em ⚙️ Ao iniciar. Criar dentro do
  loop enche a memória. Dentro do loop, use spawn/createSprite só de propósito
  (ex.: um tiro a cada N quadros) e SEMPRE remova da tela os objetos que já
  saíram, com pruneOffscreen, para o grupo não crescer sem fim e a colisão
  (overlapGroups) não ficar lenta.

KIT ESPAÇO (v0.7.0) — categoria "🚀 Kit espaço" com atalhos PRONTOS (não genéricos) para jogos de nave espacial; os blocos genéricos seguem nas categorias normais:
- createShip({ x, y, w, h, body, wings }): nave desenhada (cabine + foguinho que pulsa sozinho); body = cor do corpo, wings = cor das asas. É um sprite normal (drawSprite desenha a nave).
- spawnAsteroid(grupo, { x, y, size, color, vx, vy }): coloca no grupo um asteroide desenhado (polígono irregular que gira, cada um único). updateGroup/drawGroup tratam ele como qualquer sprite.
- drawStarfield(ctx, velocidade): fundo espacial (gradiente + estrelas que cintilam/rolam) — chame logo após clear().
- explodeSprite(sprite, "cor"): explosão de partículas no centro do sprite. playShoot()/playExplosion(): sons de tiro e explosão.

NAVE CLÁSSICA — girar + impulsionar na direção apontada (v0.10.0), para o Asteroids clássico (a nave gira e acelera pra onde aponta). Os sprites ganham um ÂNGULO em GRAUS (0 = pra cima, horário) que o desenho passa a respeitar (a nave/sprite aparece girada):
- steerThrust(sprite, velocidade, giro): controle pronto de nave — vira com ←/A e →/D, acelera com ↑/W na direção apontada e desliza com atrito ao soltar; já move o sprite. Bloco "Controlar o sprite como nave". É o atalho recomendado para a criança.
- rotateSprite(sprite, graus) / pointSprite(sprite, graus): girar o sprite um tanto / apontar direto para um ângulo. thrust(sprite, força): acelerar na direção apontada (soma à velocidade — combine com applyVelocity). applyFriction(sprite, fator): frear aos poucos (multiplica a velocidade por 0..1). spriteAngleDeg(sprite): valor — a direção atual em graus.
- shootFrom(sprite, grupo, { speed, color }): cria um tiro na PONTA do sprite, indo na direção que ele aponta (use no "quando apertar Espaço"). spawnAsteroidFromEdge(grupo, { size, color, speed }): solta um asteroide de uma borda aleatória rumo ao centro (use no "a cada X segundos"). Existe o exemplo pronto "Asteroides clássico" mostrando tudo junto.

PULO NO CHÃO (genérico, v0.9.0) — para jogos de corrida/pulo SEM andar para os lados:
- jumpOnGround(sprite, ctx, força): aplica gravidade, pousa na borda atraída (base com gravidade positiva, teto com gravidade negativa) e pula com ↑/Espaço/W OU um toque. Use dentro do gameLoop. Bloco "Fazer o sprite pular no chão". Diferente do platformer (que também anda esquerda/direita).

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
- playWhistle()/playExplosion(): assobio de banana caindo e explosão (sintetizados). O bloco temático “Tocar explosão” usa a mesma implementação de playExplosion. Existe o exemplo pronto "Guerra de Gorilas" mostrando tudo junto.
- computerTurn(thrower, city, enemy): vez do ROBÔ (IA). Use no gameLoop, na vez dele. Simula vários arremessos (mesma física da banana, sem ctx), escolhe o melhor mira no inimigo, "pensa" ~0,8s e joga sozinho. Respeita _banana (um tiro por vez). Para 1-jogador-vs-computador troque o ramo de um gorila por este bloco; para autoplay, os dois. Veja "Guerra de Gorilas vs Robô".
- drawAimReadout(ctx): desenha "angulo X / forca Y" no canto (lê _aim) — útil para ver a escolha do robô.

KIT EQUILIBRISTA v2 (v0.42.0) — categoria "🤸 Kit equilibrista", jogo estilo "Stick Hero". SEMÂNTICA: o EQUILIBRISTA é um SPRITE comum (participa de drawSprite, setShape/setImage, tamanho por soquete) e as REGRAS moram num objeto CAMINHO. A criança monta a regra do mouse com se/senão + pointerDown() e o PLACAR é uma variável dela (o kit não conta pontos). Canvas em pé (ex.: 360×480). Não combinar com a 🎥 câmera (o mundo desliza sozinho). Loop recomendado no "a cada quadro": clear → stickPathScenery → (se pointerDown() então stickPathGrow senão stickPathDrop) → stickPathWalk → stickPathDraw → drawSprite(heroi) → drawScore(var pontos) → se stickPathFell, trocar de cena.
- createStickHero({w, h, color}): cria o SPRITE do herói (skin de boneco desenhado; trocável por figura/imagem com os blocos genéricos de sprite). Faça UMA vez.
- createStickPath(ctx, {platform, stick}): cria o CAMINHO (plataformas, bastão, árvores) com as cores da criança. Faça UMA vez.
- stickPathScenery(caminho): fundo (céu/colinas/árvores) no tamanho lógico VIGENTE do palco. stickPathGrow(caminho, rapidez): o bastão cresce enquanto for chamado (esperando vira esticando na hora). stickPathDrop(caminho): derruba (só faz efeito se estava esticando). stickPathWalk(caminho, heroi, rapidez): gira o bastão até deitar, resolve o acerto (dispara os eventos, SEM pontuar), anda/atravessa/cai e posiciona o SPRITE em coordenadas de tela (sobrescreve x/y a cada quadro: blocos genéricos de movimento não mexem no herói durante o jogo). stickPathDraw(caminho): plataformas (com a marca do perfeito) e bastões.
- stickPathOnCross(caminho, fn, id) / stickPathOnPerfect(caminho, fn, id): eventos; a criança soma os pontos na variável dela (1 na travessia, 2 extras no perfeito, convenção do exemplo). Registrar UMA vez, fora do "a cada quadro".
- stickPathFell(caminho): valor (booleano) — caiu? Fim de jogo = trocar de cena; recomeçar = restart() GENÉRICO (o start recria sprite e caminho).

KIT BALÃO v2 (v0.42.0) — categoria "🎈 Kit balão", jogo estilo "Hot-Air-Balloon". SEMÂNTICA: o BALÃO é um SPRITE comum com combustível próprio (interno _fuel, começa em 100); as ÁRVORES moram no CAMINHO. Canvas deitado (ex.: 560×360). Loop recomendado: clear → balloonPathScenery → (se pointerDown() então balloonFire) → balloonFly → balloonPathScroll → drawSprite(balao) → drawScore(balloonPathMeters)/drawBar(balloonFuel) → se balloonLandedOut, trocar de cena.
- createBalloon({x, y, w, h, body, basket}): cria o SPRITE do balão (skin com envelope, cordas, cesto e a chama quando o fogo acende; trocável por figura/imagem genéricas). Faça UMA vez.
- createBalloonPath(ctx): cria o CAMINHO de árvores e a contagem de metros. Faça UMA vez.
- balloonFire(balao, forca): empurra para cima e queima combustível (mais alto, mais gasto; sem combustível não acende). balloonFly(balao): gravidade suave + pouso no chão (nunca afunda); é quem INTEGRA a posição — sem ele no loop, o fogo não move o balão. balloonPathScroll(caminho, balao, velocidade): avança o mundo com o balão no ar, conta os metros, recicla árvores e confere a batida com o RETÂNGULO do sprite (dispara o evento a cada novo toque; a criança decide o fim).
- balloonPathOnTreeHit(caminho, fn, id): evento da batida (explosão/tremida/som/trocar de cena). Registrar UMA vez, fora do "a cada quadro".
- balloonPathMeters(caminho): valor — metros voados. balloonFuel(balao): valor — combustível 0..100. balloonLandedOut(balao): valor (booleano) — pousou sem combustível? Recomeçar = restart() GENÉRICO.

ENTRADA DO MOUSE — pointerDown(): valor (booleano), verdadeiro enquanto o botão do mouse ou o dedo está pressionado no jogo (bloco "o mouse ou dedo está segurado ?" em 🎛️ Controles). É a peça do se/senão dos kits Equilibrista e Balão e serve para qualquer jogo de segurar/soltar.

CANVAS NA MÃO (genérico) — novos blocos de ✏️ Traçado úteis para crateras/máscaras: ctx.rect(x,y,w,h) adiciona um retângulo ao traçado; ctx.clip() recorta o desenho pelo traçado atual; ctx.isPointInPath(x,y)/ctx.isPointInStroke(x,y) são perguntas (o ponto está dentro/na linha do traçado?). Para "furar" um buraco: traçado com o retângulo da tela inteira + um arco no sentido anti-horário, depois clip. Há também os eventos "apertar o mouse/dedo"/"soltar o mouse/dedo" (pointerdown/pointerup) na programação normal, para mira por arrastar.
`)
