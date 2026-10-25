export const gameThreeDPromptContext = `Extensão: Jogo 3D (id: game-3d)

API global injetada como window.SZGame3D (wrapper sobre Three.js).
UNIDADES: velocidades são POR SEGUNDO e ângulos são em GRAUS (o runtime converte por dentro).
A paleta é organizada em famílias: Cena, céu e câmera · Objetos · Movimento · Controles ·
Encostar · Grupos · Placar, vida e telas · Tempo e sorteio · Som · Kits prontos.

Cena, céu e câmera:
- createFullscreenScene(background) -> world: caminho recomendado; cria canvas responsivo em tela cheia.
- createScene(canvasId) -> world { scene, camera, renderer }: cria cena+câmera+luz num canvas do HTML.
- animate(world, fn): "A cada quadro da cena". Várias atualizações da mesma cena rodam em ordem e produzem um único desenho por quadro. Se uma falhar, somente ela é pausada.
- setBackground(world, color) / setCameraPosition(world, x, y, z) (olha o centro 0,0,0).
- cameraMode(world, modo, obj | null): UM bloco para a câmera inteira. Modos: "tras" (segue de trás),
  "longe" (segue de longe, guardando o enquadramento da hora em que ligou), "cima" (vê de cima),
  "isometrica", "primeira-pessoa" (olhos do objeto + mouse, clique trava o ponteiro) e "em-volta"
  (gira em volta arrastando; a roda dá zoom). É um MODO: chame UMA vez em Ao iniciar ou num evento; o
  runtime recompõe a câmera a cada quadro. "cima", "isometrica" e "em-volta" aceitam null (olham o centro).
  Só um modo vale por cena; o último escolhido substitui o anterior.
- cameraDistance(world, distancia, altura): quão longe/alto fica a câmera que segue (de trás, de longe) e a
  distância da que gira em volta.
- cameraShake(forca, segundos): tremor rápido (0.3 e 0.3 são o normal). blink(obj, segundos): pisca o objeto.
- cameraLookAt(world, obj): aponta a câmera. setFOV(world, graus): a lente (menos graus = mais zoom; nas
  vistas de cima/isométrica vira zoom).
- skyPhoto(world, "nomeDoCeu"): céu 360° (.hdr do projeto, do Molda ou enviado), ilumina e reflete. setSky(world, "#topo", "#horizonte"): degradê.
- addAmbientLight(world, "#cor", forca) / addSunLight(world, "#cor", forca) / addPointLight(world, "#cor", forca, x, y, z[, "com-sombra"]) — sem sombra por padrão; só UMA luz pontual com sombra por cena.
- setFog(world, "#cor", perto, longe) / setShadows(world, "on"|"off"). Luz e céu: UMA vez, fora do animate.

Objetos (criar UMA vez, fora do animate):
- createBox(world, { size, color }) -> o cubo; createSphere(world, { radius, color }).
- createBlock(world, { width, height, depth, color }) -> a caixa de medidas livres (boa para chão e paredes).
- createModelFile(world, "nomeDoModelo", tamanho) -> objeto com um modelo 3D de verdade (.glb do projeto, do Molda ou enviado em "Modelos 3D"); nasce como cubo e vira o modelo quando carrega. tamanho = lado maior, em blocos.
- playAnimation(obj, "NomeDoClipe", "repetir"|"uma-vez") toca uma animação feita no Molda (o nome igual ao de lá; nome errado avisa listando os clipes). Pedido a cada quadro só continua, sem rebobinar; trocar o nome troca a animação suavemente. stopAnimation(obj) para. animationDone(obj) = verdadeiro quando uma "uma-vez" chegou ao fim. Cada cópia de grupo tem a própria animação; a pintura animada do Molda anda sozinha.
- createCylinder(world, { radius, height, color }) / createCone(...) / createTorus(world, { radius, tube, color }) / createPlane(world, { width, depth, color }).
- createModel(world) -> grupo vazio; addToModel(model, peca): junta peças (mover o modelo move tudo).
- setColor(obj, "#cor") / setOpacity(obj, 0..1) / setMaterial(obj, "normal"|"metal"|"glass"|"glow"|"wireframe") / setTexture(obj, "nomeDoAsset", repeticoes?) (repete a imagem N vezes em cada lado; sem o 3º = 1).
- paintPattern(obj, estampa, "#corA", "#corB"): desenha a textura NA HORA ("tijolo", "pedra", "terra", "grama", "interrogacao", "cano", "nuvem", "agua", "lava", "moeda", "xadrez", "listras").
- noShadow(obj): para de projetar sombra. setVisible(obj, "show"|"hide"): esconder também tira das consultas de mira.
- setPosition(obj, x, y, z) / setRotation(obj, x, y, z) em GRAUS (90 = um quarto de volta) / setScale(obj, fator).
- getPos(obj, "x"|"y"|"z") / getRot(obj, eixo) em graus / getScale(obj).
- setObjectValue(obj, "nome", valor) / objectValue(obj, "nome"): um número guardado no próprio objeto (direção, tempo de espera, vidas); vale 0 se nunca guardou.
- remove(world, obj): tira da cena e dos registros de física e seleção.

Movimento (velocidades POR SEGUNDO):
- controlWithKeys(obj, porSegundo): anda no plano X/Z com WASD ou setas (3 é o normal). Dentro do animate.
- jump(obj, forca): impulso para cima, só se estiver no chão (5 é o normal).
- applyGravity(obj, ground): puxa para baixo e pousa no chão, andando pela velocidade. Dentro do animate.
- spin(obj, "x"|"y"|"z", grausPorSegundo): giro contínuo (120 = um terço de volta por segundo). Dentro do animate.
- slideBetween(obj, eixo, min, max, porSegundo): vaivém. moveInCircle(obj, raio, grausPorSegundo): órbita no centro.
- fall(obj): queda livre girando até sumir. Dentro do animate.
- setVelocity(obj, x, y, z): velocidade por segundo em cada eixo. getVel(obj, eixo) / getSpeed(obj): lidas por segundo. isMoving(obj).
- moveBy(obj, dx, dy, dz): anda DE UMA VEZ (um passo). rotateBy(obj, "y", graus): gira DE UMA VEZ. Para girar sem parar, use spin.
- moveTowards(obj, x, y, z, rapidez): aproxima aos poucos, freando ao chegar (5 é suave; maior chega mais rápido; igual em qualquer taxa de quadros).
- moveForward(obj, porSegundo): anda para a frente, na direção que olha (com a câmera em 1ª pessoa no MESMO obj, para onde o jogador olha, no plano do chão). Dentro do animate.
- lookAtObject(a, b) / lookAtPoint(obj, x, y, z) / faceVelocity(obj). angleTo(a, b): ângulo em graus no chão. distanceTo(a, b).
- gridPosition(obj, linha, coluna) / gridStep(obj) (anda casa a casa com as setas, no animate) / gridMove(obj, "forward"|"backward"|"left"|"right").
- fpsControls(obj, world, porSegundo): preset de 1ª pessoa (combine com cameraMode(world, "primeira-pessoa", obj)).

Controles:
- onKey("KeyW"|"Space"|"Enter"|..., () => {...}): uma vez por aperto (segurar não repete). onClickObject(obj, () => {...}): clique ou toque no objeto. Os dois em Quando acontecer.
Perguntas para usar em "se":
- keyDown(code): enquanto a tecla está apertada ("KeyW","KeyA","KeyS","KeyD","Space","ArrowUp"...). keyPressed(code): só no quadro em que desceu.
- pickAtMouse(world): o objeto sob o ponteiro (ou null) — guarde numa variável para usá-lo pelo nome.
- pointerOver(world, obj): o mouse está sobre aquele objeto? aimAhead(world, obj, alcance): o objeto à frente (tiro/mira; com a câmera em 1ª pessoa no mesmo obj, mira o que o jogador VÊ).

Encostar:
- collides(a, b): os dois estão se encostando (medida declarada de cada um).
- hitAny(obj, grupo): obj está encostando em algum do grupo.
- onTouchGroup(obj, grupo, (item) => {...}): roda UMA vez quando obj COMEÇA a encostar em alguém do grupo (mesma caixa real do hitAny); item é quem foi encostado. Em Quando acontecer. Mede a caixa REAL de cada objeto no mundo (gira junto, vale para modelos e peças montadas).
- isNear(a, b, dist): estão a menos de "dist"?
- Física de plataforma: body(obj, gravidade) com gravidade POSITIVA puxando para baixo (36 é o normal; 0 flutua). setSolid(obj): parede/chão. stepBody(obj, world): gravidade + empurrar para fora dos sólidos, no animate. resolveCollision(a, b).
- forEachHit(obj, lado, (batida) => {...}) percorre as batidas do último stepBody (lados "qualquer", "pes", "cabeca", "esquerda", "direita", "frente", "tras"); hitIs(batida, obj).
- carryRiders(obj): quem está em cima anda junto. passUnder(obj): atravessável por baixo. onGround(world, obj) / groundHeight(world, obj).
- platformerControls(obj, world, porSegundo, pulo): anda em X e Z e pula (5 e 11 são o normal).
- classicPlatformer(obj, world, porSegundo, pulo): só no eixo X, com inércia, Shift corre no dobro e o pulo é mais alto segurando o botão (5 e 12 são o normal).

Grupos (as cópias de um molde também moram num grupo):
- createGroup() -> grupo vazio para guardar vários objetos.
- spawnCopy(grupo, molde, x, y, z): copia o molde (esconda-o com setVisible) e põe a cópia no grupo. Cópia de modelo do Molda ganha ossos próprios. Teto de 300 cópias por cena.
- updateGroupNoGravity(grupo): move cada um pela velocidade. updateGroup(grupo, chao): com gravidade. No animate.
- pruneOffscreen(world, grupo, (item) => {...}): tira quem saiu da tela e roda o corpo para cada um. pruneArea(grupo, eixo, min, max): tira quem passou dos limites.
- forEachInGroup(grupo, (item) => {...}): repete para cada objeto (itera ao contrário: pode remover dentro). countGroup(grupo).
- removeFromGroup(grupo, obj): tira do grupo e some da cena. clearGroup(grupo): esvazia.
- moveAcross(grupo, porSegundo, min, max): esteira no eixo X, dando a volta.

Placar, vida e telas (regras de jogo; o HUD é DOM por cima do canvas, sem precisar de HTML):
- hudText("top-left"|"top-center"|"top-right"|"bottom-left"|"bottom-center"|"bottom-right", texto): um texto por canto; texto vazio apaga.
- addScore(n) / score(): pontos (aparecem sozinhos no canto de cima à direita).
- setLife(obj, n) / hurt(obj, n) / heal(obj, n) / lifeOf(obj): vida. O primeiro objeto que ganha vida é o herói (corações no canto de cima à esquerda); depois de machucado pisca e fica 1 s invencível.
- onLifeOver(obj, () => {...}): quando a vida chega a zero (uma vez).
- setScreenText("inicio"|"fim"|"vitoria", titulo, texto, botao): SÓ em Ao iniciar. Com a tela de início os laços esperam o botão.
- endGame("perdeu"|"ganhou"): pausa os laços e mostra a tela de fim ou vitória com "Jogar de novo". restart(): recomeça a partida do zero (roda Ao iniciar de novo). Os dois só durante um laço, evento ou função.

Tempo e sorteio:
- everySecondsLoop(S, () => {...}): o bloco "A cada N segundos", raiz própria em Enquanto estiver rodando (ao lado do "A cada quadro", nunca dentro). Bom para soltar inimigos sem avalanche.
- afterSeconds(S, () => {...}): roda UMA vez depois de S segundos de jogo; raiz em Enquanto estiver rodando ou dentro de um evento/função (nunca dentro de um laço).
- startTimer(S) / timeLeft() / stopTimer() / onTimerEnd(() => {...}): contagem regressiva (aparece em cima, no meio).
- randomBetween(a, b): inteiro de a até b. randomChance(p): verdadeiro em p% das vezes.
- dt(world): segundos deste quadro. Multiplique uma velocidade por segundo por ele numa conta manual; os blocos de movimento já compensam.

Som:
- playEffect("coin"|"jump"|"explosion"|"hit"): o som pronto. playNote(freqHz, ms): um bip. Toque em clique/tecla ou numa condição do quadro, nunca solto em Ao iniciar (máximo de 32 vozes).
- loadSound("apelido", "nome-do-arquivo") SÓ em Ao iniciar; depois playSound("apelido") / stopSound("apelido") / playMusic("apelido") (uma música por vez) / stopMusic() / setSoundVolume(0..10). Nunca invente nome de arquivo.

Kits prontos:
- Desvie: spawnEnemy(world, grupo, porSegundo) solta 1 inimigo vindo de longe (6 é o normal); ponha dentro do "A cada N segundos".
- Travessia: createCrossingScene(canvasId) + createCrosser(world, { color }) + generateRows(world, n) / addRow(world, linha, "grass"|"forest"|"car"|"truck", "right"|"left", velocidade); no animate crosserStep(player, world) + moveTraffic(world); crosserHit(player, world), crosserRow(player), crosserMove(player, dir) e crosserReset(player, world).
- Corrida: createRaceScene(canvasId) + createRaceTrack(world) + createRaceCar(world, { color }); no animate raceStep(car, world) + runRivals(world); raceControl(car, "accelerate"|"decelerate"|"normal"), raceHit(car, world), raceLaps(car), raceReset(car, world).
- Empilhar: createStackScene(canvasId) + createStackTower(world); stackStep(world) no animate; stackDrop(world) num clique/tecla; stackScore(world), stackGameOver(world), stackReset(world).
- Plataforma (o exemplo Reino Cogumelo): createPlatformScene(canvasId) + createHero(world, color) + loadStage(world, mapa) em Ao iniciar; setStageTheme(world, "dia"|"noite"|"subterraneo"|"agua"|"castelo"); no animate classicPlatformer + stageStep(world, hero) + sideCamera(world, hero); keyPressed("KeyF") + shootFire(world, hero) com a flor; onStageEvent(world, nome, fn) para pegar-moeda, pegar-cogumelo, pegar-flor, pegar-estrela, ganhar-vida, quebrar-tijolo, pisar-inimigo, chutar-concha, levar-dano, tocar-a-bandeira, derrotar-o-chefe e acabar-o-tempo; stageValue(world, "pontos"|"moedas"|"vidas"|"tempo"|"mundo"|"fase"), setStageNumber(world, mundo, fase), heroIs(hero, estado), stageIs(world, estado), stageReset(world) e clearStage(world). O mapa é texto com assuntos separados por ponto e vírgula (chao=0-20, tijolo=6:4, surpresa=8:4:cogumelo, inimigo=12:goomba, checkpoint=15, tempo=300, tema=noite).

Áreas:
- O que só define uma receita (funções) pode ficar em **🧩 Meus moldes**. Crie cena e recursos em **⚙️ Ao iniciar**; use os chapéus de tecla/clique do núcleo em **⚡ Quando acontecer**;
  "A cada quadro" e "A cada N segundos" ficam em **🔁 Enquanto estiver rodando**. Para colisão, use
  "se hitAny/collides" dentro do "A cada quadro".
- Comandos contínuos (controlWithKeys, applyGravity, spin, moveForward, stepBody…) ficam no corpo do quadro
  ou em funções chamadas pelo laço; nunca diretamente em Ao iniciar, eventos ou construtores.
- Recursos passados juntos precisam pertencer à mesma cena; o runtime ignora combinações incompatíveis e avisa no console.

Quando ajudar o aluno com 3D:
- Prefira createFullscreenScene, que cria o canvas sozinho.
- Crie os objetos UMA vez (fora do animate); dentro do laço só mova, anime e teste encostar.
- Eixos: x = direita, y = cima, z = em direção à câmera. Ângulos em graus; velocidades por segundo.
- O núcleo do degrau iniciante-3d é pequeno (criar, mover, encostar, grupo, tempo, som); o resto aparece do intermediário-3d.
- Para um jogo de desviar: jogador = cubo; chão = caixa larga; cameraMode(cena, "longe", jogador) em Ao iniciar;
  no animate controlWithKeys + se keyDown("Space") -> jump + applyGravity + updateGroup + pruneOffscreen;
  setLife(jogador, 3) em Ao iniciar; onTouchGroup(jogador, inimigos, (i) => hurt(jogador, 1)); onLifeOver(jogador, () => endGame("perdeu"));
  e "A cada N segundos" -> spawnEnemy. Pegar coisas: onTouchGroup(jogador, estrelas, (e) => { addScore(1); removeFromGroup(estrelas, e) }).
- Para muitos objetos iguais: um molde escondido + spawnCopy num grupo + forEachInGroup + removeFromGroup.
- Prefira pequenas iterações — não despeje a cena pronta.
`
