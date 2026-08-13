export const gameThreeDPromptContext = `Extensão: Jogo 3D (id: game-3d)

API global injetada como window.SZGame3D (wrapper sobre Three.js):
- createFullscreenScene(background) -> world: caminho recomendado; cria canvas responsivo em tela cheia.
- createScene(canvasId) -> world { scene, camera, renderer }: cria cena+câmera+luz (com sombras).
- setBackground(world, color) / setCameraPosition(world, x, y, z).
- createBox(world, { size, color }) -> mesh ; createSphere(world, { radius, color }) -> mesh.
- createBlock(world, { width, height, depth, color }) -> mesh (caixa retangular; ótima p/ o chão).
- setPosition(obj, x, y, z) / setRotation(obj, x, y, z) (radianos) / setScale(obj, fator).
- animate(world, fn): registra uma atualização. Várias atualizações da mesma cena rodam em ordem e produzem um único desenho por quadro. Se uma falhar, somente ela é pausada e as demais continuam.

Física (chamar DENTRO do animate):
- setVelocity(obj, x, y, z): define a velocidade base em cada eixo; o runtime ajusta pelo tempo do quadro.
- controlWithKeys(obj, speed): anda no plano X/Z com WASD ou setas.
- applyGravity(obj, ground): puxa p/ baixo e para/quica no chão (andando pela velocidade).
- jump(obj, force): impulso p/ cima (só funciona se estiver no chão).
- cameraFollow(world, obj): a câmera acompanha o objeto mantendo o enquadramento.

Perguntas (booleanos p/ usar em "se"):
- keyDown(code): tecla apertada (codes: "KeyW","KeyA","KeyS","KeyD","Space","ArrowUp"...).
- collides(a, b): os dois objetos estão se encostando (AABB).
- hitAny(obj, group): obj encostou em algum do grupo.

Tempo & repetição (genéricos, IRMÃOS do "A cada quadro 3D" como no Jogo 2D):
- everyFramesLoop(N) e everySecondsLoop(S): são os blocos "A cada N quadros / segundos", raízes IRMÃS
  do "A cada quadro 3D" (ficam LADO A LADO em "Enquanto estiver rodando", NÃO dentro dele). Rodam o
  corpo a cada N quadros / S segundos na cena atual. É o jeito de soltar inimigos sem encher a tela.

Grupos (lista de objetos; a criança MONTA a lógica soltar -> mover -> tirar da tela -> colidir):
- createGroup() -> []: lista p/ guardar vários objetos (ex.: inimigos).
- updateGroup(group, ground): move cada objeto pela velocidade + gravidade (quica no chão).
  updateGroupNoGravity(group): só velocidade (p/ coisas voando). Chamar no animate.
- pruneOffscreen(world, group, (item) => {...}): tira do grupo quem saiu da tela e roda o corpo p/
  cada um que saiu (higiene de GPU). Chamar no animate.
- forEachInGroup(group, (item) => {...}): repete o corpo p/ cada objeto (o da vez é "item"); itera ao
  contrário, pode remover dentro. countGroup(group): quantos objetos tem.
- removeFromGroup(group, obj): tira 1 objeto do grupo e some da cena. clearGroup(group): esvazia o grupo.

Kit "Desvie" (a mecânica difícil pronta):
- spawnEnemy(world, group, speed): solta 1 inimigo (cubo vermelho) vindo de longe (z=-20) na
  velocidade escolhida. Ponha dentro de everyFrames p/ soltar de tempos em tempos (sem avalanche).
- stop(world): para o loop (fim de jogo). Use durante animate, evento ou função da partida, nunca solto em Ao iniciar.

Genéricos de grade/isométrico (chão X-Z, y = altura, 1 tile = 1 unidade):
- isometricCamera(world, followObj | null): troca p/ câmera ortográfica isométrica; segue o objeto. Configure uma vez em Ao iniciar; chamadas repetidas reutilizam a câmera.
- gridPosition(obj, row, col): coloca o objeto numa casa da grade.
- gridStep(obj): a cada quadro, anda uma casa por vez (setas) com um saltinho.
- gridMove(obj, "forward"|"backward"|"left"|"right"): enfileira um passo (p/ botões).
- moveAcross(group, speed, min, max): move os objetos do grupo no eixo x, dando a volta (esteira).
- touchesBox(obj, group): colisão por caixa real (Box3) — funciona com modelos compostos.

Kit "Travessia" (atravessar a rua / Crossy Road):
- createCrossingScene(canvasId) -> world: cena + câmera isométrica + luz (mundo de grade).
- createCrosser(world, { color }) -> player: personagem que pula de casa em casa (câmera segue) e participa de pickAtMouse/pointerOver.
- addRow(world, rowIndex, "grass"|"forest"|"car"|"truck", "right"|"left", speed): cria uma linha.
- generateRows(world, count): gera várias linhas aleatórias à frente.
- crosserStep(player, world): a cada quadro — setas em grade + estende/limpa o mapa + segue câmera.
- moveTraffic(world): move os veículos (dão a volta). crosserMove(player, dir): passo p/ botões.
- crosserHit(player, world): bateu num veículo? crosserRow(player): pontuação (linha).
- crosserReset(player, world): recomeça. Depois de crosserHit, personagem e trânsito ficam congelados até o reset.

Genéricos top-down/circular (chão X-Z, y = altura — p/ jogos de pista/relógio/órbita):
- topCamera(world, followObj | null): câmera ortográfica aérea (de cima); segue o objeto se dado. Configure uma vez em Ao iniciar; o resize atualiza o enquadramento.
- moveInCircle(obj, raio, velocidade): gira o objeto numa circunferência (centro na origem), virado p/ frente.
- distanceTo(a, b): distância entre dois objetos. isNear(a, b, dist): estão a menos de "dist"?

Kit "Corrida" (correr numa pista top-down):
- createRaceScene(canvasId) -> world: cena + câmera aérea + luz.
- createRaceTrack(world): pista oval (grama + asfalto + árvores).
- createRaceCar(world, { color }) -> car: carro do jogador na largada, disponível em pickAtMouse/pointerOver.
- raceStep(car, world): a cada quadro — dá voltas (↑ acelera, ↓ freia) e conta voltas.
- runRivals(world): solta/move carros rivais pela pista. raceControl(car, "accelerate"|"decelerate"|"normal"): p/ botões.
- raceHit(car, world): bateu num rival? raceLaps(car): voltas (pontuação). Depois da batida, carro e rivais ficam congelados. raceReset(car, world): recomeça.

Genéricos de movimento/física (SEM lib de física — feita na mão; p/ queda/plataforma/giro):
- fall(obj): a cada quadro, solta o objeto em queda livre girando (gravidade) e o remove ao sumir. Depois da remoção, novas chamadas não descartam seus recursos outra vez.
- slideBetween(obj, "x"|"y"|"z", min, max, speed): vaivém num eixo (plataformas que andam).
- spin(obj, "x"|"y"|"z", speed): rotação contínua (moedas, hélices, planetas).
- getPos(obj, "x"|"y"|"z") / getRot(obj, "x"|"y"|"z") / getScale(obj): LER posição/giro/tamanho (valores) — base p/ lógica própria (mira, IA, movimento custom).
- getVel(obj, "x"|"y"|"z") / getSpeed(obj) / isMoving(obj): LER a velocidade por eixo, a total (magnitude) e se o objeto está se movendo (true/false) — a velocidade é a que setVelocity grava.
- moveBy(obj, dx, dy, dz): mover relativo (soma à posição). rotateBy(obj, "y", radianos): girar relativo.
- moveTowards(obj, x, y, z, força): aproxima aos poucos (lerp; força 0 a 1). dt(world): segundos do quadro —
  use dt apenas na matemática manual; os blocos de movimento e física já compensam FPS automaticamente.
- lookAtObject(a, b) / lookAtPoint(obj, x, y, z): virar A para olhar B / um ponto (mira robusta).
- moveForward(obj, dist): andar p/ frente (na direção que olha; sob fpsCamera no MESMO obj, anda p/ onde o
  jogador olha, no plano do chão — olhar p/ cima não faz voar). faceVelocity(obj): virar p/ a direção do movimento.
- angleTo(a, b): ângulo (radianos) de A para B no plano do chão (X-Z) — p/ mirar/girar.

Mira & clique (raycast — valores p/ "se"/variável; combine com o evento CORE "clicar em qualquer lugar"):
- pickAtMouse(world): o objeto 3D sob o ponteiro (ou null) — guarde numa variável p/ usar pelo nome; essa variável passa a aparecer nos seletores de objeto do jogo. Cópias visíveis de enxame também podem ser selecionadas.
- pointerOver(world, obj): o mouse está sobre aquele objeto? (bool). aimAhead(world, obj, dist): o objeto à
  frente, na direção que "obj" olha (tiro/mira; null se nada). Sob fpsCamera no MESMO obj, o raio sai do olho
  na direção da câmera (com o pitch — mira o que o jogador VÊ); nos demais, +Z do objeto.
- onGround(world, obj): tem chão logo abaixo? (bool — sensor de plataforma). groundHeight(world, obj): a
  altura (y) do topo do que está abaixo. Mira e chão ignoram as próprias peças de um modelo composto.

Física genérica (SEM lib; gravidade + colisão AABB de empurrar-para-fora):
- body(obj, gravity): liga a física (gravidade, número negativo). setSolid(obj): marca como parede/chão.
- stepBody(obj, world): a cada quadro, aplica gravidade + empurra para fora dos sólidos (chamar no animate).
- platformerControls(obj, world, speed, jump): preset plataforma (WASD/setas + espaço, gravidade+colisão).
- fpsControls(obj, world, speed): preset 1ª pessoa (WASD na direção que o corpo olha — combine c/ fpsCamera).
- resolveCollision(a, b): empurra A para fora de B (colisão manual de 2 objetos).

Plataforma clássica de lado (jogo de correr e pular, tipo os antigos de console):
- classicPlatformer(obj, world, speed, jump): anda SÓ no eixo X, com aceleração e derrapagem;
  Shift corre no dobro da velocidade; o pulo fica mais alto quanto mais tempo o botão fica
  apertado, e não repica sozinho com o botão preso. Chame dentro do animate. É diferente do
  platformerControls, que anda em X e Z com velocidade fixa e pulo de altura fixa.
- keyPressed("Space"): verdadeiro só no quadro em que a tecla desceu (keyDown é enquanto segura).
- forEachHit(obj, lado, (batida) => {...}): percorre as batidas do último stepBody. Lados:
  "qualquer", "pes" (pousou em cima de algo), "cabeca" (bateu por baixo), "esquerda", "direita",
  "frente", "tras". É assim que se faz pisar num inimigo, dar cabeçada num bloco e fazer o
  inimigo virar ao esbarrar na parede — cada um é um lado diferente do mesmo choque.
- hitIs(batida, obj): a batida foi contra este objeto?
- carryRiders(obj): quem está em pé nele anda junto (elevador, plataforma móvel).
- passUnder(obj): dá para atravessar de baixo para cima, mas dá para pousar em cima.
- setObjectValue(obj, "chave", valor) / objectValue(obj, "chave"): gaveta por objeto
  (direção que o inimigo anda, tempo de espera, quantas vidas tem).

Kit Plataforma pronto (fase lateral completa, usado pelo exemplo Reino Cogumelo):
- createPlatformScene(canvasId) -> world: prepara céu, luz e câmera lateral; o canvas precisa existir no HTML.
- createHero(world, color) -> hero: cria o personagem com corpo e colisão. Crie cena e herói em Ao iniciar.
- setStageTheme(world, "dia"|"noite"|"subterraneo"|"agua"|"castelo"): troca céu, neblina e cores da fase já montada. Se vier antes de loadStage, vale quando o mapa não tiver tema próprio.
- loadStage(world, mapa): monta a fase. O mapa é texto com assuntos separados por ponto e vírgula ou linha; exemplos: chao=0-20, tijolo=6:4, surpresa=8:4:cogumelo, inimigo=12:goomba, checkpoint=15, tempo=300, tema=noite.
- stageStep(world, hero) e sideCamera(world, hero): chame dentro de animate. classicPlatformer cuida do movimento do herói; keyPressed("KeyF") + shootFire(world, hero) dispara uma vez por toque quando ele tem a flor.
- onStageEvent(world, nome, fn): reage a pegar-moeda, pegar-cogumelo, pegar-flor, pegar-estrela, ganhar-vida, quebrar-tijolo, pisar-inimigo, chutar-concha, levar-dano, tocar-a-bandeira, derrotar-o-chefe e acabar-o-tempo.
- stageValue(world, "pontos"|"moedas"|"vidas"|"tempo"|"mundo"|"fase") lê o placar. setStageNumber(world, mundo, fase) define a identificação mostrada.
- heroIs(hero, "pequeno"|"grande"|"de fogo"|"invencivel"|"no chao") e stageIs(world, "acabou"|"venceu"|"perdeu"|"sem vidas") são perguntas para usar em se.
- stageReset(world) reinicia a fase e respeita apenas o checkpoint alcançado nela; clearStage(world) remove o cenário atual.

Câmeras vivas (manuais, sem addon):
- fpsCamera(world, obj): câmera em perspectiva nos olhos do objeto + olhar com o mouse (pointer-lock; clique trava), mesmo se a cena estava usando câmera ortográfica. Combine c/ fpsControls.
- orbitCamera(world, target): gira ao redor do alvo arrastando o mouse (roda = zoom).
- thirdPersonCamera(world, obj, dist, height): câmera atrás/acima do objeto (atualizada a cada quadro pelo animate).
- cameraLookAt(world, obj): aponta a câmera p/ um objeto. setFOV(world, graus): "zoom" (menos graus = mais zoom).
- Só existe um modo de câmera ativo por cena. O último escolhido substitui o anterior, solta a câmera do vínculo do modo FPS quando necessário, e repetir fpsCamera não zera a rotação.
- Recursos passados juntos precisam pertencer à mesma cena. O runtime ignora combinações incompatíveis e avisa no console.
- Transformações genéricas aceitam objetos Three.js crus. Comandos que recebem um world usam objetos criados ou selecionados dentro do Jogo 3D.

Formas, materiais e texturas (Fase 6 — montar qualquer visual; criar UMA vez, fora do animate):
- createCylinder(world, { radius, height, color }) / createCone(...) / createTorus(world, { radius, tube, color }):
  novas formas (entram no limite de 300 e na colisão por caixa, como createBox).
- createPlane(world, { width, depth, color }): um plano fino deitado no chão (ótimo p/ o piso).
- setColor(obj, "#cor") / setOpacity(obj, 0..1) / setMaterial(obj, "normal"|"metal"|"glass"|"glow"|"wireframe"):
  mudam a aparência da superfície.
- setTexture(obj, "nomeDoAsset"): veste o objeto com uma imagem embutida (asset adicionado ao projeto).
- paintPattern(obj, estampa, "#corA", "#corB"): desenha a textura NA HORA, sem imagem nenhuma
  ("tijolo", "pedra", "terra", "grama", "interrogacao", "cano", "nuvem", "agua", "lava",
  "moeda", "xadrez", "listras"), repetindo conforme o tamanho do objeto. É o caminho para um
  jogo inteiro sem depender de arquivo de imagem.
- noShadow(obj): tira do passe de sombra (continua recebendo). Deixa cenário grande mais leve.
- setVisible(obj, "show"|"hide"): mostra/esconde e também retira o objeto das consultas de mira enquanto estiver oculto. remove(world, obj): tira da cena e dos registros de física e seleção.
- createModel(world) -> grupo vazio; addToModel(model, peca): junta peças da mesma cena num modelo (mover o modelo move tudo junto).

Luz & céu (Fase 7 — atmosfera; criar UMA vez, fora do animate):
- addAmbientLight(world, "#cor", forca): luz suave geral (sem sombra). addSunLight(world, "#cor", forca): sol (direcional, faz sombra).
- addPointLight(world, "#cor", forca, x, y, z): uma lâmpada/tocha que brilha de um ponto. (A cena já nasce com luz; estes ADICIONAM clima.)
- setFog(world, "#cor", perto, longe): neblina (o que está longe some). setSky(world, "#topo", "#horizonte"): fundo em degradê (céu).
- setShadows(world, "on"|"off"): liga/desliga as sombras da cena (desligar = mais leve).

Enxames & som (Fase 8 — grupos genéricos de cópias + áudio):
- createSwarm(world) -> enxame: administra muitas cópias e não é o mesmo recurso que createGroup(). spawnInSwarm exige um molde da mesma cena. As cópias visíveis entram nas consultas de ponteiro e mira. Pode rodar no quadro quando houver remove/prune para limitar os itens.
- forEachInSwarm(enxame, (item) => {...}): repete os blocos p/ cada cópia (a da vez é "item"); itera ao contrário, então pode remover dentro. countSwarm(enxame): quantas cópias tem.
- removeFromSwarm(enxame, item): tira uma cópia. pruneSwarm(enxame, "x"|"y"|"z", min, max): limpa as cópias que saíram dos limites (higiene de GPU).
- playNote(freqHz, ms): um bip (mais Hz = mais agudo). playEffect("coin"|"jump"|"explosion"|"hit"): efeito pronto. Use diretamente em clique/tecla ou numa condição do quadro, nunca diretamente em Ao iniciar. O runtime aceita no máximo 32 vozes ao mesmo tempo.
- ÁUDIO DE ARQUIVO (o som que a criança enviou em "Imagens e sons"): loadSound("apelido", "nome-do-arquivo") prepara e SÓ vale em Ao iniciar; depois playSound("apelido") toca uma vez, stopSound("apelido") para e rebobina, playMusic("apelido") toca em loop (uma música por vez — começar outra troca a anterior; repetir a mesma não recomeça) e stopMusic() desliga. setSoundVolume(0..10) vale para todos os sons. Nunca invente nome de arquivo: use um que exista no projeto, senão o runtime avisa e não toca.
- Áreas: as definições que só guardam uma receita ficam em **🧩 Meus moldes**; crie cena e recursos em **⚙️ Ao iniciar**; use os chapéus de tecla/clique
  do núcleo em **⚡ Quando acontecer**; coloque “A cada quadro 3D”, “A cada N
  quadros” e “A cada N segundos” em **🔁 Enquanto estiver rodando**. Para colisão, use
  "se collides(a, b)" dentro do "A cada quadro 3D" — a extensão 3D não tem chapéus
  de evento próprios.
- Comandos contínuos podem ficar no corpo do quadro ou em funções/métodos chamados
  pelo loop; nunca os coloque diretamente em Ao iniciar, eventos ou construtores.

Kit "Empilhar" (torre de blocos / Stack — mundo y-up):
- createStackScene(canvasId) -> world: cena + câmera isométrica que sobe com a torre + luz.
- createStackTower(world): base + 1º bloco que desliza (cores em arco-íris).
- stackStep(world): a cada quadro — desliza o bloco do topo, sobe a câmera e faz as sobras caírem.
- stackDrop(world): encaixa o bloco do topo (a sobra cai); errar o encaixe acaba o jogo. Ligue ao clique/tecla.
- stackScore(world): pontuação (andares). stackGameOver(world): a torre caiu? stackReset(world): recomeça.

Quando ajudar o aluno com 3D:
- Prefira createFullscreenScene, que cria o canvas sozinho; use createScene somente quando o layout pedir um canvas HTML específico.
- Crie os objetos UMA vez (fora do animate); dentro do loop só mova/anime/teste colisão.
- Eixos: x = direita, y = cima, z = em direção à câmera. Rotação em radianos.
- Todos os blocos Jogo 3D são iniciante-3d; a aula filtra quais aparecem com allowBlocks.
- Para um jogo de desviar: jogador = cubo; chão = caixa larga em y baixo; no animate use
  controlWithKeys + se keyDown("Space") -> jump + applyGravity; monte os inimigos com "A cada N
  quadros" -> spawnEnemy, depois updateGroup + pruneOffscreen + se hitAny -> stop (nada de avalanche).
- Para um jogo de atravessar a rua (Travessia): createCrossingScene + createCrosser +
  generateRows(20); no animate: crosserStep + moveTraffic + se crosserHit -> mostrar o "Game Over".
  O HUD (pontuação, fim de jogo, setas) é feito com blocos de HTML/CSS e lido por crosserRow/crosserHit.
- Para um jogo de empilhar (Empilhar): createStackScene + createStackTower; no animate: stackStep +
  mostrar stackScore + se stackGameOver -> "Game Over". Ligue um botão/tecla a stackDrop e Recomeçar a stackReset.
- Para uma campanha lateral pronta: createPlatformScene + createHero + loadStage em Ao iniciar; no animate use
  classicPlatformer + stageStep + sideCamera. Leia placar com stageValue, estados com stageIs/heroIs e use
  onStageEvent para efeitos e HUD. Nunca combine o herói ou a câmera com outra cena.
- Prefira pequenas iterações — não despeje a cena pronta.
`
