import { withGameTwoDLifecycleGuidance } from './pedagogy'

export const gameTwoDPromptContext = withGameTwoDLifecycleGuidance(`Extensão: Jogo 2D (id: game-2d)

CICLO DE VIDA:
- [[G2D_LIFECYCLE_MOLDS]]
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
- useFont(id): escolhe a letra de TODO texto do jogo (placar, telas, mensagens). Os cinco ids são baloo2, nunito, pressStart2P, bungee e fredoka. Vale para o jogo INTEIRO e a escolha é resolvida ANTES de o jogo rodar (só a fonte escolhida é embutida no documento), então o bloco vai em "Ao iniciar" e UM SÓ: com dois blocos vale o último, e o primeiro avisa no Console. (O bloco é start-only, então o Blockly nem deixa pô-lo dentro de um "se"; escrevendo no modo Código, um nome fora da lista é recusado pela Ponte.) Bloco "Usar a fonte". ⚠️ Não alcança o drawPixelText/drawPixelScore, que são letras desenhadas ponto a ponto.
- drawPixelScore(ctx, rótulo, valor, x, y, tamanho, cor): um CAMPO de placar na fonte de pixel — o rótulo em cima e o número embaixo, como no HUD dos jogos clássicos. É o irmão do drawPixelText que aceita VALOR (o drawPixelText só recebe texto literal, e placar é variável): sem ele o jogo fica com duas tipografias na mesma tela. Bloco "Escrever placar pixel".
- drawFade(ctx, porcento, cor): um véu por cima de tudo, para escurecer numa pausa ou fechar a fase apagando aos poucos. Vai no fim do quadro, depois de tudo o que foi desenhado. Bloco "Cobrir a tela com fade de N por cento na cor".
- showImageScreen(ctx, imagem): mostra uma TELA feita de um desenho do projeto (abertura, vitória, fim). Cobre o palco sem deformar, igual ao cenário, E ANUNCIA a tela para leitor de tela — é o que separa este bloco do "Desenhar o cenário", que pinta o mesmo e não fala. Vai no "a cada quadro", como as outras telas. Bloco "Mostrar a tela com a imagem".
- setBackdrop(nome): põe um DESENHO do projeto (o que a criança fez no Pinta) como cenário de fundo. COBRE o palco inteiro sem deformar, centralizado, cortando o excedente (escala = max(larguraTela/larguraImagem, alturaTela/alturaImagem)). Repintado automaticamente a cada clear(), então basta chamar UMA vez no começo. Bloco "Pôr o cenário atrás de tudo".
- drawBackdrop(ctx, nome): o mesmo desenho, mas AGORA, neste ponto do quadro — para quem quer mandar na ordem das camadas. Vai dentro do "a cada quadro", logo depois do clear(). Mesma geometria do setBackdrop. Bloco "Desenhar o cenário". Use um OU o outro, não os dois.
- setupStageFull(bg): "ocupar a tela toda" — SEM dimensões e SEM proporção fixa: o canvas preenche 100% da viewport e a resolução LÓGICA do jogo acompanha o tamanho real da tela (a área do jogo É a tela; muda com a janela; nítido via devicePixelRatio). Diferente do setupStage/fitScreen (que mantêm a proporção e deixam barras). Centralize por "a largura/altura da tela", não por número fixo. Bloco "Preparar o jogo para ocupar a tela toda".
- spawnBullet(grupo, { x, y, radius, color, vx, vy }): cria um TIRO (bolinha com brilho/glow) no grupo; x/y = centro. Bloco "Criar tiro no grupo".
- arrowsX(sprite, speed): move o sprite SÓ na horizontal com as setas (combine com clampToScreen). Bloco "Mover o sprite com as setas".
- blink(sprite, frames): faz o sprite PISCAR por N quadros (invencibilidade ao levar dano). Bloco "Fazer o sprite piscar".
- everyFrames agora aceita NÚMERO ou VARIÁVEL no intervalo (ex.: a cada [intervalo] quadros) — dá para acelerar o spawn por onda.
- spawnAsteroid varia o tamanho de cada asteroide sozinho; showScreen escurece de leve (o jogo aparece atrás) e quebra o subtítulo em linhas.
- isColliding(a, b): AABB.
- onStart(fn): adapter interno usado pelo gerador para reinício; NÃO gere essa
  chamada nem ofereça o bloco legado. Use as Áreas do projeto.
- gameLoop(fn): adiciona fn ao agendador do jogo, com passo fixo de 60 Hz. Vários loops coexistem.
- keys: estado das setas { left, right, up, down }.
- enableClassicControls('auto'|'always'|'off') liga ações semânticas e controles de toque
  acessíveis. Use uma vez em Ao iniciar. actionDown/actionPressed aceitam
  left/right/up/down/jump/action/select/start/pause. Backspace = select, Enter = start e Escape =
  pause; o botão pause NÃO altera o jogo sozinho.
- classicPlatformer(sprite, speed, jump) faz aceleração, corrida, derrapagem, agachamento,
  gravidade e pulo variável; depois chame collideWorld.
- setGravity(g): define somente a aceleração do mundo (padrão 0.6). Zero desliga e
  valores negativos puxam para cima; definir o valor sozinho não move nenhum sprite.
- applyGravity(sprite): soma a gravidade do mundo ao vy neste quadro. Use antes do
  movimento (Euler semi-implícito). applyVelocity(sprite) move por vx/vy sem gravidade.
- applyGravityToGroup(grupo): aplica a gravidade a cada sprite atual do grupo;
  updateGroup(grupo) somente move. Só sprites/grupos que recebem o apply respondem.
- bounceOnEdges(sprite, ctx): quica nas bordas do canvas.
- circleCollides(a, b): colisão por círculo.
- CAIXA AUTOMÁTICA (sem bloco): imagem vinda do Pinta traz junto a caixa medida no
  desenho (fração do quadro, união de todos os quadros) e o runtime a aplica ao pôr a
  imagem/animação/image: — o vazio do quadro deixa de encostar. Espelha ao virar
  (facing -1). NÃO existe bloco para ligar/desligar; setHitboxScale a substitui.
- setHitboxScale(sprite, percent): dial da colisão PERDOADORA — a área usada nas perguntas de
  encostar vira percent% do tamanho, centrada (menor = mais justo p/ DANO; maior = mais fácil
  de PEGAR). Vale p/ touches/onOverlap/overlapGroups/circleCollides; a física de EMPURRAR
  (collideGroup/collideSprite/collidePlatform/collidePlatformGroup/collideTileMap) usa o tamanho cheio de propósito. drawHitbox
  mostra a área efetiva. ⭐ VENCE a caixa automática vinda do desenho: 100% é a saída
  para voltar ao quadro inteiro. Bloco "Usar área de colisão de N% do tamanho".
- playSound(freq, ms): bip sintetizado (Web Audio).
- playFx("coin"|"jump"|"laser"|"explosion"|"hit"|"hurt"|"powerup"|"levelup"|"win"|"gameover"|"click"|"confirm"|"error"|"coin"|...): efeito sonoro PRONTO por nome (sintetizado, sem arquivo). Veja a lista completa no bloco "Tocar efeito".
- playNote("C"|"D"|"E"|"F"|"G"|"A"|"B"|"C5", ms): toca uma nota musical (dó ré mi…); junte várias para uma melodia.
- playMusic("adventure"|"happy"|"tense"|"calm"|"victory") / stopMusic(): música de fundo persistente em loop (só uma por vez). Gere em ⚙️ Ao iniciar, ⚡ Quando acontecer ou diretamente numa função, nunca dentro de 🔁 Enquanto estiver rodando. Repetir a mesma música não reinicia a faixa. Som só toca DEPOIS de um clique/tecla (exigência do navegador).
- ÁUDIO DE ARQUIVO (o som que a criança enviou em "Imagens e sons"), em oposição a tudo acima, que é sintetizado: loadSound("apelido", "nome-do-arquivo") prepara e SÓ vale em ⚙️ Ao iniciar; playClip("apelido") toca uma vez; stopClip("apelido") para e rebobina; playTrack("apelido") toca em loop (uma trilha por vez — começar outra troca a anterior, repetir a mesma não recomeça) e stopTrack() desliga QUALQUER música, inclusive a sintetizada do playMusic. setSoundVolume(0..10) vale para os sons de arquivo. NUNCA invente nome de arquivo: use um que exista no projeto, senão o runtime avisa e não toca. Um som pedido antes do primeiro clique ESPERA o clique em vez de falhar calado.
- onPointer((x, y) => {…}): callback a cada clique/toque; pointer = { x, y, down }.

Eventos "Quando…" e perguntas (booleanos) — o modelo Scratch/MakeCode:
- onKey('ArrowRight', fn): roda fn a cada vez que a tecla é apertada (keydown).
- onActionPressed('pause', fn): ação semântica vinda de teclado, toque, botão focado ou
  tecnologia assistiva. Continua recebendo pause enquanto o jogo está pausado; alterne
  pauseGame/resumeGame explicitamente no corpo.
- onAnyInput(fn): roda ao apertar qualquer tecla ou tocar na tela; registra o palco
  automaticamente e serve para começar/recomeçar com teclado ou toque. Bloco
  "Quando apertar qualquer tecla ou tocar na tela".
- onPointer((x, y) => {…}): clique/toque no palco, com coordenadas lógicas.
- onJump(() => sprite, fn): roda no instante em que platformer, jumpOnGround ou
  controlDino faz esse sprite pular. Registre uma vez em ⚡ Quando acontecer.
  Bloco "Quando o sprite pular".
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
- randomX(largura?)/randomY(altura?): posição x/y aleatória NA TELA. Passe a largura/altura do sprite para ele caber inteiro; sem argumento preserva 0..largura/altura. Evita Math.random()*largura na mão.
- pruneOld(grupo, segundos): tira do grupo quem viveu mais que o tempo (tiros somem sozinhos).
- setPosition(s, x, y): teleporta/respawna sem colidir com o caminho antigo. Nunca gere atribuições x/y pareadas para o bloco de posição.
- flipSprite(s, 'left'|'right'|'up'|'down') / setOpacity(s, percent) / setSize(s, w, h) / scaleSprite(s, fator): direção/transparência/tamanho.
- wrapEdges(s): dá a volta na tela (sai de um lado, reaparece no outro).
- pauseGame()/resumeGame()/isPaused(): pausa congela os loops e contatos; teclas/cliques continuam ativos para permitir retomar.

Mapa → Mundo → Fase — são conceitos separados; escolha somente os que o jogo precisa:
- createVectorTileset/defineVectorTile/createVectorTileMap montam tiles com Figuras, sem assets.
  forEachTileContact percorre colisões exatas; tileContactIs testa o índice original e
  setTileAtContact troca só aquela célula (blocos de prêmio devem testar antes de trocar).
  ⭐ O papel "contact" é a peça que se ATRAVESSA e que mesmo assim avisa: é assim que se faz
  moeda no cenário, lava, espinho de chão e água. Peça sólida barraria o caminho e decoração
  não avisaria nada. Ela chega pelo lado "inside" do forEachTileContact, e esse lado só existe
  no mapa VETORIAL (mapa de imagem e mapa do Pinta não têm esse papel).
- MAPA é a grade de tiles. Primeiro crie os dados; depois prepare a posição e o tamanho UMA vez em
  ⚙️ Ao iniciar com fitTileMapToStage(ctx, map) (encaixar na tela) OU
  placeTileMap(map, x, y, tileSize) (posição/tamanho exatos). Dentro do quadro, drawTileMap(ctx, map)
  apenas desenha o layout preparado e nunca o reposiciona. Não gere a forma legada ambígua de
  drawTileMap com x/y/tamanho: ela existe somente para abrir projetos antigos.
- Campanhas grandes podem usar loadVectorCampaignLevel(indice, receitaJson, tileSize, spawnX,
  spawnY, callback, tilesets, tiposDeInimigo?, jornada?): o runtime valida a receita, cria somente
  a fase escolhida e entrega mapa/mundo/fase ao callback. Cada fase pode trazer "enemies" e
  "journey2Enemies" como triplas [índice do tipo, x, y]. campaignValue('chave', fallback) lê um
  metadado numérico da fase ativa. Prefira esses blocos quando expandir tudo criaria centenas.
- MUNDO é a área física jogável: limites + tilemaps + grupos de figuras que são terreno + câmera.
  createWorld(w, h) cria um mundo vazio; createWorldFromTileMap(map, tileSize) prepara o mapa em
  (0,0), dimensiona o mundo por ele e o adiciona. addTileMapToWorld exige mapa já posicionado.
  addSolidGroupToWorld transforma figuras em chão/parede; addPlatformGroupToWorld transforma
  figuras em plataformas atravessáveis por baixo. O mesmo Mundo pode misturar os três terrenos.
  setWorldEdges(world, 'none'|'floor'|'solid') escolhe poços reais, somente chão na borda ou todas
  as bordas sólidas. configureWorldCamera configura cada eixo: horizontal 'off'|'free'|'right'|'left'
  e vertical 'off'|'free'|'down'|'up', mais zona morta X/Y. followCameraInWorld segue sem sair dos
  limites; em Mundo do tamanho da tela a câmera fica em 0. collideWorld resolve todo o terreno;
  drawWorld desenha mapa e figuras uma vez, usando a câmera. HUD vem DEPOIS para ficar fixo.
  addEnemyTypeToWorld(world, type) põe os inimigos daquele tipo NO terreno: sem ele o inimigo que
  anda no chão pousa na borda visível, que rola com a câmera, e vai e volta nos limites da TELA.
  Num Mundo maior que o palco, gere sempre este bloco junto dos inimigos terrestres. Quem voa não
  precisa dele. Pode ser chamado novamente ao trocar o Mundo ativo numa campanha.
- FASE é progressão OPCIONAL: um Mundo + posição inicial do jogador + evento de entrada.
  createLevel(world, x, y), enterLevel(level, player), restartLevel(level, player),
  resetGroupWithLevel(level, group), onLevelEnter(() => level, fn), levelIsActive(level).
  Entrar preserva tiles e grupos; reiniciar restaura os tiles e limpa os grupos registrados antes
  do evento recriá-los. Os dois zeram vx/vy, apoio e câmera e põem o jogador no início; vida e
  pontuação continuam. Dentro do
  quadro, collideCurrentLevel/followCurrentLevelCamera/drawCurrentLevel usam a fase atual. Fases
  também servem para nave, puzzle ou mapa do tamanho da tela; não significam plataforma nem câmera.
- ESCOLHA DIDÁTICA: uma tela fixa pode usar só Mapa; um jogo único rolável usa Mapa + Mundo sem
  Fase; use Fases somente quando houver etapas jogáveis distintas. CENAS são estados de interface
  ('inicio', 'jogando', 'ganhou', 'perdeu') e não são Fases. ONDAS são grupos/ritmos de inimigos
  dentro da mesma Fase ou do mesmo Mundo: conte a onda numa variável; só crie outra Fase quando
  também mudar a etapa jogável (mundo, início ou regras de entrada).
- cameraFollow(s, worldW, worldH) e setCamera(x, y) são compatibilidade para projetos antigos.
  Em projetos novos com terreno rolável, prefira a câmera do Mundo. cameraX()/cameraY() continuam
  úteis para parallax. ⚠️ onPointer/pointer usam coordenadas de TELA; mundo = tela + câmera.

Mapa destrutível, ordem de desenho e depuração:
- breakTileAtSprite(map, s)/setTileAtSprite(map, index, s)/tileAtSprite(map, s): muda/quebra/lê o tile na
  célula onde está o sprite (mineração, terreno destrutível, construir).
- bringToFront(grupo, s)/sendToBack(grupo, s): muda a ordem de desenho do sprite dentro do grupo.
- drawHitbox(s): contorno da área de colisão (depurar). showFps(x, y): contador de quadros por segundo.

Imagens e animação (v0.3.0) — as imagens vivem como ASSETS do projeto (aba Assets);
nos blocos/código você usa o NOME do asset (string):
- createSprite({ x, y, w, h, image: 'nome' }): sprite que mostra uma imagem (sem image, fica colorido).
- setImage(sprite, 'nome'): troca a imagem fixa do sprite (cancela a animação).
- loadSpriteSheet('nome', fw, fh): folha de sprites; fw/fh = tamanho de cada quadro em px.
- setAnimation(sprite, sheet, from, to, fps): anima o sprite entre os quadros [from..to]. REPETE para sempre.
- playAnimationOnce(sprite, sheet, from, to, fps): mesma coisa, mas toca UMA vez e CONGELA no último quadro (estrela cadente, golpe, baú). animationEnded(sprite) responde se já acabou (a que repete nunca acaba) — use num "se" dentro do quadro para sumir com o sprite ou trocar a imagem. ⚠️ Os dois blocos são idempotentes: chamar todo quadro com os MESMOS argumentos não reinicia a animação. E o "Animar sozinho" (autoAnimate) NÃO rouba uma animação de uma vez em andamento; quando ela acaba, ele volta a mandar.
- setStateAnimation(sprite, 'estado', sheet, from, to, fps): guarda a animação de UM estado do
  sprite ('parado'|'andando'|'vertical'|'pulando'|'caindo'|'dano'). Configuração: FORA do gameLoop.
- autoAnimate(sprite): DENTRO do gameLoop; troca a animação sozinho conforme o estado (dano >
  pulando/caindo > andando > vertical > parado) e vira o sprite (facing) pelo sinal do vx.
  Estado sem animação cai no parente (caindo->pulando->andando->parado). Perder vida
  (changeHealth negativo) ou piscar (blink) conta como 'dano'. Pulando/caindo exigem chão
  (platformer/jumpOnGround e as colisões de chão marcam sprite.onGround).
- drawFrame(ctx, sheet, index, x, y, w, h): desenha um quadro específico (manual).

Figuras: sprite desenhado por código (v0.23.0) — o visual do sprite feito com formas, sem imagem:
- defineShape('nome', function (ctx) {...}): registra um desenho nomeado. O corpo desenha em
  coords LOCAIS (0,0 = canto do sprite); pode usar os paint_* OU os blocos de Canvas (ctx é o
  parâmetro). Configuração: FORA do gameLoop.
- createShapeSprite('figura', { x, y, w, h }): cria um sprite que usa a figura (anda/gira/vira/
  colide como qualquer sprite). setShape(sprite, 'figura'): troca a figura de um sprite.
- paintRect/paintCircle/paintEllipse/paintTriangle/paintLine(ctx, ...coords..., 'cor'): formas
  simples dentro da figura (recebem o ctx da figura).
- paintShapeRecipe(ctx, receitaJson): forma compacta para pixel art grande; aceita uma lista JSON
  de ['r', x, y, largura, altura, cor] e ['c', x, y, raio, cor], limitada e validada pelo runtime.
- shapeW()/shapeH(): tamanho do sprite que está sendo desenhado (para centralizar).
- Gotcha: a figura desenha em coords locais e ganha giro/flip/piscar do sprite de graça.

Tipos de inimigo (v0.22.0) — classes com comportamento pronto; o TIPO é um grupo estendido
({ items, bullets: {items}, config }), então os helpers de grupo funcionam nele:
- createEnemyType({ behavior, color, image, hp, speed, dmg, w, h }): behavior em
  'patrulha'|'perseguidor'|'voador'|'voador-vertical'|'saltador'|'atirador'|'parado'|
  'medroso'|'arrancada'|'rondador'|'mergulhador'|'teleporte'|'zigue-zague'|
  'atirador-alinhado'|'atirador-lado'|'atirador-esperto'|'atirador-leque'|'bombardeiro'|'raio'|
  'espinho'|'renascer'|'chefao'|'perseguidor-lado'|'perseguidor-vertical'.
  Quem anda no chão não cai num top-down; para cair em plataforma, gere setGravity
  em Ao iniciar e applyGravityToGroup(tipo) antes de updateEnemyType no gameLoop.
  Quem voa ('voador', 'voador-vertical', 'rondador', 'mergulhador', 'teleporte',
  'zigue-zague') nunca cai nem resolve chão.
  ⚠️ O perseguidor tem TRÊS modos, e a diferença é o eixo que ele dirige:
  'perseguidor' pega os DOIS (então não pousa: sobe pelo ar atrás do alvo),
  'perseguidor-lado' só o X (fica na altura em que nasceu) e
  'perseguidor-vertical' só o Y (não sai da coluna). Para um perseguidor completo
  que respeite o chão, some 'saltador' (que toma o eixo Y).
- createSmartEnemyType({ smart, color, image, hp, speed, dmg, w, h }): o ATALHO dos jogos de
  nave. smart em 'burra'|'basica'|'avancada'|'ultra'|'rei'; cada um semeia um pacote:
  burra=patrulha+bombardeiro (fica em cima e atira reto sem olhar), basica=patrulha+
  atirador-alinhado (só atira quando o alvo passa bem embaixo ou bem em cima),
  avancada=perseguidor-lado+atirador, ultra=perseguidor-lado+atirador-esperto (mira onde o
  alvo VAI estar; as duas ficam na altura em que nasceram e seguem só pelos lados),
  rei=perseguidor+atirador-esperto+raio+chefao (o chefao persegue por todo lado). ⚠️ ultra e rei também já sobem o
  'tiro' para 8: a mira adiantada só existe quando o tiro é mais rápido que o alvo, e a nave
  anda a 6 por padrão. Sem isso a ultra ficaria idêntica à avançada na tela.
  O addEnemyTypeBehavior continua somando por cima (é assim que um burro ganha raio).
- onEnemyHurt(tipo, function (chefe) {...}): DENTRO de Quando acontecer, registrar UMA vez. Roda
  quando o inimigo PERDE vida e continua vivo (quem morre vai pelo onEnemyDefeated). É o gancho de
  MUDANÇA DE FORMA do chefão: leia getHealth/getMaxHealth ali e deixe-o furioso na metade.
- overlapEnemyBeams(() => sprite, tipo, function (dono) {...}): DENTRO do gameLoop; roda enquanto o
  RAIO ligado encosta no sprite. Não remove nada (o feixe continua). Use hurtByEnemy(sprite, dono)
  dentro: os 45 quadros de invencibilidade dele é que dão o ritmo do dano.
- addEnemyTypeBehavior(tipo, 'comportamento'): SOMA mais um comportamento (é o jeito de ter
  patrulha + atirador ao mesmo tempo). Pode rodar no meio do jogo (ondas). Regra de combinação:
  por EIXO de movimento (horizontal e vertical) vale o ÚLTIMO comportamento somado que dirige
  aquele eixo; as AÇÕES (atirar, bombardear) rodam TODAS. Somar de novo o que já está na lista
  o move para o fim, então ele passa a mandar. Nome fora da lista é recusado com aviso.
  ⚠️ 'atirador-alinhado' confere a COLUNA (atira para cima ou para baixo) e 'atirador-lado' confere
  a ALTURA (atira reto para o lado): são espelhos, e juntos cobrem uma cruz.
  Combos que valem a pena sugerir: parado+atirador-lado (TORRE de plataforma),
  patrulha+atirador (guarda), voador+bombardeiro (morcego),
  perseguidor+saltador (persegue pulando), parado+espinho (armadilha), chefao+perseguidor.
- createAllEnemiesGroup(): devolve um grupo com os inimigos de TODOS os tipos, sempre atualizado
  (é uma VISTA montada dos tipos, não uma cópia: quem nasce entra, quem morre sai no mesmo quadro).
  Emita em 🧩 Meus moldes, junto dos tipos (a ordem em relacao aos createEnemyType nao importa: e
  derivada). Serve para a ação que vale para todos com UM bloco:
  overlapGroups/overlapSpriteGroup/forEachInGroup/countGroup/drawGroup/drawGroupByY/collideGroup.
  clearGroup nela esvazia todos os tipos, removeFromGroup tira do tipo que contém, pruneOffscreen
  poda cada tipo. ⚠️ NÃO emita updateGroup, applyGravityToGroup, addToGroup, bringToFront nem
  sendToBack nela (o runtime avisa e não faz nada): mover/dar gravidade é do "Atualizar os inimigos
  do tipo", senão andariam duas vezes por quadro.
- spawnEnemy(tipo, x, y): solta um inimigo com a vida/dano/animações do tipo.
- updateEnemyType(tipo, ctx, alvo): DENTRO do gameLoop; comportamento + autoAnimate + tiros do
  atirador + remove derrotados (hp<=0 -> particulas + onDefeat). Alvo = quem perseguir/mirar.
- drawEnemyType(ctx, tipo): desenha inimigos + tiros.
- onEnemyDefeated(tipo, function (inimigo) {...}): registrar UMA vez, fora do gameLoop.
- overlapEnemyShots(() => sprite, tipo, function (tiro) {...}): DENTRO do gameLoop; remove o
  tiro ao acertar.
- hurtByEnemy(sprite, inimigoOuTiro): usa damageSprite com enemyDamage() e 45 quadros; piscando =
  invencivel (nao drena no contato continuo).
  ⭐ O tipo guarda UM dano, que vale para o corpo e para os tiros dele. Para cada ATAQUE doer um
  tanto diferente (o raio mais que o encostão, por exemplo), emita damageSprite(sprite, n, quadros)
  DENTRO do varredor daquele ataque, em vez do hurtByEnemy: overlapSpriteGroup(() => nave, tipo, …)
  para o encostão, overlapEnemyShots para o tiro, overlapEnemyBeams para o raio.
  ⚠️ No raio os quadros de invencibilidade são OBRIGATÓRIOS (o callback roda a cada quadro enquanto
  o feixe está ligado, uns 180): changeHealth ali esvazia a vida de uma vez.
- enemyDamage(inimigoOuTiro): o dano de contato (default 1).
- stompEnemyType(sprite, tipo, quique): DENTRO do gameLoop; aplica o modo de pisada ao inimigo
  em que o sprite PISAR (só caindo nele; encostar de lado não vale) e quica o sprite.
  setEnemyStompMode escolhe derrotar, causar 1 de dano (chefes), achatar, virar casco ou recusar
  a pisada por espinhos.
  ⭐ No modo casco o gesto é o do gênero: PISAR recolhe o bicho num casco PARADO (inofensivo) e
  ENCOSTAR nele o CHUTA. O casco andando machuca quem tocar — menos quem acabou de chutá-lo,
  enquanto os dois ainda estiverem encostados — e atinge inimigos de todos os tipos registrados.
- updateEnemyShells(tipo, mundo): OBRIGATÓRIO junto do modo casco, dentro do gameLoop. É o único
  dono da física do casco (o updateEnemyType pula qualquer casco vivo): faz andar, rebater nas
  paredes do Mundo e varrer inimigos. Sem ele o casco fica parado para sempre. A queda vem do
  "Aplicar a gravidade ao grupo" no tipo, como em todo inimigo. Bloco "Atualizar os cascos do
  tipo ... no Mundo ...".
- setEnemyStateAnimation(tipo, 'estado', sheet, from, to, fps): animação por estado do TIPO.
- setEnemyTypeParam(tipo, 'pulo'|'ritmo'|'alcance'|'cadencia'|'tiro'|'voltar'|'vida'|'duracao', valor): sintonia
  fina. pulo/ritmo = saltador; alcance = quem voa + medroso/arrancada/rondador/mergulhador/
  teleporte/zigue-zague (distância que faz reagir); cadencia/tiro = quem atira; voltar =
  renascer (quadros até renascer, default 180); vida = a vida dos PRÓXIMOS que nascerem;
  duracao = quantos quadros o raio fica ligado (default 180). O raio recarrega por 'cadencia',
  avisa 60 quadros e só então liga.
- Patrulha em mapa de tiles: collideTileMap zera o vx na parede -> o inimigo vira sozinho
  (use forEachInGroup(tipo, ...) + collideTileMap dentro do gameLoop).
- loadImage('nome'): handle { img, loaded } (aceita nome do asset OU url/dataUrl direta).

Movimento e efeitos (v0.4.0) — sempre DENTRO do gameLoop:
- platformer(sprite, ctx, speed, jump): helper LEGADO para jogo de uma tela; a borda atraída da TELA
  é sempre chão. Não use em plataforma com poços, mapa rolável ou figuras como chão.
- platformerWithTerrain(sprite, speed, jump): controle de plataforma sem inventar chão na tela.
  Gere, nesta ordem: applyGravity(sprite), platformerWithTerrain(sprite, speed, jump), depois
  collideWorld(sprite, world) OU collideCurrentLevel(sprite). O apoio pode vir de tile sólido,
  tile-plataforma, grupo sólido, grupo-plataforma ou borda escolhida no Mundo. Pular usa a borda
  da tecla: segurar ↑/W/Espaço não repete o pulo ao pousar.
- jumpWithTerrain(sprite, jump): versão sem andar para os lados, com o mesmo terreno do Mundo.
  Também exige applyGravity antes e colisão do Mundo/Fase depois.
- topDown(sprite, speed): 4 direções com diagonal normalizada.
- flyFree(sprite, speed): voar livre SEM gravidade, com INÉRCIA pesada (0.10 de aceleração, 0.96 de planeio): engata em ~0,17s, desliza ~72px por ~2,3s; ao inverter, cruza o zero e muda de direção em ~0,18s, chegando ao teto oposto em ~0,33s. É a inércia que o separa do topDown; speed é o TETO.
- flap(sprite, ctx, force): bater as asas. Empurrão na BORDA de seta pra cima/W/Espaço/toque, inclusive no ar (segurar não sobe sempre); não soma gravidade. Gere applyGravity(sprite) antes para o sprite voltar a cair.
- swim(sprite, speed): nadar em 8 direções com arrasto forte; não soma gravidade. Sem applyGravity o sprite boia; gere applyGravity(sprite) antes para afundar solto.
- followPointer(sprite, speed): anda em direção ao ponteiro.
- clampToScreen(sprite, ctx): prende o sprite dentro do canvas.
- flash(ctx, 'cor'): pinta a tela com cor translúcida (efeito de flash num frame).
- shake(ctx, intensidade): treme o canvas e PARA SOZINHO (chame uma vez, ex.: colisão).
- emitParticles(x, y, count, 'cor'): explosão de partículas; drawParticles(ctx) move+desenha a cada frame.

Tiles e tilemaps (v0.5.0) — cenários a partir de um tileset (asset com vários quadros lado a lado):
- createTileMapFromAsset('meu-mapa'): mapa PRONTO de um desenho de MAPA (Pinta/fatiador — asset
  com metadado de mapa: grade/peças/sólidos embutidos). Sem metadado -> mapa vazio + aviso.
- createTileMap({ image: 'tileset', tile: 32, solid: '1', platform: '2', grid: '1 1 1;1 0 1;1 2 1' }): cria o mapa.
  grid = texto da grade (cada número = um quadro do tileset; ';' separa linhas, espaço separa colunas, '.' = vazio);
  solid = índices que barram o sprite; platform = índices que apoiam só na face atraída pela gravidade.
- fitTileMapToStage(ctx, map): prepara UMA vez o mapa para caber inteiro na tela, centralizado.
- placeTileMap(map, x, y, size): prepara UMA vez posição no Mundo e tamanho exato de cada tile.
- drawTileMap(ctx, map): desenha o mapa já preparado, sem alterar posição ou escala. Para rolagem,
  adicione-o ao Mundo e use drawWorld/drawCurrentLevel; a câmera faz o deslocamento.
- collideTileMap(sprite, map): sólidos viram chão/parede; plataformas seguram numa face e deixam atravessar pela outra.
- collideGroup(sprite, group): impede o sprite de atravessar os sprites de um grupo (obstáculos SEM
  tilemap: pedras/casas/paredes desenhadas à mão, inclusive por figura). Mesma física do collideTileMap
  (empurra pra fora + desliza). Use no gameLoop, depois de mover o sprite.
- collideSprite(sprite, other): a mesma colisão sólida, mas contra UM sprite só (chão/parede),
  sem precisar montar um grupo. Bloco "Impedir de atravessar o sprite".
- collidePlatform(sprite, platform): faz UMA figura apoiar o sprite só na face atraída pela gravidade;
  atravessa pela face oposta e pelas laterais. Bloco "Fazer o sprite pousar na plataforma".
- collidePlatformGroup(sprite, group): a mesma plataforma unidirecional para todas as figuras do grupo.
  Bloco "Fazer o sprite pousar nas plataformas do grupo".
- Figura-chão móvel: mova as plataformas, depois o jogador, resolva as colisões e só então desenhe.
  A base transporta em X/Y e soma seu deslocamento ao controle do jogador; pular, sair ou remover solta.
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
- applyGravityToGroup(grupo): soma a gravidade ao vy de cada sprite atual. Use antes de
  updateGroup somente nos grupos que devem cair; tiros ficam retos usando apenas updateGroup.
- forEachInGroup(grupo, function (sprite) {…}): roda o corpo para cada sprite (ordem reversa, pode remover no corpo).
- countGroup(grupo): quantidade atual (valor, use em if/conta). clearGroup(grupo): esvazia. addToGroup(grupo, sprite): põe um sprite que JÁ existe no grupo (repetido não entra duas vezes). removeFromGroup(grupo, sprite): tira um.
- pruneOffscreen(ctx, grupo, margem, function (sprite) {…}): remove os que saíram da tela e roda o corpo para cada um (ex.: perder vida quando um inimigo escapa). Só descarta quem está fora E SE AFASTANDO: um obstáculo criado fora da tela que ainda vem entrando (o caso normal de "nasce à direita e anda para a esquerda") NÃO é removido, então pode criar o obstáculo bem longe da borda sem medo. Sprite parado fora da tela é removido.
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
- setScene("jogando") / sceneIs("jogando") (booleano, use no if) / showScreen(ctx, titulo, subtitulo, dica, fundo) / showGameOver(ctx, pontos) (a tela de fim pronta, com o placar) / restart(). O titulo/subtitulo/dica aceitam texto fixo OU expressão (variável, "juntar texto", resultado de função) — ex.: "Destrua " + alvo + " asteroides" mostra a meta vinda de uma variável.
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
- jumpOnGround(sprite, ctx, força): pousa na borda atraída (base com gravidade positiva, teto com gravidade negativa) e pula com ↑/Espaço/W OU um toque; não soma gravidade. Gere applyGravity(sprite) imediatamente antes. Use dentro do gameLoop. Bloco "Fazer o sprite pular no chão". Diferente do platformer (que também anda esquerda/direita).

KIT DINO (v0.9.0) — categoria "🦕 Kit dino" com atalhos PRONTOS (não genéricos) para um jogo de corrida estilo "Dino Run"; os blocos genéricos seguem nas categorias normais:
- createDino({ x, y, size, color }): dinossauro desenhado (perninhas que correm sozinhas; a pose muda no pulo/agachar). É um sprite normal (drawSprite desenha o dino).
- controlDino(dino, ctx, força): controla o dino estilo corrida — pula com ↑/Espaço ou toque na metade de CIMA; abaixa com ↓ ou segurando o dedo embaixo. Já vem com chão e poeira, mas não soma gravidade: gere applyGravity(dino) imediatamente antes. Use no gameLoop.
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
